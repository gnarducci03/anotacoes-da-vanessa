import { PDFDocument } from 'pdf-lib';
import {
  NotebookRecord,
  PageRecord,
} from '@/types/note';
import { createId, db } from './db';
import { getPageDimensions, renderPaperTemplate } from './paper-templates';
import { drawShapeOnCanvas, drawStrokeOnCanvas } from './ink-engine';

/**
 * Carrega dinamicamente o pdfjs-dist apenas no cliente (navegador)
 */
async function getPdfJs() {
  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
}

/**
 * Renderiza uma página específica (1-based) de um ArrayBuffer de PDF para DataURL (PNG)
 * e extrai o texto da página para busca.
 */
export async function renderPdfPageFromBuffer(
  pdfData: ArrayBuffer,
  pageNumber1Based: number,
  scale = 1.6
): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  textContent: string;
}> {
  const pdfjsLib = await getPdfJs();
  // Clona o buffer para evitar detached ArrayBuffer
  const copy = pdfData.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: copy });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNumber1Based);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Falha ao criar contexto 2D para PDF');
  }

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  const textContentObj = await page.getTextContent();
  const textContent = textContentObj.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ');

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: viewport.width,
    height: viewport.height,
    textContent,
  };
}

/**
 * Importa um arquivo PDF criando um novo Caderno com todas as páginas indexadas
 */
export async function importPdfAsNotebook(
  file: File,
  folderId: string | null
): Promise<NotebookRecord> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await getPdfJs();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer.slice(0) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  const now = Date.now();
  const assetId = createId('pdf');
  const notebookId = createId('nb');
  const cleanTitle = file.name.replace(/\.pdf$/i, '') || 'Documento PDF';

  const newNotebook: NotebookRecord = {
    id: notebookId,
    title: cleanTitle,
    folderId,
    coverStyle: 'minimal-slate',
    coverColor: '#334155',
    defaultTemplate: 'blank',
    defaultPaperColor: 'white',
    pageSize: 'goodnotes',
    orientation: 'portrait',
    isFavorite: false,
    isTrashed: false,
    pdfAssetId: assetId,
    lastOpenedPageIndex: 0,
    createdAt: now,
    updatedAt: now,
  };

  const pagesToCreate: PageRecord[] = [];
  for (let i = 1; i <= numPages; i++) {
    let extractedText = '';
    try {
      const pg = await pdfDoc.getPage(i);
      const tc = await pg.getTextContent();
      extractedText = tc.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
    } catch {
      extractedText = '';
    }

    pagesToCreate.push({
      id: createId('pg'),
      notebookId,
      pageNumber: i - 1,
      template: 'blank',
      paperColor: 'white',
      orientation: 'portrait',
      rotation: 0,
      isFavorite: false,
      outlineTitle: `Página PDF ${i}`,
      pdfPageIndex: i,
      pdfTextContent: extractedText,
      strokes: [],
      shapes: [],
      textBoxes: [],
      images: [],
      updatedAt: now,
    });
  }

  await db.transaction(
    'rw',
    db.assets,
    db.notebooks,
    db.pages,
    async () => {
      await db.assets.add({
        id: assetId,
        mimeType: 'application/pdf',
        name: file.name,
        data: arrayBuffer,
        pageCount: numPages,
        createdAt: now,
      });
      await db.notebooks.add(newNotebook);
      await db.pages.bulkAdd(pagesToCreate);
    }
  );

  return newNotebook;
}

/**
 * Renderiza uma PageRecord inteira (Papel/PDF + Marca-Texto + Formas + Caneta + Imagens + Textos)
 * em um Canvas de alta definição e retorna um PNG DataURL
 */
export async function renderFullPageToDataUrl(
  notebook: NotebookRecord,
  page: PageRecord,
  pdfBuffer?: ArrayBuffer | null
): Promise<{ dataUrl: string; width: number; height: number }> {
  const { width, height } = getPageDimensions(
    notebook.pageSize,
    page.orientation
  );
  const scale = 2; // Alta resolução para exportação
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Contexto 2D indisponível');

  ctx.save();
  ctx.scale(scale, scale);

  // 1. Papel de fundo
  renderPaperTemplate(ctx, width, height, page.template, page.paperColor);

  // 2. Se tiver página de PDF associada, desenha o PDF
  if (pdfBuffer && page.pdfPageIndex) {
    try {
      const renderedPdf = await renderPdfPageFromBuffer(
        pdfBuffer,
        page.pdfPageIndex,
        2
      );
      await new Promise<void>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = renderedPdf.dataUrl;
      });
    } catch {
      // Fallback silencioso para o template de papel
    }
  }

  // 3. Imagens e Adesivos da página
  for (const im of page.images) {
    await new Promise<void>((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        ctx.save();
        const cx = im.x + im.width / 2;
        const cy = im.y + im.height / 2;
        if (im.rotation) {
          ctx.translate(cx, cy);
          ctx.rotate((im.rotation * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }
        ctx.drawImage(img, im.x, im.y, im.width, im.height);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = im.dataUrl;
    });
  }

  // 4. Marca-texto (abaixo da escrita)
  ctx.save();
  if (page.paperColor !== 'dark') {
    ctx.globalCompositeOperation = 'multiply';
  }
  for (const s of page.strokes) {
    if (s.tool === 'highlighter') {
      drawStrokeOnCanvas(ctx, s);
    }
  }
  ctx.restore();

  // 5. Formas Geométricas
  for (const sh of page.shapes) {
    drawShapeOnCanvas(ctx, sh);
  }

  // 6. Traços de Caneta
  for (const s of page.strokes) {
    if (s.tool === 'pen') {
      drawStrokeOnCanvas(ctx, s);
    }
  }

  // 7. Caixas de Texto
  for (const tb of page.textBoxes) {
    ctx.save();
    ctx.fillStyle = tb.color || '#111827';
    const weight = tb.bold ? 'bold' : 'normal';
    const style = tb.italic ? 'italic' : 'normal';
    ctx.font = `${style} ${weight} ${tb.fontSize}px -apple-system, BlinkMacSystemFont, "Inter", sans-serif`;
    const lines = tb.text.split('\n');
    lines.forEach((line, idx) => {
      ctx.fillText(line, tb.x + 8, tb.y + tb.fontSize + idx * (tb.fontSize * 1.3));
    });
    ctx.restore();
  }

  ctx.restore();

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
  };
}

/**
 * Exporta todas as páginas de um Caderno (com PDF e anotações) em um arquivo PDF via pdf-lib
 */
export async function exportNotebookToPdf(
  notebook: NotebookRecord,
  pages: PageRecord[]
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  let pdfBuffer: ArrayBuffer | null = null;

  if (notebook.pdfAssetId) {
    const asset = await db.assets.get(notebook.pdfAssetId);
    if (asset) {
      pdfBuffer = asset.data;
    }
  }

  const sortedPages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);

  for (const pg of sortedPages) {
    const { dataUrl, width, height } = await renderFullPageToDataUrl(
      notebook,
      pg,
      pdfBuffer
    );
    const pngImage = await pdfDoc.embedPng(dataUrl);
    const pdfPage = pdfDoc.addPage([width, height]);
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width,
      height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as unknown as BlobPart], {
    type: 'application/pdf',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${notebook.title || 'caderno'}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
