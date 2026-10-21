'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveToolId,
  EraserMode,
  ImageElement,
  PageRecord,
  PageSizeId,
  PenTipType,
  ShapeElement,
  ShapeKind,
  StrokeElement,
  StrokePoint,
  TextBoxElement,
} from '@/types/note';
import { createId } from '@/lib/db';
import {
  getPageDimensions,
  renderPaperTemplate,
} from '@/lib/paper-templates';
import {
  computeBoundingBox,
  drawShapeOnCanvas,
  drawStrokeOnCanvas,
  eraseStrokePrecision,
  hitTestStroke,
  isPointInPolygon,
  recognizeQuickShape,
} from '@/lib/ink-engine';
import { PEN_COLOR_PALETTE } from './WritingToolbar';
import {
  Trash2,
  Copy,
  Palette,
  Camera,
  RotateCw,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  X,
} from 'lucide-react';

interface PageCanvasProps {
  page: PageRecord;
  pageSize: PageSizeId;
  activeTool: ActiveToolId;
  penType: PenTipType;
  penColor: string;
  penSize: number;
  holdToSnapShape: boolean;
  highlighterColor: string;
  highlighterSize: number;
  straightLineHighlighter: boolean;
  eraserMode: EraserMode;
  eraserRadius: number;
  eraseHighlighterOnly: boolean;
  autoDeselectEraser: boolean;
  onAutoSwitchToPen: () => void;
  activeShapeKind: ShapeKind;
  fillShapes: boolean;
  lassoFilters: {
    strokes: boolean;
    shapes: boolean;
    textBoxes: boolean;
    images: boolean;
  };
  stylusOnlyMode: boolean;
  zoom: number;
  pan: { x: number; y: number };
  onChangeZoomPan: (nextZoom: number, nextPan: { x: number; y: number }) => void;
  fitTrigger?: number;
  fitMode?: 'width' | 'page';
  zoomWindowOpen: boolean;
  onCloseZoomWindow: () => void;
  pdfPageDataUrl?: string | null;
  searchHighlightTerm?: string;
  autoSelectElement?: {
    kind: 'textBox' | 'image';
    id: string;
    tick: number;
  } | null;
  onCommitPageUpdate: (
    updater: (prev: PageRecord) => PageRecord,
    recordHistory?: boolean
  ) => void;
  onUndo: () => void;
  onRedo: () => void;
}

interface LaserTrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export function PageCanvas({
  page,
  pageSize,
  activeTool,
  penType,
  penColor,
  penSize,
  holdToSnapShape,
  highlighterColor,
  highlighterSize,
  straightLineHighlighter,
  eraserMode,
  eraserRadius,
  eraseHighlighterOnly,
  autoDeselectEraser,
  onAutoSwitchToPen,
  activeShapeKind,
  fillShapes,
  lassoFilters,
  stylusOnlyMode,
  zoom,
  pan,
  onChangeZoomPan,
  fitTrigger = 0,
  fitMode = 'width',
  zoomWindowOpen,
  onCloseZoomWindow,
  pdfPageDataUrl,
  searchHighlightTerm,
  autoSelectElement,
  onCommitPageUpdate,
  onUndo,
  onRedo,
}: PageCanvasProps) {
  const baseDimensions = getPageDimensions(pageSize, page.orientation);
  const pageW = page.customWidth || baseDimensions.width;
  const pageH = page.customHeight || baseDimensions.height;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomWindowCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Estado de traço em tempo real
  const isDrawingRef = useRef(false);
  const activePointsRef = useRef<StrokePoint[]>([]);
  const snappedShapeRef = useRef<ShapeElement | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Estado da borracha
  const [eraserCursor, setEraserCursor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const didEraseDuringStrokeRef = useRef(false);

  // Estado de forma geométrica sendo arrastada
  const draftShapeRef = useRef<ShapeElement | null>(null);

  // Estado do Laço (Lasso)
  const lassoPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [lassoSelection, setLassoSelection] = useState<{
    strokeIds: string[];
    shapeIds: string[];
    textBoxIds: string[];
    imageIds: string[];
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
  } | null>(null);
  const [lassoColorMenuOpen, setLassoColorMenuOpen] = useState(false);
  const lassoDragStartRef = useRef<{ x: number; y: number } | null>(null);

  // Estado de elemento individual selecionado (TextBox, Imagem ou Forma)
  const [selectedElement, setSelectedElement] = useState<{
    kind: 'textBox' | 'image' | 'shape';
    id: string;
  } | null>(null);

  // Seleciona e dá foco automaticamente quando uma nova Caixa de Texto ou Post-it/Sticker é inserido
  useEffect(() => {
    if (!autoSelectElement) return;
    setSelectedElement({
      kind: autoSelectElement.kind,
      id: autoSelectElement.id,
    });
    const timer = setTimeout(() => {
      const selector =
        autoSelectElement.kind === 'textBox'
          ? `textarea[data-textbox-id="${autoSelectElement.id}"]`
          : `textarea[data-sticker-id="${autoSelectElement.id}"]`;
      const el = document.querySelector<HTMLTextAreaElement>(selector);
      if (el) {
        el.focus();
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [autoSelectElement]);

  // Laser Pointer
  const laserTrailRef = useRef<LaserTrailPoint[]>([]);
  const laserAnimFrameRef = useRef<number | null>(null);

  // Gestos multi-toque (Pinch to zoom / Pinch to resize elemento selecionado + 2-finger Pan)
  const activePointersRef = useRef<Map<number, { x: number; y: number; type: string }>>(
    new Map()
  );
  const pinchInitialDistRef = useRef<number | null>(null);
  const pinchInitialCenterRef = useRef<{ x: number; y: number } | null>(null);
  const pinchInitialZoomRef = useRef<number>(zoom);
  const pinchInitialPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const elementPinchRef = useRef<{
    kind: 'image' | 'textBox';
    id: string;
    initialDist: number;
    initialSpanX: number;
    initialSpanY: number;
    origW: number;
    origH: number;
    origX: number;
    origY: number;
  } | null>(null);
  const panStartRef = useRef<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const multiTouchCountRef = useRef<number>(0);
  const multiTouchStartTimeRef = useRef<number>(0);

  // Calcula e aplica automaticamente o Zoom Proporcional à tela do Tablet (Fit-to-Width ou Fit-to-Page)
  const applyResponsiveFit = useCallback(
    (mode: 'width' | 'page' = fitMode) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const isRotated90 = page.rotation === 90 || page.rotation === 270;
      const effectiveW = isRotated90 ? pageH : pageW;
      const effectiveH = isRotated90 ? pageW : pageH;

      const padX = Math.min(36, rect.width * 0.04);
      const padY = 48;

      const scaleX = (rect.width - padX * 2) / effectiveW;
      const scaleY = (rect.height - padY * 2) / effectiveH;

      const targetZoom =
        mode === 'page'
          ? Math.min(scaleX, scaleY)
          : rect.width < 1024
          ? scaleX
          : Math.min(scaleX, scaleY * 1.15);

      const clampedZoom = Math.min(2.5, Math.max(0.25, +targetZoom.toFixed(3)));
      const scaledHeight = effectiveH * clampedZoom;

      // Se a página escalada for mais alta que a tela do tablet, alinha pelo topo para leitura imediata
      const initialPanY =
        scaledHeight > rect.height - padY
          ? Math.round((scaledHeight - rect.height) / 2 + 24)
          : 0;

      onChangeZoomPan(clampedZoom, { x: 0, y: initialPanY });
    },
    [fitMode, pageW, pageH, page.rotation, onChangeZoomPan]
  );

  // Ajusta automaticamente ao abrir página, trocar tamanho de página/PDF ou girar o tablet
  useEffect(() => {
    const id = requestAnimationFrame(() => applyResponsiveFit(fitMode));
    return () => cancelAnimationFrame(id);
  }, [page.id, pageW, pageH, page.rotation, fitTrigger, fitMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return;
    let prevW = vp.clientWidth;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newW = Math.round(entry.contentRect.width);
        if (Math.abs(newW - prevW) > 40) {
          prevW = newW;
          applyResponsiveFit(fitMode);
        }
      }
    });
    ro.observe(vp);
    return () => ro.disconnect();
  }, [applyResponsiveFit, fitMode]);

  // Janela de Zoom (Zoom Window Target Box na página)
  const [zoomBox, setZoomBox] = useState<{ x: number; y: number }>({
    x: 84,
    y: 120,
  });
  const zoomBoxW = 240;
  const zoomBoxH = 85;

  // Cache de retângulo de tela e rAF para escrita de latência zero (120Hz sem layout thrashing)
  const cachedCanvasRectRef = useRef<DOMRect | null>(null);
  const wetRenderRafRef = useRef<number | null>(null);
  const drawingPointerIdRef = useRef<number | null>(null);
  const drawingPointerTypeRef = useRef<string | null>(null);
  const lastPenTimestampRef = useRef<number>(0);

  // Limpa ponteiros de toque residuais caso o dedo solte fora do canvas
  useEffect(() => {
    const cleanPointer = (ev: PointerEvent) => {
      if (ev.pointerType === 'touch') {
        activePointersRef.current.delete(ev.pointerId);
        if (activePointersRef.current.size < 2) {
          pinchInitialDistRef.current = null;
          pinchInitialCenterRef.current = null;
          elementPinchRef.current = null;
        }
        if (activePointersRef.current.size === 0) {
          panStartRef.current = null;
          multiTouchCountRef.current = 0;
        }
      }
    };
    window.addEventListener('pointerup', cleanPointer);
    window.addEventListener('pointercancel', cleanPointer);
    return () => {
      window.removeEventListener('pointerup', cleanPointer);
      window.removeEventListener('pointercancel', cleanPointer);
    };
  }, []);

  // Invalida o cache do retângulo sempre que o zoom, pan ou tamanho da página mudar
  useEffect(() => {
    cachedCanvasRectRef.current = null;
  }, [zoom, pan.x, pan.y, pageW, pageH]);

  // Pré-configura a resolução da camada de tinta ativa apenas quando pageW/pageH mudarem
  useEffect(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== pageW * dpr || canvas.height !== pageH * dpr) {
      canvas.width = pageW * dpr;
      canvas.height = pageH * dpr;
    }
  }, [pageW, pageH]);

  // Converte coordenadas de tela (clientX/Y) para coordenadas internas da página (0..pageW, 0..pageH)
  const clientToPageCoords = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      let rect = cachedCanvasRectRef.current;
      if (!rect && activeCanvasRef.current) {
        rect = activeCanvasRef.current.getBoundingClientRect();
        cachedCanvasRectRef.current = rect;
      }
      if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
      const scaleX = pageW / rect.width;
      const scaleY = pageH / rect.height;
      return {
        x: Math.max(0, Math.min(pageW, (clientX - rect.left) * scaleX)),
        y: Math.max(0, Math.min(pageH, (clientY - rect.top) * scaleY)),
      };
    },
    [pageW, pageH]
  );

  // Cache de imagem PDF decodificada para nunca piscar o fundo ao redesenhar
  const cachedPdfImgRef = useRef<{ url: string; img: HTMLImageElement } | null>(
    null
  );

  // 1. Renderiza Camada 1: Papel Vetorial ou Página de PDF (sem nunca limpar antes do decode do PDF)
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(pageW * dpr);
    const targetH = Math.round(pageH * dpr);

    const drawBackground = (pdfImg: HTMLImageElement | null) => {
      const c = bgCanvasRef.current;
      if (!c) return;
      const cCtx = c.getContext('2d');
      if (!cCtx) return;
      if (c.width !== targetW || c.height !== targetH) {
        c.width = targetW;
        c.height = targetH;
      }
      cCtx.save();
      cCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderPaperTemplate(cCtx, pageW, pageH, page.template, page.paperColor);
      if (pdfImg) {
        cCtx.drawImage(pdfImg, 0, 0, pageW, pageH);
      }
      cCtx.restore();
    };

    if (!pdfPageDataUrl) {
      drawBackground(null);
      return;
    }

    if (cachedPdfImgRef.current?.url === pdfPageDataUrl) {
      drawBackground(cachedPdfImgRef.current.img);
      return;
    }

    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      cachedPdfImgRef.current = { url: pdfPageDataUrl, img };
      drawBackground(img);
    };
    img.src = pdfPageDataUrl;

    return () => {
      cancelled = true;
    };
  }, [page.template, page.paperColor, pageW, pageH, pdfPageDataUrl]);

  // 2. Renderiza Camada 2: Traços Finalizados (Marca-Texto embaixo + Formas + Caneta em cima)
  const drawStaticLayerWith = useCallback(
    (strokesList: StrokeElement[], shapesList: ShapeElement[]) => {
      const canvas = staticCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(pageW * dpr);
      const targetH = Math.round(pageH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, pageW, pageH);

      // 2.1. Marca-texto (abaixo da tinta com blend multiply para preservar contraste)
      ctx.save();
      if (page.paperColor !== 'dark') {
        ctx.globalCompositeOperation = 'multiply';
      }
      for (const stroke of strokesList) {
        if (stroke.tool === 'highlighter') {
          drawStrokeOnCanvas(ctx, stroke);
        }
      }
      ctx.restore();

      // 2.2. Formas Geométricas
      for (const shape of shapesList) {
        drawShapeOnCanvas(ctx, shape);
      }

      // 2.3. Tinta de Caneta
      for (const stroke of strokesList) {
        if (stroke.tool === 'pen') {
          drawStrokeOnCanvas(ctx, stroke);
        }
      }

      ctx.restore();
    },
    [page.paperColor, pageW, pageH]
  );

  const renderStaticLayer = useCallback(() => {
    drawStaticLayerWith(page.strokes, page.shapes);
  }, [drawStaticLayerWith, page.strokes, page.shapes]);

  useEffect(() => {
    renderStaticLayer();
  }, [renderStaticLayer]);

  // Sincroniza o preview da Janela de Zoom (Zoom Window) quando aberta
  const renderZoomWindowPreview = useCallback(() => {
    if (!zoomWindowOpen) return;
    const zwCanvas = zoomWindowCanvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const stCanvas = staticCanvasRef.current;
    if (!zwCanvas || !bgCanvas || !stCanvas) return;

    const ctx = zwCanvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.save();
    ctx.clearRect(0, 0, zwCanvas.width, zwCanvas.height);

    // Copia o recorte zoomBox (x, y, zoomBoxW, zoomBoxH) ampliado para o painel inferior
    ctx.drawImage(
      bgCanvas,
      zoomBox.x * dpr,
      zoomBox.y * dpr,
      zoomBoxW * dpr,
      zoomBoxH * dpr,
      0,
      0,
      zwCanvas.width,
      zwCanvas.height
    );
    ctx.drawImage(
      stCanvas,
      zoomBox.x * dpr,
      zoomBox.y * dpr,
      zoomBoxW * dpr,
      zoomBoxH * dpr,
      0,
      0,
      zwCanvas.width,
      zwCanvas.height
    );
    ctx.restore();
  }, [zoomWindowOpen, zoomBox, zoomBoxW, zoomBoxH]);

  useEffect(() => {
    renderZoomWindowPreview();
  }, [renderZoomWindowPreview, page.strokes, page.shapes]);

  // 3. Renderiza Camada 4 (Wet Ink): Traço ativo, polígono do Laço, rascunho de Forma ou Laser Pointer
  const renderActiveWetLayer = useCallback(() => {
    wetRenderRafRef.current = null;
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(pageW * dpr);
    const targetH = Math.round(pageH * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, pageW, pageH);

    // Se o traço virou uma Forma pelo Hold-to-Snap:
    if (snappedShapeRef.current) {
      drawShapeOnCanvas(ctx, snappedShapeRef.current);
    } else if (activePointsRef.current.length > 0) {
      const isHl = activeTool === 'highlighter';
      drawStrokeOnCanvas(ctx, {
        id: 'active',
        tool: isHl ? 'highlighter' : 'pen',
        penType,
        color: isHl ? highlighterColor : penColor,
        size: isHl ? highlighterSize : penSize,
        opacity: isHl ? 0.42 : 1,
        points: activePointsRef.current,
        bbox: { minX: 0, minY: 0, maxX: pageW, maxY: pageH },
      });
    }

    // Rascunho da ferramenta de Formas
    if (draftShapeRef.current) {
      drawShapeOnCanvas(ctx, draftShapeRef.current);
    }

    // Polígono em desenho do Laço (tracejado azul)
    if (lassoPointsRef.current.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#007AFF';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.fillStyle = 'rgba(0, 122, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(lassoPointsRef.current[0].x, lassoPointsRef.current[0].y);
      for (let i = 1; i < lassoPointsRef.current.length; i++) {
        ctx.lineTo(lassoPointsRef.current[i].x, lassoPointsRef.current[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Laser Pointer (trilha brilhante temporária que desaparece em 1.1s)
    const now = performance.now();
    laserTrailRef.current = laserTrailRef.current.filter(
      (pt) => now - pt.timestamp < 1100
    );
    if (laserTrailRef.current.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < laserTrailRef.current.length; i++) {
        const p0 = laserTrailRef.current[i - 1];
        const p1 = laserTrailRef.current[i];
        const age = (now - p1.timestamp) / 1100;
        const alpha = Math.max(0, 1 - age);

        ctx.strokeStyle = `rgba(255, 59, 48, ${alpha})`;
        ctx.shadowColor = '#FF3B30';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 5 * (1 - age * 0.5);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      const head = laserTrailRef.current[laserTrailRef.current.length - 1];
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FF3B30';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FF3B30';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [
    activeTool,
    penType,
    penColor,
    penSize,
    highlighterColor,
    highlighterSize,
    pageW,
    pageH,
  ]);

  const flushWetLayerRender = useCallback(() => {
    if (wetRenderRafRef.current !== null) {
      cancelAnimationFrame(wetRenderRafRef.current);
      wetRenderRafRef.current = null;
    }
    renderActiveWetLayer();
  }, [renderActiveWetLayer]);

  // Aplica a borracha na posição (x, y)
  const applyEraserAt = useCallback(
    (x: number, y: number) => {
      setEraserCursor({ x, y });

      onCommitPageUpdate((prev) => {
        let changed = false;
        let nextStrokes: StrokeElement[] = [];

        for (const s of prev.strokes) {
          if (eraseHighlighterOnly && s.tool !== 'highlighter') {
            nextStrokes.push(s);
            continue;
          }

          if (eraserMode === 'stroke') {
            if (hitTestStroke(s, x, y, eraserRadius)) {
              changed = true;
              didEraseDuringStrokeRef.current = true;
            } else {
              nextStrokes.push(s);
            }
          } else {
            // Borracha de precisão
            const pieces = eraseStrokePrecision(s, x, y, eraserRadius);
            if (
              pieces.length !== 1 ||
              pieces[0].points.length !== s.points.length
            ) {
              changed = true;
              didEraseDuringStrokeRef.current = true;
            }
            nextStrokes = nextStrokes.concat(pieces);
          }
        }

        // Em modo Traço Inteiro (quando não filtrado apenas para marca-texto), apaga também Formas atingidas
        let nextShapes = prev.shapes;
        if (!eraseHighlighterOnly) {
          nextShapes = prev.shapes.filter((sh) => {
            const minX = Math.min(sh.x1, sh.x2) - eraserRadius;
            const maxX = Math.max(sh.x1, sh.x2) + eraserRadius;
            const minY = Math.min(sh.y1, sh.y2) - eraserRadius;
            const maxY = Math.max(sh.y1, sh.y2) + eraserRadius;
            const hit = x >= minX && x <= maxX && y >= minY && y <= maxY;
            if (hit) {
              changed = true;
              didEraseDuringStrokeRef.current = true;
            }
            return !hit;
          });
        }

        // Se nenhum traço ou forma foi atingido neste movimento, permite que a Borracha também apague Post-its/Figurinhas ou Caixas de Texto tocadas diretamente!
        let nextImages = prev.images;
        let nextTextBoxes = prev.textBoxes;
        if (!changed && !didEraseDuringStrokeRef.current && !eraseHighlighterOnly) {
          nextTextBoxes = prev.textBoxes.filter((tb) => {
            const hit =
              x >= tb.x &&
              x <= tb.x + tb.width &&
              y >= tb.y &&
              y <= tb.y + tb.height;
            if (hit) {
              changed = true;
              didEraseDuringStrokeRef.current = true;
            }
            return !hit;
          });
          if (!changed) {
            nextImages = prev.images.filter((im) => {
              const hit =
                x >= im.x &&
                x <= im.x + im.width &&
                y >= im.y &&
                y <= im.y + im.height;
              if (hit) {
                changed = true;
                didEraseDuringStrokeRef.current = true;
              }
              return !hit;
            });
          }
        }

        if (!changed) return prev;
        return {
          ...prev,
          strokes: nextStrokes,
          shapes: nextShapes,
          images: nextImages,
          textBoxes: nextTextBoxes,
          updatedAt: Date.now(),
        };
      }, false);
    },
    [
      eraseHighlighterOnly,
      eraserMode,
      eraserRadius,
      onCommitPageUpdate,
    ]
  );

  // ================= HANDLERS DE POINTER EVENTS (STYLUS, TOUCH, MOUSE) =================

  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    // 1. Se a caneta (stylus) já está desenhando na tela, bloqueia 100% qualquer toque de mão/palma
    if (
      e.pointerType === 'touch' &&
      drawingPointerIdRef.current !== null &&
      drawingPointerTypeRef.current === 'pen'
    ) {
      return;
    }

    cachedCanvasRectRef.current = e.currentTarget.getBoundingClientRect();
    const pt = clientToPageCoords(e.clientX, e.clientY);

    // 2. Se for um evento de toque (dedo ou palma da mão):
    if (e.pointerType === 'touch') {
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });

      const touchCount = activePointersRef.current.size;
      if (touchCount > multiTouchCountRef.current) {
        multiTouchCountRef.current = touchCount;
        multiTouchStartTimeRef.current = performance.now();
      }

      // 2 dedos na tela (quando a caneta NÃO está riscando):
      // Se houver um Post-it/Sticker ou Caixa de Texto selecionado, 2 dedos redimensionam (Pinch-to-Resize: largura, altura ou proporcional)!
      // Caso contrário, 2 dedos fazem Pinch-to-Zoom + Pan livre 2D na página!
      if (touchCount === 2) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        if (drawingPointerTypeRef.current === 'touch') {
          isDrawingRef.current = false;
          drawingPointerIdRef.current = null;
          drawingPointerTypeRef.current = null;
          activePointsRef.current = [];
          flushWetLayerRender();
        }
        panStartRef.current = null;

        const pts = Array.from(activePointersRef.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const spanX = Math.abs(pts[1].x - pts[0].x);
        const spanY = Math.abs(pts[1].y - pts[0].y);

        if (selectedElement && selectedElement.kind === 'image') {
          const targetImg = page.images.find(
            (im) => im.id === selectedElement.id
          );
          if (targetImg) {
            elementPinchRef.current = {
              kind: 'image',
              id: targetImg.id,
              initialDist: Math.max(18, dist),
              initialSpanX: Math.max(14, spanX),
              initialSpanY: Math.max(14, spanY),
              origW: targetImg.width,
              origH: targetImg.height,
              origX: targetImg.x,
              origY: targetImg.y,
            };
            return;
          }
        } else if (selectedElement && selectedElement.kind === 'textBox') {
          const targetTb = page.textBoxes.find(
            (tb) => tb.id === selectedElement.id
          );
          if (targetTb) {
            elementPinchRef.current = {
              kind: 'textBox',
              id: targetTb.id,
              initialDist: Math.max(18, dist),
              initialSpanX: Math.max(14, spanX),
              initialSpanY: Math.max(14, spanY),
              origW: targetTb.width,
              origH: targetTb.height,
              origX: targetTb.x,
              origY: targetTb.y,
            };
            return;
          }
        }

        pinchInitialDistRef.current = dist;
        pinchInitialCenterRef.current = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2,
        };
        pinchInitialZoomRef.current = zoom;
        pinchInitialPanRef.current = { x: pan.x, y: pan.y };
        return;
      }

      if (touchCount > 2) {
        return;
      }

      // Modo Somente Leitura: 1 dedo move a página livremente
      if (activeTool === 'readonly') {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
        panStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          panX: pan.x,
          panY: pan.y,
        };
        return;
      }

      // Se a ferramenta ativa for Caixa de Texto ('text'), Borracha ('eraser') ou Laço ('lasso'), permite operar com o dedo mesmo no modo Só Caneta!
      if (
        stylusOnlyMode &&
        activeTool !== 'text' &&
        activeTool !== 'eraser' &&
        activeTool !== 'lasso'
      ) {
        setSelectedElement(null);
        return;
      }
    }

    // 3. Se a caneta tocou na tela, cancela imediatamente qualquer pan/pinch residual de toque da mão
    if (e.pointerType === 'pen') {
      lastPenTimestampRef.current = performance.now();
      activePointersRef.current.clear();
      multiTouchCountRef.current = 0;
      pinchInitialDistRef.current = null;
      pinchInitialCenterRef.current = null;
      elementPinchRef.current = null;
      panStartRef.current = null;
    }

    if (activeTool === 'readonly') return;

    // Se já houver outro ponteiro desenhando (ex.: dedo enquanto outro dedo toca), ignora
    if (
      drawingPointerIdRef.current !== null &&
      drawingPointerIdRef.current !== e.pointerId &&
      e.pointerType !== 'pen'
    ) {
      return;
    }

    // Se clicou fora da seleção do Laço, limpa seleção
    if (lassoSelection) {
      setLassoSelection(null);
      setLassoColorMenuOpen(false);
    }

    // Se já havia uma Caixa de Texto ou Post-it selecionado e o usuário tocou fora na folha:
    // Primeiro desmarca o item (e limpa caixas de texto vazias) sem criar outra caixa por acidente!
    if (selectedElement) {
      const prevSel = selectedElement;
      setSelectedElement(null);
      if (prevSel.kind === 'textBox') {
        const prevTb = page.textBoxes.find((t) => t.id === prevSel.id);
        if (prevTb && prevTb.text.trim().length === 0) {
          onCommitPageUpdate(
            (prev) => ({
              ...prev,
              textBoxes: prev.textBoxes.filter((t) => t.id !== prevSel.id),
              updatedAt: Date.now(),
            }),
            false
          );
        }
      }
      if (activeTool === 'text') {
        return;
      }
    }

    // Ferramenta Caixa de Texto: cria nova caixa no ponto clicado e dá foco imediato ao teclado
    if (activeTool === 'text') {
      drawingPointerIdRef.current = null;
      drawingPointerTypeRef.current = null;
      const newBox: TextBoxElement = {
        id: createId('txt'),
        x: Math.min(pageW - 240, Math.max(20, pt.x - 40)),
        y: Math.min(pageH - 90, Math.max(20, pt.y - 16)),
        width: 260,
        height: 84,
        text: '',
        fontFamily: 'sans',
        fontSize: 17,
        color: penColor,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textAlign: 'left',
        bold: false,
        italic: false,
        rotation: 0,
      };
      onCommitPageUpdate(
        (prev) => ({
          ...prev,
          textBoxes: [...prev.textBoxes, newBox],
          updatedAt: Date.now(),
        }),
        true
      );
      setSelectedElement({ kind: 'textBox', id: newBox.id });
      setTimeout(() => {
        const el = document.querySelector<HTMLTextAreaElement>(
          `textarea[data-textbox-id="${newBox.id}"]`
        );
        if (el) el.focus();
      }, 50);
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    drawingPointerIdRef.current = e.pointerId;
    drawingPointerTypeRef.current = e.pointerType;

    // Ferramenta Borracha
    if (activeTool === 'eraser') {
      isDrawingRef.current = true;
      didEraseDuringStrokeRef.current = false;
      applyEraserAt(pt.x, pt.y);
      return;
    }

    // Ferramenta Formas Geométricas
    if (activeTool === 'shape') {
      isDrawingRef.current = true;
      draftShapeRef.current = {
        id: createId('shp'),
        shapeType: activeShapeKind,
        x1: pt.x,
        y1: pt.y,
        x2: pt.x + 1,
        y2: pt.y + 1,
        strokeColor: penColor,
        fillColor: fillShapes ? `${penColor}22` : null,
        strokeWidth: penSize,
        opacity: 1,
        rotation: 0,
      };
      flushWetLayerRender();
      return;
    }

    // Ferramenta Laço (Lasso)
    if (activeTool === 'lasso') {
      isDrawingRef.current = true;
      lassoPointsRef.current = [pt];
      flushWetLayerRender();
      return;
    }

    // Ferramenta Laser Pointer
    if (activeTool === 'laser') {
      isDrawingRef.current = true;
      laserTrailRef.current.push({
        x: pt.x,
        y: pt.y,
        timestamp: performance.now(),
      });
      const stepLaser = () => {
        renderActiveWetLayer();
        if (laserTrailRef.current.length > 0 || isDrawingRef.current) {
          laserAnimFrameRef.current = requestAnimationFrame(stepLaser);
        }
      };
      if (laserAnimFrameRef.current) {
        cancelAnimationFrame(laserAnimFrameRef.current);
      }
      laserAnimFrameRef.current = requestAnimationFrame(stepLaser);
      return;
    }

    // Ferramenta Caneta ou Marca-Texto
    if (activeTool === 'pen' || activeTool === 'highlighter') {
      isDrawingRef.current = true;
      snappedShapeRef.current = null;
      const pressure =
        e.pointerType === 'pen'
          ? Math.max(0.15, e.pressure || 0.65)
          : 0.65;
      activePointsRef.current = [
        {
          x: pt.x,
          y: pt.y,
          pressure,
          tiltX: e.tiltX,
          tiltY: e.tiltY,
        },
      ];
      flushWetLayerRender();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === 'pen') {
      lastPenTimestampRef.current = performance.now();
    }

    // Se a caneta está desenhando, ignora qualquer movimento de toque da mão/palma
    if (
      e.pointerType === 'touch' &&
      drawingPointerIdRef.current !== null &&
      drawingPointerTypeRef.current === 'pen'
    ) {
      return;
    }

    if (e.pointerType === 'touch' && activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
      });

      // Pinch-to-Resize em um Post-it/Sticker ou Caixa de Texto selecionado (suporta escala proporcional, largura e altura!)
      if (activePointersRef.current.size === 2 && elementPinchRef.current) {
        const pts = Array.from(activePointersRef.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const spanX = Math.abs(pts[1].x - pts[0].x);
        const spanY = Math.abs(pts[1].y - pts[0].y);

        const ep = elementPinchRef.current;
        const uniformFactor = dist / ep.initialDist;
        const factorX =
          spanX > 28 && ep.initialSpanX > 22
            ? (uniformFactor * 0.55 + (spanX / ep.initialSpanX) * 0.45)
            : uniformFactor;
        const factorY =
          spanY > 28 && ep.initialSpanY > 22
            ? (uniformFactor * 0.55 + (spanY / ep.initialSpanY) * 0.45)
            : uniformFactor;

        const nextW = Math.round(Math.min(pageW - 16, Math.max(48, ep.origW * factorX)));
        const nextH = Math.round(Math.min(pageH - 16, Math.max(36, ep.origH * factorY)));

        if (ep.kind === 'image') {
          updateImageElement(ep.id, { width: nextW, height: nextH });
        } else {
          updateTextBox(ep.id, { width: nextW, height: nextH });
        }
        return;
      }

      // Pinch-to-Zoom + Pan livre simultâneo com 2 dedos (em qualquer direção: lados, cima, baixo, diagonal)
      if (
        activePointersRef.current.size === 2 &&
        pinchInitialDistRef.current &&
        pinchInitialCenterRef.current
      ) {
        const pts = Array.from(activePointersRef.current.values());
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        const currentCenter = {
          x: (pts[0].x + pts[1].x) / 2,
          y: (pts[0].y + pts[1].y) / 2,
        };
        const factor =
          pinchInitialDistRef.current > 12
            ? dist / pinchInitialDistRef.current
            : 1;
        const nextZoom = Math.min(
          4.0,
          Math.max(0.25, pinchInitialZoomRef.current * factor)
        );

        const deltaX = currentCenter.x - pinchInitialCenterRef.current.x;
        const deltaY = currentCenter.y - pinchInitialCenterRef.current.y;

        onChangeZoomPan(nextZoom, {
          x: pinchInitialPanRef.current.x + deltaX,
          y: pinchInitialPanRef.current.y + deltaY,
        });
        return;
      }

      // Pan com 1 dedo (somente quando em modo Somente Leitura)
      if (panStartRef.current && activeTool === 'readonly') {
        const dx = e.clientX - panStartRef.current.clientX;
        const dy = e.clientY - panStartRef.current.clientY;
        onChangeZoomPan(zoom, {
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        });
        return;
      }

      // Em Modo Só Caneta, 1 toque é palma/dedo: ignora escrita de caneta/marca-texto (mas permite Borracha e Laço)
      if (
        stylusOnlyMode &&
        activeTool !== 'eraser' &&
        activeTool !== 'lasso'
      ) {
        return;
      }
    }

    // Se a caneta (stylus) já está encostada na tela movendo-se (e o evento pointerdown foi engolido pela troca de palma do tablet),
    // inicia o traço automaticamente no próprio pointermove para nunca falhar na primeira passada!
    if (
      !isDrawingRef.current &&
      e.pointerType === 'pen' &&
      (e.buttons > 0 || e.pressure > 0.002) &&
      (activeTool === 'pen' ||
        activeTool === 'highlighter' ||
        activeTool === 'eraser')
    ) {
      cachedCanvasRectRef.current = e.currentTarget.getBoundingClientRect();
      const startPt = clientToPageCoords(e.clientX, e.clientY);
      drawingPointerIdRef.current = e.pointerId;
      drawingPointerTypeRef.current = 'pen';
      isDrawingRef.current = true;
      snappedShapeRef.current = null;
      if (activeTool === 'eraser') {
        didEraseDuringStrokeRef.current = false;
        applyEraserAt(startPt.x, startPt.y);
        return;
      }
      activePointsRef.current = [
        {
          x: startPt.x,
          y: startPt.y,
          pressure: Math.max(0.15, e.pressure || 0.65),
          tiltX: e.tiltX,
          tiltY: e.tiltY,
        },
      ];
      flushWetLayerRender();
      return;
    }

    // Só processa desenho se este evento vier exatamente do ponteiro ativo de escrita
    if (!isDrawingRef.current || e.pointerId !== drawingPointerIdRef.current) {
      return;
    }

    const pt = clientToPageCoords(e.clientX, e.clientY);

    if (activeTool === 'eraser') {
      applyEraserAt(pt.x, pt.y);
      return;
    }

    if (activeTool === 'shape' && draftShapeRef.current) {
      draftShapeRef.current = {
        ...draftShapeRef.current,
        x2: pt.x,
        y2: pt.y,
      };
      flushWetLayerRender();
      return;
    }

    if (activeTool === 'lasso') {
      lassoPointsRef.current.push(pt);
      flushWetLayerRender();
      return;
    }

    if (activeTool === 'laser') {
      laserTrailRef.current.push({
        x: pt.x,
        y: pt.y,
        timestamp: performance.now(),
      });
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      // Se já converteu em forma (Hold-to-Snap) e o usuário continua movendo a caneta sem soltar: ajusta o ponto final
      if (snappedShapeRef.current) {
        snappedShapeRef.current = {
          ...snappedShapeRef.current,
          x2: pt.x,
          y2: pt.y,
        };
        flushWetLayerRender();
        return;
      }

      // Captura eventos coalescidos (120Hz/240Hz de Apple Pencil / S-Pen) sem layout reflow
      const nativeEvent = e.nativeEvent as PointerEvent;
      const coalesced =
        typeof nativeEvent.getCoalescedEvents === 'function'
          ? nativeEvent.getCoalescedEvents()
          : null;

      if (coalesced && coalesced.length > 0) {
        for (let i = 0; i < coalesced.length; i++) {
          const ce = coalesced[i];
          const cPt = clientToPageCoords(ce.clientX, ce.clientY);
          const pressure =
            ce.pointerType === 'pen'
              ? Math.max(0.15, ce.pressure || 0.65)
              : 0.65;

          if (
            activeTool === 'highlighter' &&
            straightLineHighlighter &&
            activePointsRef.current.length > 0
          ) {
            const start = activePointsRef.current[0];
            activePointsRef.current = [
              start,
              { x: cPt.x, y: start.y, pressure: 0.65 },
            ];
          } else {
            activePointsRef.current.push({
              x: cPt.x,
              y: cPt.y,
              pressure,
              tiltX: ce.tiltX,
              tiltY: ce.tiltY,
            });
          }
        }
      } else {
        const pressure =
          e.pointerType === 'pen'
            ? Math.max(0.15, e.pressure || 0.65)
            : 0.65;
        if (
          activeTool === 'highlighter' &&
          straightLineHighlighter &&
          activePointsRef.current.length > 0
        ) {
          const start = activePointsRef.current[0];
          activePointsRef.current = [
            start,
            { x: pt.x, y: start.y, pressure: 0.65 },
          ];
        } else {
          activePointsRef.current.push({
            x: pt.x,
            y: pt.y,
            pressure,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
          });
        }
      }

      // Renderiza a camada de tinta ativa sincronicamente (latência 0ms para caneta e marca-texto!)
      flushWetLayerRender();

      // Reinicia o timer de Hold-to-Snap Shape (420ms parado no final do traço)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdToSnapShape && activeTool === 'pen') {
        holdTimerRef.current = setTimeout(() => {
          if (!isDrawingRef.current) return;
          const recognized = recognizeQuickShape(
            activePointsRef.current,
            penColor,
            penSize,
            fillShapes
          );
          if (recognized) {
            snappedShapeRef.current = recognized;
            flushWetLayerRender();
          }
        }, 420);
      }
    }
  };

  const finishStrokeOrInteraction = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (activeTool === 'eraser') {
      setEraserCursor(null);
      if (didEraseDuringStrokeRef.current && autoDeselectEraser) {
        onAutoSwitchToPen();
      }
      return;
    }

    if (activeTool === 'shape' && draftShapeRef.current) {
      const committedShape = draftShapeRef.current;
      draftShapeRef.current = null;
      if (
        Math.hypot(
          committedShape.x2 - committedShape.x1,
          committedShape.y2 - committedShape.y1
        ) > 6
      ) {
        // Desenha imediatamente na camada estática ANTES de limpar a camada ativa (zero piscada)
        drawStaticLayerWith(page.strokes, [...page.shapes, committedShape]);
        flushWetLayerRender();
        onCommitPageUpdate(
          (prev) => ({
            ...prev,
            shapes: [...prev.shapes, committedShape],
            updatedAt: Date.now(),
          }),
          true
        );
      } else {
        flushWetLayerRender();
      }
      return;
    }

    if (activeTool === 'lasso') {
      const poly = lassoPointsRef.current;
      lassoPointsRef.current = [];
      flushWetLayerRender();

      if (poly.length < 4) return;

      const selectedStrokes = lassoFilters.strokes
        ? page.strokes
            .filter((s) =>
              s.points.some((p) => isPointInPolygon(p.x, p.y, poly))
            )
            .map((s) => s.id)
        : [];

      const selectedShapes = lassoFilters.shapes
        ? page.shapes
            .filter((sh) =>
              isPointInPolygon((sh.x1 + sh.x2) / 2, (sh.y1 + sh.y2) / 2, poly)
            )
            .map((sh) => sh.id)
        : [];

      const selectedTextBoxes = lassoFilters.textBoxes
        ? page.textBoxes
            .filter((tb) =>
              isPointInPolygon(
                tb.x + tb.width / 2,
                tb.y + tb.height / 2,
                poly
              )
            )
            .map((tb) => tb.id)
        : [];

      const selectedImages = lassoFilters.images
        ? page.images
            .filter((im) =>
              isPointInPolygon(
                im.x + im.width / 2,
                im.y + im.height / 2,
                poly
              )
            )
            .map((im) => im.id)
        : [];

      const totalCount =
        selectedStrokes.length +
        selectedShapes.length +
        selectedTextBoxes.length +
        selectedImages.length;

      if (totalCount > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const s of page.strokes) {
          if (selectedStrokes.includes(s.id)) {
            minX = Math.min(minX, s.bbox.minX);
            minY = Math.min(minY, s.bbox.minY);
            maxX = Math.max(maxX, s.bbox.maxX);
            maxY = Math.max(maxY, s.bbox.maxY);
          }
        }
        for (const sh of page.shapes) {
          if (selectedShapes.includes(sh.id)) {
            minX = Math.min(minX, sh.x1, sh.x2);
            minY = Math.min(minY, sh.y1, sh.y2);
            maxX = Math.max(maxX, sh.x1, sh.x2);
            maxY = Math.max(maxY, sh.y1, sh.y2);
          }
        }
        for (const tb of page.textBoxes) {
          if (selectedTextBoxes.includes(tb.id)) {
            minX = Math.min(minX, tb.x);
            minY = Math.min(minY, tb.y);
            maxX = Math.max(maxX, tb.x + tb.width);
            maxY = Math.max(maxY, tb.y + tb.height);
          }
        }
        for (const im of page.images) {
          if (selectedImages.includes(im.id)) {
            minX = Math.min(minX, im.x);
            minY = Math.min(minY, im.y);
            maxX = Math.max(maxX, im.x + im.width);
            maxY = Math.max(maxY, im.y + im.height);
          }
        }

        setLassoSelection({
          strokeIds: selectedStrokes,
          shapeIds: selectedShapes,
          textBoxIds: selectedTextBoxes,
          imageIds: selectedImages,
          bbox: {
            minX: minX - 10,
            minY: minY - 10,
            maxX: maxX + 10,
            maxY: maxY + 10,
          },
        });
      }
      return;
    }

    if (activeTool === 'pen' || activeTool === 'highlighter') {
      if (snappedShapeRef.current) {
        const finalShape = snappedShapeRef.current;
        snappedShapeRef.current = null;
        activePointsRef.current = [];
        // Desenha imediatamente na camada estática ANTES de limpar a camada ativa (zero piscada)
        drawStaticLayerWith(page.strokes, [...page.shapes, finalShape]);
        flushWetLayerRender();
        onCommitPageUpdate(
          (prev) => ({
            ...prev,
            shapes: [...prev.shapes, finalShape],
            updatedAt: Date.now(),
          }),
          true
        );
        return;
      }

      const pts = activePointsRef.current;
      activePointsRef.current = [];

      if (pts.length === 0) {
        flushWetLayerRender();
        return;
      }

      const isHl = activeTool === 'highlighter';
      const size = isHl ? highlighterSize : penSize;
      const newStroke: StrokeElement = {
        id: createId('strk'),
        tool: isHl ? 'highlighter' : 'pen',
        penType,
        color: isHl ? highlighterColor : penColor,
        size,
        opacity: isHl ? 0.42 : 1,
        points: pts,
        bbox: computeBoundingBox(pts, size),
      };

      // Transfere o traço sincronicamente para a camada estática ANTES de limpar a camada ativa (zero piscada!)
      drawStaticLayerWith([...page.strokes, newStroke], page.shapes);
      flushWetLayerRender();

      onCommitPageUpdate(
        (prev) => ({
          ...prev,
          strokes: [...prev.strokes, newStroke],
          updatedAt: Date.now(),
        }),
        true
      );
    }
  };

  const handlePointerUpOrCancel = (
    e: React.PointerEvent<HTMLElement>
  ) => {
    const isCancel = e.type === 'pointercancel';

    if (e.pointerType === 'touch') {
      activePointersRef.current.delete(e.pointerId);

      // Se a caneta estiver desenhando agora, o levantar da palma da mão NÃO deve finalizar o traço da caneta!
      if (
        drawingPointerIdRef.current !== null &&
        drawingPointerTypeRef.current === 'pen'
      ) {
        return;
      }

      // Verifica gesto rápido de 2 dedos (Undo) ou 3 dedos (Redo) APENAS em pointerup real (nunca em pointercancel de rejeição de palma!)
      if (
        !isCancel &&
        activePointersRef.current.size === 0 &&
        multiTouchCountRef.current >= 2 &&
        performance.now() - lastPenTimestampRef.current > 1000
      ) {
        const elapsed = performance.now() - multiTouchStartTimeRef.current;
        const movedDist = Math.hypot(
          pan.x - pinchInitialPanRef.current.x,
          pan.y - pinchInitialPanRef.current.y
        );
        if (elapsed < 260 && movedDist < 14) {
          if (multiTouchCountRef.current === 2) {
            onUndo();
          } else if (multiTouchCountRef.current >= 3) {
            onRedo();
          }
        }
        multiTouchCountRef.current = 0;
        pinchInitialDistRef.current = null;
        pinchInitialCenterRef.current = null;
      }

      if (activePointersRef.current.size < 2) {
        pinchInitialDistRef.current = null;
        pinchInitialCenterRef.current = null;
        elementPinchRef.current = null;
      }
      if (activePointersRef.current.size === 0) {
        panStartRef.current = null;
        multiTouchCountRef.current = 0;
      }
    }

    // Só finaliza o traço se o ponteiro que levantou for de fato o ponteiro que estava desenhando
    if (e.pointerId === drawingPointerIdRef.current) {
      drawingPointerIdRef.current = null;
      drawingPointerTypeRef.current = null;
      finishStrokeOrInteraction();
    }
  };

  // ================= OPERAÇÕES DO LAÇO (MOVER, COLORIR, DUPLICAR, CAPTURAR, EXCLUIR) =================

  const moveLassoSelectionBy = (dx: number, dy: number) => {
    if (!lassoSelection) return;
    onCommitPageUpdate((prev) => {
      const nextStrokes = prev.strokes.map((s) => {
        if (!lassoSelection.strokeIds.includes(s.id)) return s;
        const movedPts = s.points.map((p) => ({
          ...p,
          x: p.x + dx,
          y: p.y + dy,
        }));
        return {
          ...s,
          points: movedPts,
          bbox: computeBoundingBox(movedPts, s.size),
        };
      });

      const nextShapes = prev.shapes.map((sh) =>
        lassoSelection.shapeIds.includes(sh.id)
          ? {
              ...sh,
              x1: sh.x1 + dx,
              y1: sh.y1 + dy,
              x2: sh.x2 + dx,
              y2: sh.y2 + dy,
            }
          : sh
      );

      const nextTextBoxes = prev.textBoxes.map((tb) =>
        lassoSelection.textBoxIds.includes(tb.id)
          ? { ...tb, x: tb.x + dx, y: tb.y + dy }
          : tb
      );

      const nextImages = prev.images.map((im) =>
        lassoSelection.imageIds.includes(im.id)
          ? { ...im, x: im.x + dx, y: im.y + dy }
          : im
      );

      return {
        ...prev,
        strokes: nextStrokes,
        shapes: nextShapes,
        textBoxes: nextTextBoxes,
        images: nextImages,
        updatedAt: Date.now(),
      };
    }, false);

    setLassoSelection((prev) =>
      prev
        ? {
            ...prev,
            bbox: {
              minX: prev.bbox.minX + dx,
              minY: prev.bbox.minY + dy,
              maxX: prev.bbox.maxX + dx,
              maxY: prev.bbox.maxY + dy,
            },
          }
        : null
    );
  };

  const handleLassoRecolor = (newColor: string) => {
    if (!lassoSelection) return;
    onCommitPageUpdate(
      (prev) => ({
        ...prev,
        strokes: prev.strokes.map((s) =>
          lassoSelection.strokeIds.includes(s.id)
            ? { ...s, color: newColor }
            : s
        ),
        shapes: prev.shapes.map((sh) =>
          lassoSelection.shapeIds.includes(sh.id)
            ? { ...sh, strokeColor: newColor }
            : sh
        ),
        textBoxes: prev.textBoxes.map((tb) =>
          lassoSelection.textBoxIds.includes(tb.id)
            ? { ...tb, color: newColor }
            : tb
        ),
        updatedAt: Date.now(),
      }),
      true
    );
    setLassoColorMenuOpen(false);
  };

  const handleLassoDuplicate = () => {
    if (!lassoSelection) return;
    const offset = 24;
    onCommitPageUpdate((prev) => {
      const dupStrokes = prev.strokes
        .filter((s) => lassoSelection.strokeIds.includes(s.id))
        .map((s) => {
          const pts = s.points.map((p) => ({
            ...p,
            x: p.x + offset,
            y: p.y + offset,
          }));
          return {
            ...s,
            id: createId('strk'),
            points: pts,
            bbox: computeBoundingBox(pts, s.size),
          };
        });

      const dupShapes = prev.shapes
        .filter((sh) => lassoSelection.shapeIds.includes(sh.id))
        .map((sh) => ({
          ...sh,
          id: createId('shp'),
          x1: sh.x1 + offset,
          y1: sh.y1 + offset,
          x2: sh.x2 + offset,
          y2: sh.y2 + offset,
        }));

      const dupTexts = prev.textBoxes
        .filter((tb) => lassoSelection.textBoxIds.includes(tb.id))
        .map((tb) => ({
          ...tb,
          id: createId('txt'),
          x: tb.x + offset,
          y: tb.y + offset,
        }));

      const dupImages = prev.images
        .filter((im) => lassoSelection.imageIds.includes(im.id))
        .map((im) => ({
          ...im,
          id: createId('img'),
          x: im.x + offset,
          y: im.y + offset,
        }));

      return {
        ...prev,
        strokes: [...prev.strokes, ...dupStrokes],
        shapes: [...prev.shapes, ...dupShapes],
        textBoxes: [...prev.textBoxes, ...dupTexts],
        images: [...prev.images, ...dupImages],
        updatedAt: Date.now(),
      };
    }, true);
  };

  const handleLassoDelete = () => {
    if (!lassoSelection) return;
    onCommitPageUpdate(
      (prev) => ({
        ...prev,
        strokes: prev.strokes.filter(
          (s) => !lassoSelection.strokeIds.includes(s.id)
        ),
        shapes: prev.shapes.filter(
          (sh) => !lassoSelection.shapeIds.includes(sh.id)
        ),
        textBoxes: prev.textBoxes.filter(
          (tb) => !lassoSelection.textBoxIds.includes(tb.id)
        ),
        images: prev.images.filter(
          (im) => !lassoSelection.imageIds.includes(im.id)
        ),
        updatedAt: Date.now(),
      }),
      true
    );
    setLassoSelection(null);
  };

  const handleLassoScreenshot = () => {
    if (!lassoSelection || !bgCanvasRef.current || !staticCanvasRef.current)
      return;
    const { minX, minY, maxX, maxY } = lassoSelection.bbox;
    const w = Math.max(20, maxX - minX);
    const h = Math.max(20, maxY - minY);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const out = document.createElement('canvas');
    out.width = w * dpr;
    out.height = h * dpr;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      bgCanvasRef.current,
      minX * dpr,
      minY * dpr,
      w * dpr,
      h * dpr,
      0,
      0,
      w * dpr,
      h * dpr
    );
    ctx.drawImage(
      staticCanvasRef.current,
      minX * dpr,
      minY * dpr,
      w * dpr,
      h * dpr,
      0,
      0,
      w * dpr,
      h * dpr
    );

    const url = out.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `recorte-pagina-${page.pageNumber + 1}.png`;
    a.click();
  };

  // ================= ATUALIZAÇÃO DE CAIXAS DE TEXTO & IMAGENS (CAMADA 3) =================

  const updateTextBox = (
    id: string,
    patch: Partial<TextBoxElement>,
    recordHistory = false
  ) => {
    onCommitPageUpdate(
      (prev) => ({
        ...prev,
        textBoxes: prev.textBoxes.map((tb) =>
          tb.id === id ? { ...tb, ...patch } : tb
        ),
        updatedAt: Date.now(),
      }),
      recordHistory
    );
  };

  const deleteTextBox = (id: string) => {
    onCommitPageUpdate(
      (prev) => ({
        ...prev,
        textBoxes: prev.textBoxes.filter((tb) => tb.id !== id),
        updatedAt: Date.now(),
      }),
      true
    );
    setSelectedElement(null);
  };

  const updateImageElement = (
    id: string,
    patch: Partial<ImageElement>,
    recordHistory = false
  ) => {
    onCommitPageUpdate(
      (prev) => ({
        ...prev,
        images: prev.images.map((im) =>
          im.id === id ? { ...im, ...patch } : im
        ),
        updatedAt: Date.now(),
      }),
      recordHistory
    );
  };

  const deleteImageElement = (id: string) => {
    onCommitPageUpdate(
      (prev) => ({
        ...prev,
        images: prev.images.filter((im) => im.id !== id),
        updatedAt: Date.now(),
      }),
      true
    );
    setSelectedElement(null);
  };

  return (
    <div
      ref={viewportRef}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = -e.deltaY * 0.0015;
          const nextZoom = Math.min(3.5, Math.max(0.45, zoom + delta));
          onChangeZoomPan(nextZoom, pan);
        } else {
          onChangeZoomPan(zoom, {
            x: pan.x - e.deltaX,
            y: pan.y - e.deltaY,
          });
        }
      }}
      className="relative flex-1 w-full h-full bg-workspace overflow-hidden flex items-center justify-center canvas-touch-none"
    >
      {/* Container da Folha de Papel com Transformação (Pan + Zoom + Rotação) */}
      <div
        className="relative transition-shadow duration-150 origin-center"
        style={{
          width: `${pageW}px`,
          height: `${pageH}px`,
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom}) rotate(${
            page.rotation || 0
          }deg)`,
          boxShadow:
            '0 12px 38px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* CAMADA 1: Papel Vetorial / PDF Background */}
        <canvas
          ref={bgCanvasRef}
          style={{ width: `${pageW}px`, height: `${pageH}px` }}
          className="absolute inset-0 z-0 pointer-events-none rounded-[3px]"
        />

        {/* SUPERFÍCIE DE INTERAÇÃO DE ESCRITA (Z-[5] - Captura Caneta, Marca-Texto, Borracha, Laço sem bloquear Post-its/TextBoxes!) */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          className={`absolute inset-0 z-[5] ${
            activeTool === 'eraser'
              ? 'cursor-none'
              : activeTool === 'text'
              ? 'cursor-text'
              : 'cursor-crosshair'
          }`}
        />

        {/* CAMADA 2: Post-its, Figurinhas e Imagens (sem z-index no wrapper para que cada item controle seu próprio zIndex!) */}
        <div className="absolute inset-0 pointer-events-none">
          {page.images.map((im) => {
            const isSelected =
              selectedElement?.kind === 'image' && selectedElement.id === im.id;
            const isSvgSticker = im.dataUrl.startsWith('data:image/svg+xml');
            const isBadge =
              (im.label || '').toLowerCase().includes('prova') ||
              (im.label || '').toLowerCase().includes('importante');
            const toolbarScale = Math.min(1.4, Math.max(0.95, +(1 / zoom).toFixed(2)));

            const startResizeImage = (
              e: React.PointerEvent,
              dirX: -1 | 0 | 1,
              dirY: -1 | 0 | 1
            ) => {
              e.preventDefault();
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const origW = im.width;
              const origH = im.height;
              const origX = im.x;
              const origY = im.y;
              let latestPatch: Partial<ImageElement> | null = null;

              const onMove = (me: PointerEvent) => {
                const dx = (me.clientX - startX) / zoom;
                const dy = (me.clientY - startY) / zoom;
                let nextW = origW;
                let nextH = origH;
                let nextX = origX;
                let nextY = origY;

                if (dirX === 1) {
                  nextW = Math.max(48, origW + dx);
                } else if (dirX === -1) {
                  const candidateW = origW - dx;
                  if (candidateW >= 48) {
                    nextW = candidateW;
                    nextX = origX + dx;
                  }
                }

                if (dirY === 1) {
                  nextH = Math.max(36, origH + dy);
                } else if (dirY === -1) {
                  const candidateH = origH - dy;
                  if (candidateH >= 36) {
                    nextH = candidateH;
                    nextY = origY + dy;
                  }
                }

                latestPatch = {
                  x: Math.round(nextX),
                  y: Math.round(nextY),
                  width: Math.round(nextW),
                  height: Math.round(nextH),
                };
                updateImageElement(im.id, latestPatch, false);
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                if (latestPatch) {
                  updateImageElement(im.id, latestPatch, true);
                }
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
              window.addEventListener('pointercancel', onUp);
            };

            const startDragOrTapImage = (e: React.PointerEvent) => {
              if (activeTool === 'eraser' || activeTool === 'lasso') {
                return;
              }
              if ((e.target as HTMLElement)?.closest('button')) {
                return;
              }
              e.stopPropagation();
              setSelectedElement({ kind: 'image', id: im.id });

              const startX = e.clientX;
              const startY = e.clientY;
              const origX = im.x;
              const origY = im.y;
              let hasMoved = false;
              let latestPos: { x: number; y: number } | null = null;

              const onMove = (me: PointerEvent) => {
                const rawDx = me.clientX - startX;
                const rawDy = me.clientY - startY;
                if (!hasMoved && Math.hypot(rawDx, rawDy) > 5) {
                  hasMoved = true;
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }
                if (hasMoved) {
                  latestPos = {
                    x: Math.round(origX + rawDx / zoom),
                    y: Math.round(origY + rawDy / zoom),
                  };
                  updateImageElement(im.id, latestPos, false);
                }
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                if (hasMoved && latestPos) {
                  updateImageElement(im.id, latestPos, true);
                } else if (!hasMoved) {
                  const el = document.querySelector<HTMLTextAreaElement>(
                    `textarea[data-sticker-id="${im.id}"]`
                  );
                  if (el) el.focus();
                }
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
              window.addEventListener('pointercancel', onUp);
            };

            return (
              <div
                key={im.id}
                style={{
                  left: `${im.x}px`,
                  top: `${im.y}px`,
                  width: `${im.width}px`,
                  height: `${im.height}px`,
                  transform: `rotate(${im.rotation || 0}deg)`,
                  zIndex: isSelected ? 45 : 15,
                }}
                onPointerDown={startDragOrTapImage}
                className={`absolute select-none group cursor-move ${
                  isSelected
                    ? 'pointer-events-auto ring-2 ring-accent shadow-2xl rounded-lg'
                    : activeTool === 'eraser' || activeTool === 'lasso'
                    ? 'pointer-events-none'
                    : 'pointer-events-auto hover:ring-1 hover:ring-accent/40'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={im.dataUrl}
                  alt={im.label || 'Elemento'}
                  draggable={false}
                  className={`w-full h-full pointer-events-none ${
                    isSvgSticker ? 'object-fill' : 'object-contain'
                  }`}
                />

                {/* Área de Texto Editável dentro do Post-it / Figurinha (permite arrastar o bloco ou tocar para digitar) */}
                <textarea
                  data-sticker-id={im.id}
                  value={im.text || ''}
                  onChange={(e) =>
                    updateImageElement(im.id, { text: e.target.value })
                  }
                  placeholder={
                    isSelected ? 'Toque para digitar ou arraste para mover...' : ''
                  }
                  style={{
                    fontSize: `${im.fontSize || 15}px`,
                    color: im.textColor || '#1E293B',
                    paddingTop: isBadge ? `${Math.min(34, im.height * 0.4)}px` : '22px',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                  }}
                  className={`absolute inset-0 w-full h-full bg-transparent resize-none px-3 pb-2 focus:outline-none font-medium leading-snug ${
                    isSelected && activeTool !== 'eraser' && activeTool !== 'lasso'
                      ? 'pointer-events-auto cursor-move focus:cursor-text'
                      : 'pointer-events-none'
                  }`}
                />

                {isSelected && (
                  <>
                    {/* Botão Rápido de Excluir no Canto Superior Direito */}
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteImageElement(im.id);
                      }}
                      className="absolute -top-3.5 -right-3.5 w-7 h-7 rounded-full bg-[#FF3B30] text-white flex items-center justify-center shadow-lg border-2 border-white z-50 hover:scale-110 transition-transform cursor-pointer"
                      title="Excluir Post-it / Figurinha"
                    >
                      <X className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    {/* Barra Flutuante Superior do Post-it / Figurinha estilo GoodNotes (Escala adaptativa ao zoom do tablet) */}
                    <div
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        transform: `translateX(-50%) scale(${toolbarScale})`,
                        transformOrigin: 'bottom center',
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        if ((e.target as HTMLElement)?.closest('button')) {
                          return;
                        }
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const origX = im.x;
                        const origY = im.y;
                        let latestPos: { x: number; y: number } | null = null;
                        const onMove = (me: PointerEvent) => {
                          latestPos = {
                            x: Math.round(origX + (me.clientX - startX) / zoom),
                            y: Math.round(origY + (me.clientY - startY) / zoom),
                          };
                          updateImageElement(im.id, latestPos, false);
                        };
                        const onUp = () => {
                          window.removeEventListener('pointermove', onMove);
                          window.removeEventListener('pointerup', onUp);
                          window.removeEventListener('pointercancel', onUp);
                          if (latestPos) {
                            updateImageElement(im.id, latestPos, true);
                          }
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                        window.addEventListener('pointercancel', onUp);
                      }}
                      className="absolute -top-13 left-1/2 flex items-center gap-1 bg-surface border border-[var(--border-subtle)] shadow-2xl rounded-2xl px-2.5 py-1.5 text-xs whitespace-nowrap z-50 cursor-move"
                    >
                      <span className="px-1.5 py-0.5 text-[10px] font-bold text-secondary select-none cursor-move">
                        ⋮⋮ Mover
                      </span>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const el = document.querySelector<HTMLTextAreaElement>(
                            `textarea[data-sticker-id="${im.id}"]`
                          );
                          if (el) el.focus();
                        }}
                        className="px-2 py-1 rounded-lg bg-accent/15 text-accent font-semibold hover:bg-accent/25 cursor-pointer"
                        title="Digitar texto dentro da figurinha/post-it"
                      >
                        Digitar
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateImageElement(
                            im.id,
                            {
                              width: Math.max(48, Math.round(im.width * 0.85)),
                              height: Math.max(36, Math.round(im.height * 0.85)),
                            },
                            true
                          );
                        }}
                        className="px-2 py-1 rounded-lg hover:bg-dock text-primary font-bold cursor-pointer"
                        title="Diminuir tamanho (-15%)"
                      >
                        - Tam
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateImageElement(
                            im.id,
                            {
                              width: Math.min(pageW - 20, Math.round(im.width * 1.15)),
                              height: Math.min(pageH - 20, Math.round(im.height * 1.15)),
                            },
                            true
                          );
                        }}
                        className="px-2 py-1 rounded-lg hover:bg-dock text-primary font-bold cursor-pointer"
                        title="Aumentar tamanho (+15%)"
                      >
                        + Tam
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateImageElement(
                            im.id,
                            {
                              fontSize: Math.max(10, (im.fontSize || 15) - 2),
                            },
                            true
                          );
                        }}
                        className="px-1.5 py-1 rounded-lg hover:bg-dock text-secondary font-semibold cursor-pointer"
                        title="Diminuir fonte do texto"
                      >
                        A-
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateImageElement(
                            im.id,
                            {
                              fontSize: Math.min(42, (im.fontSize || 15) + 2),
                            },
                            true
                          );
                        }}
                        className="px-1.5 py-1 rounded-lg hover:bg-dock text-secondary font-semibold cursor-pointer"
                        title="Aumentar fonte do texto"
                      >
                        A+
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateImageElement(
                            im.id,
                            { rotation: ((im.rotation || 0) + 15) % 360 },
                            true
                          );
                        }}
                        className="p-1.5 rounded-lg hover:bg-dock text-primary cursor-pointer"
                        title="Girar +15°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const newId = createId('img');
                          onCommitPageUpdate(
                            (prev) => ({
                              ...prev,
                              images: [
                                ...prev.images,
                                {
                                  ...im,
                                  id: newId,
                                  x: Math.min(pageW - im.width - 10, im.x + 28),
                                  y: Math.min(pageH - im.height - 10, im.y + 28),
                                },
                              ],
                              updatedAt: Date.now(),
                            }),
                            true
                          );
                          setSelectedElement({ kind: 'image', id: newId });
                        }}
                        className="p-1.5 rounded-lg hover:bg-dock text-primary cursor-pointer"
                        title="Duplicar figurinha"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteImageElement(im.id);
                        }}
                        className="px-2 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-[#FF3B30] font-bold flex items-center gap-1 cursor-pointer"
                        title="Excluir figurinha"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedElement(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-accent text-white font-semibold ml-0.5 cursor-pointer"
                        title="Fixar no papel"
                      >
                        OK
                      </button>
                    </div>

                    {/* 8 Alças de Redimensionamento Touch-Friendly (Cantos = Proporcional/Livre, Laterais = Largura, Topo/Base = Altura) */}
                    {/* Canto Superior Esquerdo */}
                    <div
                      onPointerDown={(e) => startResizeImage(e, -1, -1)}
                      className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-white border-[3px] border-accent cursor-nwse-resize shadow-md z-40"
                    />
                    {/* Canto Inferior Esquerdo */}
                    <div
                      onPointerDown={(e) => startResizeImage(e, -1, 1)}
                      className="absolute -bottom-3 -left-3 w-7 h-7 rounded-full bg-white border-[3px] border-accent cursor-nesw-resize shadow-md z-40"
                    />
                    {/* Canto Inferior Direito */}
                    <div
                      onPointerDown={(e) => startResizeImage(e, 1, 1)}
                      className="absolute -bottom-3 -right-3 w-7 h-7 rounded-full bg-white border-[3px] border-accent cursor-nwse-resize shadow-md z-40"
                    />
                    {/* Lateral Direita (Ajustar Largura) */}
                    <div
                      onPointerDown={(e) => startResizeImage(e, 1, 0)}
                      className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-9 rounded-full bg-accent border-2 border-white cursor-ew-resize shadow-md z-40"
                      title="Arraste para aumentar/diminuir a Largura"
                    />
                    {/* Lateral Esquerda (Ajustar Largura) */}
                    <div
                      onPointerDown={(e) => startResizeImage(e, -1, 0)}
                      className="absolute top-1/2 -translate-y-1/2 -left-3 w-4 h-9 rounded-full bg-accent border-2 border-white cursor-ew-resize shadow-md z-40"
                      title="Arraste para aumentar/diminuir a Largura"
                    />
                    {/* Base Inferior (Ajustar Altura) */}
                    <div
                      onPointerDown={(e) => startResizeImage(e, 0, 1)}
                      className="absolute left-1/2 -translate-x-1/2 -bottom-3 w-9 h-4 rounded-full bg-accent border-2 border-white cursor-ns-resize shadow-md z-40"
                      title="Arraste para aumentar/diminuir a Altura"
                    />
                    {/* Topo Superior (Ajustar Altura) */}
                    <div
                      onPointerDown={(e) => startResizeImage(e, 0, -1)}
                      className="absolute left-1/2 -translate-x-1/2 -top-3 w-9 h-4 rounded-full bg-accent border-2 border-white cursor-ns-resize shadow-md z-40"
                      title="Arraste para aumentar/diminuir a Altura"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* CAMADA 3: Traços Finalizados (Marca-Texto + Formas + Caneta) - Fica ACIMA dos Post-its/Stickers (pointer-events-none para nunca travar cliques!) */}
        <canvas
          ref={staticCanvasRef}
          style={{ width: `${pageW}px`, height: `${pageH}px` }}
          className="absolute inset-0 z-20 pointer-events-none"
        />

        {/* CAMADA 4: Wet Ink Canvas (Visualização em tempo real do traço ativo - pointer-events-none para nunca bloquear elementos!) */}
        <canvas
          ref={activeCanvasRef}
          style={{
            width: `${pageW}px`,
            height: `${pageH}px`,
            mixBlendMode:
              activeTool === 'highlighter' && page.paperColor !== 'dark'
                ? 'multiply'
                : 'normal',
          }}
          className="absolute inset-0 z-[25] pointer-events-none"
        />

        {/* CAMADA 5: Caixas de Texto, Laço, Cursor de Borracha e Janela de Zoom */}
        <div className="absolute inset-0 pointer-events-none">
          {/* 5.1. Caixas de Texto Ricas */}
          {page.textBoxes.map((tb) => {
            const isSelected =
              selectedElement?.kind === 'textBox' &&
              selectedElement.id === tb.id;
            const matchesSearch =
              searchHighlightTerm &&
              searchHighlightTerm.trim().length > 0 &&
              tb.text
                .toLowerCase()
                .includes(searchHighlightTerm.toLowerCase());

            const fontClass =
              tb.fontFamily === 'serif'
                ? 'font-serif'
                : tb.fontFamily === 'mono'
                ? 'font-mono'
                : 'font-sans';
            const toolbarScale = Math.min(1.4, Math.max(0.95, +(1 / zoom).toFixed(2)));

            const startDragOrTapTextBox = (e: React.PointerEvent) => {
              if (activeTool === 'eraser' || activeTool === 'lasso') {
                return;
              }
              if ((e.target as HTMLElement)?.closest('button')) {
                return;
              }
              e.stopPropagation();
              setSelectedElement({ kind: 'textBox', id: tb.id });

              const startX = e.clientX;
              const startY = e.clientY;
              const origX = tb.x;
              const origY = tb.y;
              let hasMoved = false;
              let latestPos: { x: number; y: number } | null = null;

              const onMove = (me: PointerEvent) => {
                const rawDx = me.clientX - startX;
                const rawDy = me.clientY - startY;
                if (!hasMoved && Math.hypot(rawDx, rawDy) > 5) {
                  hasMoved = true;
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }
                if (hasMoved) {
                  latestPos = {
                    x: Math.round(origX + rawDx / zoom),
                    y: Math.round(origY + rawDy / zoom),
                  };
                  updateTextBox(tb.id, latestPos, false);
                }
              };
              const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                if (hasMoved && latestPos) {
                  updateTextBox(tb.id, latestPos, true);
                } else if (!hasMoved) {
                  const el = document.querySelector<HTMLTextAreaElement>(
                    `textarea[data-textbox-id="${tb.id}"]`
                  );
                  if (el) el.focus();
                }
              };
              window.addEventListener('pointermove', onMove);
              window.addEventListener('pointerup', onUp);
              window.addEventListener('pointercancel', onUp);
            };

            return (
              <div
                key={tb.id}
                style={{
                  left: `${tb.x}px`,
                  top: `${tb.y}px`,
                  width: `${tb.width}px`,
                  minHeight: `${tb.height}px`,
                  backgroundColor: tb.backgroundColor || 'transparent',
                  transform: `rotate(${tb.rotation || 0}deg)`,
                  zIndex: isSelected ? 45 : 30,
                }}
                onPointerDown={startDragOrTapTextBox}
                className={`absolute rounded-xl transition-shadow cursor-move ${
                  activeTool === 'eraser' || activeTool === 'lasso'
                    ? 'pointer-events-none'
                    : 'pointer-events-auto'
                } ${
                  isSelected
                    ? 'ring-2 ring-accent bg-white/90 dark:bg-zinc-900/90 shadow-2xl'
                    : matchesSearch
                    ? 'ring-2 ring-[#FF9500] bg-yellow-300/30'
                    : tb.text.trim().length === 0
                    ? 'border-2 border-dashed border-accent/60 bg-white/60 dark:bg-zinc-900/60'
                    : 'hover:ring-1 hover:ring-accent/40'
                }`}
              >
                {/* Botão Rápido de Excluir no Canto Superior Direito da Caixa de Texto */}
                {isSelected && (
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteTextBox(tb.id);
                    }}
                    className="absolute -top-3.5 -right-3.5 w-7 h-7 rounded-full bg-[#FF3B30] text-white flex items-center justify-center shadow-lg border-2 border-white z-50 hover:scale-110 transition-transform cursor-pointer"
                    title="Excluir caixa de texto"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                )}

                {/* Barra de Arraste + Formatação de Texto quando selecionado */}
                {isSelected && (
                  <div
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      transform: `scale(${toolbarScale})`,
                      transformOrigin: 'bottom left',
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if ((e.target as HTMLElement)?.closest('button')) {
                        return;
                      }
                      const startX = e.clientX;
                      const startY = e.clientY;
                      const origX = tb.x;
                      const origY = tb.y;
                      let latestPos: { x: number; y: number } | null = null;
                      const onMove = (me: PointerEvent) => {
                        latestPos = {
                          x: Math.round(origX + (me.clientX - startX) / zoom),
                          y: Math.round(origY + (me.clientY - startY) / zoom),
                        };
                        updateTextBox(tb.id, latestPos, false);
                      };
                      const onUp = () => {
                        window.removeEventListener('pointermove', onMove);
                        window.removeEventListener('pointerup', onUp);
                        window.removeEventListener('pointercancel', onUp);
                        if (latestPos) {
                          updateTextBox(tb.id, latestPos, true);
                        }
                      };
                      window.addEventListener('pointermove', onMove);
                      window.addEventListener('pointerup', onUp);
                      window.addEventListener('pointercancel', onUp);
                    }}
                    className="-top-12 left-0 absolute flex items-center gap-1 bg-surface border border-[var(--border-subtle)] shadow-2xl rounded-xl px-2.5 py-1.5 text-xs cursor-move whitespace-nowrap z-50"
                  >
                    <span className="px-1.5 py-0.5 text-[10px] font-bold text-secondary select-none cursor-move">
                      ⋮⋮ Mover
                    </span>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateTextBox(tb.id, { bold: !tb.bold }, true);
                      }}
                      className={`p-1 rounded cursor-pointer ${
                        tb.bold ? 'bg-accent text-white' : 'text-primary'
                      }`}
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateTextBox(tb.id, { italic: !tb.italic }, true);
                      }}
                      className={`p-1 rounded cursor-pointer ${
                        tb.italic ? 'bg-accent text-white' : 'text-primary'
                      }`}
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateTextBox(
                          tb.id,
                          {
                            fontSize: Math.max(11, tb.fontSize - 2),
                          },
                          true
                        );
                      }}
                      className="px-1.5 py-0.5 rounded hover:bg-dock text-primary font-bold cursor-pointer"
                    >
                      A-
                    </button>
                    <span className="text-[11px] font-semibold text-secondary">
                      {tb.fontSize}
                    </span>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateTextBox(
                          tb.id,
                          {
                            fontSize: Math.min(54, tb.fontSize + 2),
                          },
                          true
                        );
                      }}
                      className="px-1.5 py-0.5 rounded hover:bg-dock text-primary font-bold cursor-pointer"
                    >
                      A+
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateTextBox(
                          tb.id,
                          {
                            textAlign:
                              tb.textAlign === 'left'
                                ? 'center'
                                : tb.textAlign === 'center'
                                ? 'right'
                                : 'left',
                          },
                          true
                        );
                      }}
                      className="p-1 rounded hover:bg-dock text-primary cursor-pointer"
                    >
                      {tb.textAlign === 'left' ? (
                        <AlignLeft className="w-3.5 h-3.5" />
                      ) : tb.textAlign === 'center' ? (
                        <AlignCenter className="w-3.5 h-3.5" />
                      ) : (
                        <AlignRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteTextBox(tb.id);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-[#FF3B30] font-bold flex items-center gap-1 cursor-pointer"
                      title="Excluir caixa de texto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedElement(null);
                      }}
                      className="px-2.5 py-0.5 rounded-lg bg-accent text-white font-semibold ml-1 cursor-pointer"
                    >
                      OK
                    </button>
                  </div>
                )}

                <textarea
                  data-textbox-id={tb.id}
                  value={tb.text}
                  placeholder="Toque para digitar ou arraste para mover..."
                  onChange={(e) => updateTextBox(tb.id, { text: e.target.value })}
                  style={{
                    fontSize: `${tb.fontSize}px`,
                    color: tb.color,
                    fontWeight: tb.bold ? 700 : 400,
                    fontStyle: tb.italic ? 'italic' : 'normal',
                    textAlign: tb.textAlign,
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                  }}
                  className={`w-full h-full min-h-[72px] bg-transparent resize-none p-2.5 focus:outline-none leading-snug cursor-move focus:cursor-text ${fontClass}`}
                />

                {isSelected && (
                  <>
                    {/* Alça lateral direita (Largura) */}
                    <div
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const startX = e.clientX;
                        const origW = tb.width;
                        const onMove = (me: PointerEvent) => {
                          updateTextBox(tb.id, {
                            width: Math.max(
                              110,
                              Math.round(origW + (me.clientX - startX) / zoom)
                            ),
                          });
                        };
                        const onUp = () => {
                          window.removeEventListener('pointermove', onMove);
                          window.removeEventListener('pointerup', onUp);
                          window.removeEventListener('pointercancel', onUp);
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                        window.addEventListener('pointercancel', onUp);
                      }}
                      className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-9 rounded-full bg-accent border-2 border-white cursor-ew-resize shadow-md z-40"
                    />
                    {/* Alça canto inferior direito (Largura + Altura) */}
                    <div
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const origW = tb.width;
                        const origH = tb.height;
                        const onMove = (me: PointerEvent) => {
                          updateTextBox(tb.id, {
                            width: Math.max(
                              110,
                              Math.round(origW + (me.clientX - startX) / zoom)
                            ),
                            height: Math.max(
                              44,
                              Math.round(origH + (me.clientY - startY) / zoom)
                            ),
                          });
                        };
                        const onUp = () => {
                          window.removeEventListener('pointermove', onMove);
                          window.removeEventListener('pointerup', onUp);
                          window.removeEventListener('pointercancel', onUp);
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                        window.addEventListener('pointercancel', onUp);
                      }}
                      className="absolute -bottom-3 -right-3 w-7 h-7 rounded-full bg-white border-[3px] border-accent cursor-nwse-resize shadow-md z-40"
                    />
                  </>
                )}
              </div>
            );
          })}

          {/* 3.3. Caixa de Seleção do Laço + Menu Contextual Flutuante estilo GoodNotes */}
          {lassoSelection && (
            <div
              style={{
                left: `${lassoSelection.bbox.minX}px`,
                top: `${lassoSelection.bbox.minY}px`,
                width: `${
                  lassoSelection.bbox.maxX - lassoSelection.bbox.minX
                }px`,
                height: `${
                  lassoSelection.bbox.maxY - lassoSelection.bbox.minY
                }px`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                lassoDragStartRef.current = {
                  x: e.clientX,
                  y: e.clientY,
                };
                const onMove = (me: PointerEvent) => {
                  if (!lassoDragStartRef.current) return;
                  const dx = (me.clientX - lassoDragStartRef.current.x) / zoom;
                  const dy = (me.clientY - lassoDragStartRef.current.y) / zoom;
                  lassoDragStartRef.current = {
                    x: me.clientX,
                    y: me.clientY,
                  };
                  moveLassoSelectionBy(dx, dy);
                };
                const onUp = () => {
                  lassoDragStartRef.current = null;
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              }}
              className="absolute pointer-events-auto border-2 border-dashed border-accent bg-accent/5 rounded-lg cursor-move"
            >
              {/* Menu Popover Flutuante do Laço */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface/95 backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl rounded-2xl px-2.5 py-1.5 text-xs whitespace-nowrap z-30"
              >
                <button
                  onClick={() => setLassoColorMenuOpen((prev) => !prev)}
                  className="px-2 py-1 rounded-lg hover:bg-dock text-primary font-medium flex items-center gap-1"
                >
                  <Palette className="w-3.5 h-3.5 text-accent" />
                  Cor
                </button>
                <button
                  onClick={handleLassoDuplicate}
                  className="px-2 py-1 rounded-lg hover:bg-dock text-primary font-medium flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5 text-secondary" />
                  Duplicar
                </button>
                <button
                  onClick={handleLassoScreenshot}
                  className="px-2 py-1 rounded-lg hover:bg-dock text-primary font-medium flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-500" />
                  Capturar
                </button>
                <button
                  onClick={handleLassoDelete}
                  className="px-2 py-1 rounded-lg hover:bg-red-500/10 text-[#FF3B30] font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>

                {lassoColorMenuOpen && (
                  <div className="absolute top-11 left-0 bg-surface border border-[var(--border-subtle)] shadow-xl rounded-2xl p-2 flex items-center gap-1.5">
                    {PEN_COLOR_PALETTE.slice(0, 8).map((hex) => (
                      <button
                        key={hex}
                        onClick={() => handleLassoRecolor(hex)}
                        className="w-6 h-6 rounded-full border border-black/20"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3.4. Retângulo Alvo da Janela de Zoom (Zoom Window Target Box) */}
          {zoomWindowOpen && (
            <div
              style={{
                left: `${zoomBox.x}px`,
                top: `${zoomBox.y}px`,
                width: `${zoomBoxW}px`,
                height: `${zoomBoxH}px`,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startY = e.clientY;
                const origX = zoomBox.x;
                const origY = zoomBox.y;
                const onMove = (me: PointerEvent) => {
                  setZoomBox({
                    x: Math.max(
                      0,
                      Math.min(
                        pageW - zoomBoxW,
                        origX + (me.clientX - startX) / zoom
                      )
                    ),
                    y: Math.max(
                      0,
                      Math.min(
                        pageH - zoomBoxH,
                        origY + (me.clientY - startY) / zoom
                      )
                    ),
                  });
                };
                const onUp = () => {
                  window.removeEventListener('pointermove', onMove);
                  window.removeEventListener('pointerup', onUp);
                };
                window.addEventListener('pointermove', onMove);
                window.addEventListener('pointerup', onUp);
              }}
              className="absolute pointer-events-auto border-2 border-accent bg-accent/10 rounded-md cursor-move shadow-sm"
            >
              <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded-t bg-accent text-white text-[9px] font-bold">
                JANELA DE ZOOM (Arraste)
              </span>
            </div>
          )}

          {/* 3.5. Cursor Circular da Borracha */}
          {activeTool === 'eraser' && eraserCursor && (
            <div
              style={{
                left: `${eraserCursor.x - eraserRadius}px`,
                top: `${eraserCursor.y - eraserRadius}px`,
                width: `${eraserRadius * 2}px`,
                height: `${eraserRadius * 2}px`,
              }}
              className="absolute rounded-full border-2 border-accent bg-white/40 pointer-events-none shadow"
            />
          )}
        </div>
      </div>

      {/* Painel Inferior da Janela de Zoom (Zoom Window estilo GoodNotes) */}
      {zoomWindowOpen && (
        <div className="absolute bottom-0 inset-x-0 z-30 h-52 bg-surface/95 backdrop-blur-xl border-t-2 border-accent shadow-2xl flex flex-col">
          <div className="px-4 py-1.5 bg-dock border-b border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="font-semibold text-accent">
              Janela de Zoom de Precisão (Escreva na caixa azul ou navegue pelas linhas)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  setZoomBox((b) => ({
                    ...b,
                    x: Math.max(40, b.x - 160),
                  }))
                }
                className="px-2.5 py-1 rounded-lg bg-surface hover:bg-accent/10 text-primary font-medium flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Recuar
              </button>
              <button
                onClick={() =>
                  setZoomBox((b) => ({
                    ...b,
                    x: Math.min(pageW - zoomBoxW - 20, b.x + 160),
                  }))
                }
                className="px-2.5 py-1 rounded-lg bg-surface hover:bg-accent/10 text-primary font-medium flex items-center gap-1"
              >
                Avançar
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  setZoomBox((b) => ({
                    x: 78,
                    y: Math.min(pageH - zoomBoxH - 20, b.y + 30),
                  }))
                }
                className="px-2.5 py-1 rounded-lg bg-accent text-white font-semibold flex items-center gap-1"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                Próxima Linha
              </button>
              <button
                onClick={onCloseZoomWindow}
                className="p-1 rounded-lg hover:bg-red-500/10 text-secondary hover:text-[#FF3B30] ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 bg-workspace overflow-hidden">
            <canvas
              ref={zoomWindowCanvasRef}
              width={640}
              height={175}
              className="rounded-xl shadow border border-accent/40 bg-white max-w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
