'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActiveToolId,
  EraserMode,
  NotebookRecord,
  PageRecord,
  PaperColor,
  PaperTemplateId,
  PenTipType,
  ShapeKind,
} from '@/types/note';
import { createId, db } from '@/lib/db';
import { WritingToolbar } from './WritingToolbar';
import { PageCanvas } from './PageCanvas';
import { PageThumbnailsModal } from './PageThumbnailsModal';
import { StickersPopover } from './StickersPopover';
import {
  exportNotebookToPdf,
  renderFullPageToDataUrl,
  renderPdfPageFromBuffer,
} from '@/lib/pdf-service';
import { saveNotebookPdfToGoogleDrive } from '@/lib/google-drive-sync';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Search,
  Bookmark,
  Share,
  FilePlus,
  BookOpenCheck,
  X,
  Moon,
  Sun,
  RotateCcw,
  FileDown,
  Image as ImageIcon,
  Trash2,
  Cloud,
} from 'lucide-react';

interface DocumentWorkspaceProps {
  openTabs: NotebookRecord[];
  activeNotebook: NotebookRecord;
  pages: PageRecord[];
  initialPageIndex?: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSelectTab: (notebook: NotebookRecord) => void;
  onCloseTab: (notebookId: string) => void;
  onBackToLibrary: () => void;
  onDeleteNotebook?: (notebook: NotebookRecord) => Promise<void> | void;
  onRefreshData?: () => Promise<void> | void;
  onShowToast?: (msg: string) => void;
}

export function DocumentWorkspace({
  openTabs,
  activeNotebook,
  pages,
  initialPageIndex = 0,
  darkMode,
  onToggleDarkMode,
  onSelectTab,
  onCloseTab,
  onBackToLibrary,
  onDeleteNotebook,
  onRefreshData,
  onShowToast,
}: DocumentWorkspaceProps) {
  // Cache otimista em memória para atualização instantânea sem esperar o round-trip do IndexedDB
  const [optimisticPagesMap, setOptimisticPagesMap] = useState<
    Record<string, PageRecord>
  >({});
  const [fallbackPages, setFallbackPages] = useState<PageRecord[]>([]);

  useEffect(() => {
    if (pages.length === 0) {
      db.pages
        .where('notebookId')
        .equals(activeNotebook.id)
        .toArray()
        .then((res) => {
          if (res.length > 0) setFallbackPages(res);
        });
    } else if (fallbackPages.length > 0) {
      setFallbackPages([]);
    }
  }, [pages.length, activeNotebook.id, fallbackPages.length]);

  const effectivePages = pages.length > 0 ? pages : fallbackPages;

  const sortedPages = [...effectivePages]
    .map((p) => {
      const opt = optimisticPagesMap[p.id];
      return opt && opt.updatedAt >= p.updatedAt ? opt : p;
    })
    .sort((a, b) => a.pageNumber - b.pageNumber);

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(
    Math.min(
      Math.max(0, initialPageIndex),
      Math.max(0, sortedPages.length - 1)
    )
  );

  // Sincroniza quando troca de aba de caderno
  useEffect(() => {
    setCurrentPageIndex(
      Math.min(
        Math.max(0, activeNotebook.lastOpenedPageIndex || 0),
        Math.max(0, sortedPages.length - 1)
      )
    );
  }, [activeNotebook.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPage: PageRecord | undefined =
    sortedPages[currentPageIndex] || sortedPages[0];
  const currentPageRef = useRef<PageRecord | undefined>(currentPage);
  currentPageRef.current = currentPage;

  // Estado das Ferramentas da Writing Toolbar
  const [activeTool, setActiveTool] = useState<ActiveToolId>('pen');
  const [penType, setPenType] = useState<PenTipType>('fountain');
  const [penColorSlots, setPenColorSlots] = useState<[string, string, string]>([
    '#111827',
    '#1D4ED8',
    '#DC2626',
  ]);
  const [activePenColorSlot, setActivePenColorSlot] = useState(0);
  const [penSizeSlots, setPenSizeSlots] = useState<[number, number, number]>([
    2, 4, 7.5,
  ]);
  const [activePenSizeSlot, setActivePenSizeSlot] = useState(1);
  const [holdToSnapShape, setHoldToSnapShape] = useState(true);

  // Marca-texto
  const [highlighterColorSlots, setHighlighterColorSlots] = useState<
    [string, string, string]
  >(['#FACC15', '#F472B6', '#4ADE80']);
  const [activeHighlighterColorSlot, setActiveHighlighterColorSlot] =
    useState(0);
  const [highlighterSizeSlots] = useState<[number, number, number]>([
    16, 26, 38,
  ]);
  const [activeHighlighterSizeSlot, setActiveHighlighterSizeSlot] = useState(1);
  const [straightLineHighlighter, setStraightLineHighlighter] = useState(false);

  // Borracha
  const [eraserMode, setEraserMode] = useState<EraserMode>('stroke');
  const [eraserRadius, setEraserRadius] = useState(28);
  const [eraseHighlighterOnly, setEraseHighlighterOnly] = useState(false);
  const [autoDeselectEraser, setAutoDeselectEraser] = useState(false);

  // Formas
  const [activeShapeKind, setActiveShapeKind] =
    useState<ShapeKind>('rectangle');
  const [fillShapes, setFillShapes] = useState(true);

  // Laço
  const [lassoFilters, setLassoFilters] = useState({
    strokes: true,
    shapes: true,
    textBoxes: true,
    images: true,
  });

  // Modos e Painéis (Modo Só Caneta ativo por padrão para não atrapalhar com a mão no tablet)
  const [stylusOnlyMode, setStylusOnlyMode] = useState(true);
  const [modeToast, setModeToast] = useState<string | null>(null);
  const [zoomWindowOpen, setZoomWindowOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('vanessa_notes_stylus_only');
      if (saved !== null) {
        setStylusOnlyMode(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleStylusOnlyMode = useCallback(() => {
    setStylusOnlyMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vanessa_notes_stylus_only', String(next));
      } catch {
        // ignore
      }
      setModeToast(
        next
          ? '✋ Só Caneta ativado: a mão apoiada na tela é bloqueada! Use 2 dedos para mover ou dar zoom.'
          : '👆 Dedo + Caneta ativado: você pode riscar tanto com o dedo quanto com a caneta.'
      );
      setTimeout(() => setModeToast(null), 3500);
      return next;
    });
  }, []);
  const [thumbnailsModalOpen, setThumbnailsModalOpen] = useState(false);
  const [stickersModalOpen, setStickersModalOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Busca intra-documento
  const [docSearchOpen, setDocSearchOpen] = useState(false);
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Zoom & Pan da Viewport (auto-calculado para a tela do tablet)
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState<'width' | 'page'>('width');
  const [fitTrigger, setFitTrigger] = useState(0);

  // Histórico Undo / Redo por página (em memória)
  const undoStackRef = useRef<Record<string, PageRecord[]>>({});
  const redoStackRef = useRef<Record<string, PageRecord[]>>({});
  const [, setHistoryTick] = useState(0);

  // Cache em memória de páginas PDF já renderizadas (evita re-renderizar ou piscar ao escrever)
  const pdfRenderCacheRef = useRef<Map<string, string>>(new Map());
  const [pdfPageDataUrl, setPdfPageDataUrl] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Carrega o fundo de PDF da página atual caso o caderno possua pdfAssetId
  useEffect(() => {
    let cancelled = false;
    async function loadPdfPage() {
      const pdfAssetId = activeNotebook.pdfAssetId;
      const pdfPageIndex = currentPage?.pdfPageIndex;
      if (!pdfAssetId || !pdfPageIndex) {
        setPdfPageDataUrl(null);
        return;
      }

      const cacheKey = `${pdfAssetId}:${pdfPageIndex}`;
      const cached = pdfRenderCacheRef.current.get(cacheKey);
      if (cached) {
        setPdfPageDataUrl(cached);
        return;
      }

      const asset = await db.assets.get(pdfAssetId);
      if (!asset || cancelled) return;
      try {
        const rendered = await renderPdfPageFromBuffer(
          asset.data,
          pdfPageIndex,
          1.6
        );
        pdfRenderCacheRef.current.set(cacheKey, rendered.dataUrl);
        if (!cancelled) {
          setPdfPageDataUrl(rendered.dataUrl);
        }
      } catch {
        if (!cancelled) setPdfPageDataUrl(null);
      }
    }
    loadPdfPage();
    return () => {
      cancelled = true;
    };
  }, [activeNotebook.pdfAssetId, currentPage?.id, currentPage?.pdfPageIndex]);

  const saveDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pendingPageToSaveRef = useRef<PageRecord | null>(null);

  useEffect(() => {
    return () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }
      if (pendingPageToSaveRef.current) {
        db.pages.put(pendingPageToSaveRef.current);
        pendingPageToSaveRef.current = null;
      }
    };
  }, []);

  // Função central para atualizar a página atual instantaneamente em memória e persistir em segundo plano no Dexie
  const handleCommitPageUpdate = useCallback(
    (updater: (prev: PageRecord) => PageRecord, recordHistory = true) => {
      const pg = currentPageRef.current;
      if (!pg) return;

      const updated = updater(pg);
      if (updated === pg) return;

      if (recordHistory) {
        const list = undoStackRef.current[pg.id] || [];
        undoStackRef.current[pg.id] = [...list.slice(-39), pg];
        redoStackRef.current[pg.id] = [];
        setHistoryTick((t) => t + 1);
      }

      // Atualiza estado otimista sincronicamente (zero latência visual)
      currentPageRef.current = updated;
      setOptimisticPagesMap((prev) => ({
        ...prev,
        [updated.id]: updated,
      }));

      // Persiste em segundo plano no IndexedDB (imediato em commits finais; debounced em arrastes de 120Hz)
      if (recordHistory) {
        if (saveDebounceTimerRef.current) {
          clearTimeout(saveDebounceTimerRef.current);
          saveDebounceTimerRef.current = null;
        }
        pendingPageToSaveRef.current = null;
        db.pages.put(updated);
      } else {
        pendingPageToSaveRef.current = updated;
        if (saveDebounceTimerRef.current) {
          clearTimeout(saveDebounceTimerRef.current);
        }
        saveDebounceTimerRef.current = setTimeout(() => {
          saveDebounceTimerRef.current = null;
          if (pendingPageToSaveRef.current) {
            db.pages.put(pendingPageToSaveRef.current);
            pendingPageToSaveRef.current = null;
          }
        }, 160);
      }
    },
    []
  );

  // Undo & Redo
  const canUndo = Boolean(
    currentPage && (undoStackRef.current[currentPage.id]?.length || 0) > 0
  );
  const canRedo = Boolean(
    currentPage && (redoStackRef.current[currentPage.id]?.length || 0) > 0
  );

  const handleUndo = useCallback(() => {
    const pg = currentPageRef.current;
    if (!pg) return;
    const uList = undoStackRef.current[pg.id] || [];
    if (uList.length === 0) return;

    const previousState = uList[uList.length - 1];
    undoStackRef.current[pg.id] = uList.slice(0, -1);

    const rList = redoStackRef.current[pg.id] || [];
    redoStackRef.current[pg.id] = [...rList, pg];
    setHistoryTick((t) => t + 1);

    const restored = { ...previousState, updatedAt: Date.now() };
    currentPageRef.current = restored;
    setOptimisticPagesMap((prev) => ({
      ...prev,
      [restored.id]: restored,
    }));
    db.pages.put(restored);
  }, []);

  const handleRedo = useCallback(() => {
    const pg = currentPageRef.current;
    if (!pg) return;
    const rList = redoStackRef.current[pg.id] || [];
    if (rList.length === 0) return;

    const nextState = rList[rList.length - 1];
    redoStackRef.current[pg.id] = rList.slice(0, -1);

    const uList = undoStackRef.current[pg.id] || [];
    undoStackRef.current[pg.id] = [...uList, pg];
    setHistoryTick((t) => t + 1);

    const restored = { ...nextState, updatedAt: Date.now() };
    currentPageRef.current = restored;
    setOptimisticPagesMap((prev) => ({
      ...prev,
      [restored.id]: restored,
    }));
    db.pages.put(restored);
  }, []);

  // Atalhos de Teclado no Editor
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p':
          setActiveTool('pen');
          break;
        case 'h':
          setActiveTool('highlighter');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 's':
          setActiveTool('shape');
          break;
        case 'l':
          setActiveTool('lasso');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'arrowleft':
          setCurrentPageIndex((idx) => Math.max(0, idx - 1));
          break;
        case 'arrowright':
          setCurrentPageIndex((idx) =>
            Math.min(sortedPages.length - 1, idx + 1)
          );
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleUndo, handleRedo, sortedPages.length]);

  // Gerenciamento de Páginas (Inserir, Duplicar, Rotacionar, Excluir, Reordenar)
  const handleAddPageAfter = async (
    afterIndex: number,
    template?: PaperTemplateId,
    paperColor?: PaperColor
  ) => {
    const now = Date.now();
    const newPageNumber = afterIndex + 1;

    await db.transaction('rw', db.pages, db.notebooks, async () => {
      // Desloca numeração das páginas seguintes
      for (const pg of sortedPages) {
        if (pg.pageNumber >= newPageNumber) {
          await db.pages.update(pg.id, {
            pageNumber: pg.pageNumber + 1,
            updatedAt: now,
          });
        }
      }

      await db.pages.add({
        id: createId('pg'),
        notebookId: activeNotebook.id,
        pageNumber: newPageNumber,
        template: template || activeNotebook.defaultTemplate,
        paperColor: paperColor || activeNotebook.defaultPaperColor,
        orientation: activeNotebook.orientation,
        rotation: 0,
        isFavorite: false,
        strokes: [],
        shapes: [],
        textBoxes: [],
        images: [],
        updatedAt: now,
      });

      await db.notebooks.update(activeNotebook.id, {
        updatedAt: now,
        lastOpenedPageIndex: newPageNumber,
      });
    });

    setOptimisticPagesMap({});
    await onRefreshData?.();
    setCurrentPageIndex(newPageNumber);
  };

  const handleDuplicatePage = async (page: PageRecord) => {
    const now = Date.now();
    const targetNum = page.pageNumber + 1;

    await db.transaction('rw', db.pages, async () => {
      for (const pg of sortedPages) {
        if (pg.pageNumber >= targetNum) {
          await db.pages.update(pg.id, {
            pageNumber: pg.pageNumber + 1,
            updatedAt: now,
          });
        }
      }
      await db.pages.add({
        ...page,
        id: createId('pg'),
        pageNumber: targetNum,
        updatedAt: now,
      });
    });
    setOptimisticPagesMap({});
    await onRefreshData?.();
    setCurrentPageIndex(targetNum);
  };

  const handleRotatePage = async (page: PageRecord) => {
    const nextRot = (((page.rotation || 0) + 90) % 360) as 0 | 90 | 180 | 270;
    const now = Date.now();
    await db.pages.update(page.id, {
      rotation: nextRot,
      updatedAt: now,
    });
    setOptimisticPagesMap((prev) => ({
      ...prev,
      [page.id]: { ...page, rotation: nextRot, updatedAt: now },
    }));
    await onRefreshData?.();
  };

  const handleTogglePageFavorite = async (page: PageRecord) => {
    const now = Date.now();
    await db.pages.update(page.id, {
      isFavorite: !page.isFavorite,
      updatedAt: now,
    });
    setOptimisticPagesMap((prev) => ({
      ...prev,
      [page.id]: { ...page, isFavorite: !page.isFavorite, updatedAt: now },
    }));
    await onRefreshData?.();
  };

  const handleMovePageOrder = async (
    pageIndex: number,
    direction: 'left' | 'right'
  ) => {
    const targetIndex = direction === 'left' ? pageIndex - 1 : pageIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedPages.length) return;

    const now = Date.now();
    const pageA = sortedPages[pageIndex];
    const pageB = sortedPages[targetIndex];
    await db.transaction('rw', db.pages, async () => {
      await db.pages.update(pageA.id, {
        pageNumber: targetIndex,
        updatedAt: now,
      });
      await db.pages.update(pageB.id, {
        pageNumber: pageIndex,
        updatedAt: now,
      });
    });
    setOptimisticPagesMap({});
    await onRefreshData?.();
    setCurrentPageIndex(targetIndex);
  };

  const handleDeletePage = async (page: PageRecord) => {
    const now = Date.now();
    if (sortedPages.length <= 1) {
      // Se for a única página do caderno, limpa todo o conteúdo da folha
      const cleared: PageRecord = {
        ...page,
        strokes: [],
        shapes: [],
        textBoxes: [],
        images: [],
        updatedAt: now,
      };
      await db.pages.put(cleared);
      setOptimisticPagesMap({ [page.id]: cleared });
      await onRefreshData?.();
      onShowToast?.('Conteúdo da página apagado!');
      return;
    }

    await db.transaction('rw', db.pages, async () => {
      await db.pages.delete(page.id);
      const remaining = sortedPages.filter((p) => p.id !== page.id);
      for (let i = 0; i < remaining.length; i++) {
        await db.pages.update(remaining[i].id, {
          pageNumber: i,
          updatedAt: now,
        });
      }
    });
    setOptimisticPagesMap({});
    await onRefreshData?.();
    setCurrentPageIndex((idx) => Math.max(0, idx - 1));
    onShowToast?.('Página excluída!');
  };

  // Elemento recém-inserido para seleção/foco imediato no PageCanvas
  const [autoSelectElement, setAutoSelectElement] = useState<{
    kind: 'textBox' | 'image';
    id: string;
    tick: number;
  } | null>(null);

  // Inserir Imagem ou Sticker na página atual (com cascata de posição para nunca sobrepor e seleção imediata)
  const handleInsertImageDataUrl = (
    dataUrl: string,
    label = 'Imagem',
    defaultWidth = 220,
    defaultHeight = 190
  ) => {
    const newId = createId('img');
    if (activeTool === 'eraser' || activeTool === 'lasso') {
      setActiveTool('pen');
    }
    handleCommitPageUpdate(
      (prev) => {
        const offset = (prev.images.length % 6) * 32;
        return {
          ...prev,
          images: [
            ...prev.images,
            {
              id: newId,
              dataUrl,
              x: 150 + offset,
              y: 165 + offset,
              width: defaultWidth,
              height: defaultHeight,
              rotation: 0,
              label,
              text: '',
              fontSize: 15,
              textColor: '#1E293B',
            },
          ],
          updatedAt: Date.now(),
        };
      },
      true
    );
    setAutoSelectElement({ kind: 'image', id: newId, tick: Date.now() });
  };

  // Inserir Caixa de Texto rapidamente ao clicar na ferramenta 'T'
  const handleSelectTool = (tool: ActiveToolId) => {
    setActiveTool(tool);
    if (tool === 'text') {
      const newId = createId('txt');
      const activeColor = penColorSlots[activePenColorSlot];
      handleCommitPageUpdate(
        (prev) => {
          const offset = (prev.textBoxes.length % 6) * 28;
          return {
            ...prev,
            textBoxes: [
              ...prev.textBoxes,
              {
                id: newId,
                x: 140 + offset,
                y: 160 + offset,
                width: 260,
                height: 84,
                text: '',
                fontFamily: 'sans',
                fontSize: 17,
                color: activeColor,
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                textAlign: 'left',
                bold: false,
                italic: false,
                rotation: 0,
              },
            ],
            updatedAt: Date.now(),
          };
        },
        true
      );
      setAutoSelectElement({ kind: 'textBox', id: newId, tick: Date.now() });
    }
  };

  // Exportar Página Atual como PNG
  const handleExportCurrentPagePng = async () => {
    if (!currentPage) return;
    setIsExporting(true);
    try {
      let pdfBuf: ArrayBuffer | null = null;
      if (activeNotebook.pdfAssetId) {
        const asset = await db.assets.get(activeNotebook.pdfAssetId);
        if (asset) pdfBuf = asset.data;
      }
      const { dataUrl } = await renderFullPageToDataUrl(
        activeNotebook,
        currentPage,
        pdfBuf
      );
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${activeNotebook.title}-pagina-${
        currentPageIndex + 1
      }.png`;
      link.click();
    } finally {
      setIsExporting(false);
      setExportMenuOpen(false);
    }
  };

  // Exportar Caderno Inteiro como PDF
  const handleExportFullPdf = async () => {
    setIsExporting(true);
    try {
      await exportNotebookToPdf(activeNotebook, sortedPages);
    } finally {
      setIsExporting(false);
      setExportMenuOpen(false);
    }
  };

  // Salvar Caderno Diretamente na pasta "anotações estudos" do Google Drive
  const handleSaveToGoogleDrive = async () => {
    setIsExporting(true);
    try {
      const savedFileName = await saveNotebookPdfToGoogleDrive(
        activeNotebook,
        sortedPages
      );
      onShowToast?.(
        `Salvo como "${savedFileName}" na pasta "anotações estudos" do Google Drive!`
      );
    } catch (err) {
      onShowToast?.(
        err instanceof Error
          ? err.message
          : 'Erro ao salvar no Google Drive.'
      );
    } finally {
      setIsExporting(false);
      setExportMenuOpen(false);
    }
  };

  if (!currentPage) return null;

  return (
    <div className="flex flex-col h-screen w-screen bg-app overflow-hidden select-none">
      {/* 1. TOP NAVIGATION BAR + DOCUMENT TABS (Estilo GoodNotes iPadOS) */}
      <header className="bg-elevated backdrop-blur-xl border-b border-[var(--border-subtle)] px-3 py-1.5 flex items-center justify-between gap-2 z-40">
        {/* Esquerda: Voltar p/ Biblioteca, Miniaturas, Busca no Doc */}
        <div className="flex items-center gap-1">
          <button
            onClick={onBackToLibrary}
            className="px-2.5 py-1.5 rounded-xl hover:bg-dock text-accent font-semibold text-xs flex items-center gap-1 transition-colors"
            title="Voltar para a Biblioteca"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Documentos</span>
          </button>

          <button
            onClick={() => setThumbnailsModalOpen(true)}
            className="p-2 rounded-xl hover:bg-dock text-primary transition-colors"
            title="Ver Grade de Páginas, Favoritos e Sumário"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            onClick={() => setDocSearchOpen((prev) => !prev)}
            className={`p-2 rounded-xl transition-colors ${
              docSearchOpen
                ? 'bg-accent text-white'
                : 'hover:bg-dock text-primary'
            }`}
            title="Buscar nesta nota / PDF"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Centro: Abas de Documentos Abertos */}
        <div className="flex-1 flex items-center justify-center gap-1.5 overflow-x-auto px-2 no-scrollbar">
          {openTabs.map((tab) => {
            const isActive = tab.id === activeNotebook.id;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all max-w-[200px] ${
                  isActive
                    ? 'bg-surface text-primary shadow-sm border border-[var(--border-subtle)] font-semibold'
                    : 'bg-dock/60 text-secondary hover:text-primary'
                }`}
              >
                <span className="truncate">{tab.title}</span>
                {openTabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="p-0.5 rounded-full hover:bg-dock text-muted hover:text-primary"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Direita: Favoritar Página, Adicionar Página, Modo Leitura, Exportar, Dark Mode */}
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => handleTogglePageFavorite(currentPage)}
            className={`p-2 rounded-xl transition-colors ${
              currentPage.isFavorite
                ? 'text-[#FF3B30] bg-red-500/10'
                : 'hover:bg-dock text-primary'
            }`}
            title="Marcar página como favorita (Bookmark)"
          >
            <Bookmark
              className={`w-4 h-4 ${
                currentPage.isFavorite ? 'fill-current' : ''
              }`}
            />
          </button>

          <button
            onClick={() => handleAddPageAfter(currentPageIndex)}
            className="p-2 rounded-xl hover:bg-dock text-primary transition-colors"
            title="Adicionar Nova Página após a atual"
          >
            <FilePlus className="w-4 h-4" />
          </button>

          <button
            onClick={() =>
              setActiveTool((prev) => (prev === 'readonly' ? 'pen' : 'readonly'))
            }
            className={`p-2 rounded-xl transition-colors ${
              activeTool === 'readonly'
                ? 'bg-accent text-white'
                : 'hover:bg-dock text-primary'
            }`}
            title={
              activeTool === 'readonly'
                ? 'Sair do Modo Somente Leitura'
                : 'Modo Somente Leitura (Oculta barra de escrita)'
            }
          >
            <BookOpenCheck className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleDeletePage(currentPage)}
            className="p-2 rounded-xl hover:bg-red-500/15 text-[#FF3B30] transition-colors"
            title={
              sortedPages.length > 1
                ? 'Excluir Página Atual'
                : 'Limpar Página Atual'
            }
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setExportMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl hover:bg-dock text-accent transition-colors"
            title="Exportar ou Excluir Caderno"
          >
            <Share className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-xl hover:bg-dock text-secondary hover:text-primary transition-colors"
            title="Alternar Modo Escuro"
          >
            {darkMode ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {/* Menu Popover de Exportação & Exclusão */}
          {exportMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setExportMenuOpen(false)}
              />
              <div
                style={{ backgroundColor: 'var(--bg-surface)' }}
                className="absolute top-11 right-0 z-50 w-64 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] py-2 text-xs"
              >
                <div className="px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-secondary">
                  Exportar & Compartilhar
                </div>
                <button
                  disabled={isExporting}
                  onClick={handleSaveToGoogleDrive}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-dock text-primary font-semibold disabled:opacity-50"
                >
                  <Cloud className="w-4 h-4 text-accent" />
                  {isExporting
                    ? 'Salvando no Drive...'
                    : 'Salvar no Drive (anotações estudos)'}
                </button>
                <button
                  disabled={isExporting}
                  onClick={handleExportFullPdf}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-dock text-primary font-medium disabled:opacity-50"
                >
                  <FileDown className="w-4 h-4 text-accent" />
                  {isExporting
                    ? 'Gerando PDF...'
                    : 'Exportar Caderno em PDF'}
                </button>
                <button
                  disabled={isExporting}
                  onClick={handleExportCurrentPagePng}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-dock text-primary font-medium disabled:opacity-50"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                  Exportar Página Atual (PNG)
                </button>
                <div className="my-1.5 border-t border-[var(--border-subtle)]" />
                <button
                  type="button"
                  onClick={() => {
                    setExportMenuOpen(false);
                    handleDeletePage(currentPage);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-red-500/10 text-[#FF3B30] font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  {sortedPages.length > 1
                    ? 'Excluir Página Atual'
                    : 'Limpar Tudo da Página'}
                </button>
                {onDeleteNotebook && (
                  <button
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false);
                      onDeleteNotebook(activeNotebook);
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-red-500/15 text-[#FF3B30] font-bold"
                  >
                    <Trash2 className="w-4 h-4" />
                    Apagar Este Caderno
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Barra de Busca Intra-Documento (Text Boxes & Texto de PDF) */}
      {docSearchOpen && (
        <div className="bg-surface border-b border-[var(--border-subtle)] px-4 py-2 flex items-center justify-between gap-3 z-30 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-accent" />
            <input
              type="text"
              value={docSearchQuery}
              onChange={(e) => setDocSearchQuery(e.target.value)}
              placeholder="Buscar palavra nas páginas deste caderno..."
              className="w-full bg-dock px-3 py-1.5 rounded-xl text-primary focus:outline-none"
              autoFocus
            />
          </div>

          {docSearchQuery.trim() && (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {sortedPages
                .filter((pg) => {
                  const q = docSearchQuery.toLowerCase();
                  const inText = pg.textBoxes.some((tb) =>
                    tb.text.toLowerCase().includes(q)
                  );
                  const inPdf = (pg.pdfTextContent || '')
                    .toLowerCase()
                    .includes(q);
                  const inOutline = (pg.outlineTitle || '')
                    .toLowerCase()
                    .includes(q);
                  return inText || inPdf || inOutline;
                })
                .map((pg) => (
                  <button
                    key={pg.id}
                    onClick={() => setCurrentPageIndex(pg.pageNumber)}
                    className={`px-2.5 py-1 rounded-full font-semibold ${
                      pg.pageNumber === currentPageIndex
                        ? 'bg-accent text-white'
                        : 'bg-dock text-primary'
                    }`}
                  >
                    Pág. {pg.pageNumber + 1}
                  </button>
                ))}
            </div>
          )}

          <button
            onClick={() => {
              setDocSearchOpen(false);
              setDocSearchQuery('');
            }}
            className="text-secondary hover:text-primary"
          >
            Fechar
          </button>
        </div>
      )}

      {/* 2. WRITING TOOLBAR (Ocultada automaticamente quando em Modo Somente Leitura) */}
      <WritingToolbar
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        penType={penType}
        onChangePenType={setPenType}
        penColorSlots={penColorSlots}
        activePenColorSlot={activePenColorSlot}
        onSelectPenColorSlot={setActivePenColorSlot}
        onUpdatePenColorSlot={(slot, color) => {
          const next = [...penColorSlots] as [string, string, string];
          next[slot] = color;
          setPenColorSlots(next);
        }}
        penSizeSlots={penSizeSlots}
        activePenSizeSlot={activePenSizeSlot}
        onSelectPenSizeSlot={setActivePenSizeSlot}
        onUpdatePenSizeSlot={(slot, sz) => {
          const next = [...penSizeSlots] as [number, number, number];
          next[slot] = sz;
          setPenSizeSlots(next);
        }}
        holdToSnapShape={holdToSnapShape}
        onToggleHoldToSnapShape={() => setHoldToSnapShape((v) => !v)}
        highlighterColorSlots={highlighterColorSlots}
        activeHighlighterColorSlot={activeHighlighterColorSlot}
        onSelectHighlighterColorSlot={setActiveHighlighterColorSlot}
        onUpdateHighlighterColorSlot={(slot, color) => {
          const next = [...highlighterColorSlots] as [string, string, string];
          next[slot] = color;
          setHighlighterColorSlots(next);
        }}
        highlighterSizeSlots={highlighterSizeSlots}
        activeHighlighterSizeSlot={activeHighlighterSizeSlot}
        onSelectHighlighterSizeSlot={setActiveHighlighterSizeSlot}
        straightLineHighlighter={straightLineHighlighter}
        onToggleStraightLineHighlighter={() =>
          setStraightLineHighlighter((v) => !v)
        }
        eraserMode={eraserMode}
        onChangeEraserMode={setEraserMode}
        eraserRadius={eraserRadius}
        onChangeEraserRadius={setEraserRadius}
        eraseHighlighterOnly={eraseHighlighterOnly}
        onToggleEraseHighlighterOnly={() => setEraseHighlighterOnly((v) => !v)}
        autoDeselectEraser={autoDeselectEraser}
        onToggleAutoDeselectEraser={() => setAutoDeselectEraser((v) => !v)}
        onClearPage={() =>
          handleCommitPageUpdate(
            (prev) => ({
              ...prev,
              strokes: [],
              shapes: [],
              textBoxes: [],
              images: [],
              updatedAt: Date.now(),
            }),
            true
          )
        }
        activeShapeKind={activeShapeKind}
        onChangeShapeKind={setActiveShapeKind}
        fillShapes={fillShapes}
        onToggleFillShapes={() => setFillShapes((v) => !v)}
        lassoFilters={lassoFilters}
        onToggleLassoFilter={(key) =>
          setLassoFilters((prev) => ({ ...prev, [key]: !prev[key] }))
        }
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onTriggerUploadImage={() => imageInputRef.current?.click()}
        onOpenStickersPopover={() => setStickersModalOpen(true)}
        zoomWindowOpen={zoomWindowOpen}
        onToggleZoomWindow={() => setZoomWindowOpen((v) => !v)}
        stylusOnlyMode={stylusOnlyMode}
        onToggleStylusOnlyMode={handleToggleStylusOnlyMode}
      />

      {/* Toast de feedback do Modo Só Caneta */}
      {modeToast && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl border border-white/15 pointer-events-none animate-fade-in">
          {modeToast}
        </div>
      )}

      {/* 3. WORKSPACE CANVAS DE 4 CAMADAS */}
      <PageCanvas
        page={currentPage}
        pageSize={activeNotebook.pageSize}
        activeTool={activeTool}
        penType={penType}
        penColor={penColorSlots[activePenColorSlot]}
        penSize={penSizeSlots[activePenSizeSlot]}
        holdToSnapShape={holdToSnapShape}
        highlighterColor={highlighterColorSlots[activeHighlighterColorSlot]}
        highlighterSize={highlighterSizeSlots[activeHighlighterSizeSlot]}
        straightLineHighlighter={straightLineHighlighter}
        eraserMode={eraserMode}
        eraserRadius={eraserRadius}
        eraseHighlighterOnly={eraseHighlighterOnly}
        autoDeselectEraser={autoDeselectEraser}
        onAutoSwitchToPen={() => setActiveTool('pen')}
        activeShapeKind={activeShapeKind}
        fillShapes={fillShapes}
        lassoFilters={lassoFilters}
        stylusOnlyMode={stylusOnlyMode}
        zoom={zoom}
        pan={pan}
        onChangeZoomPan={(nextZ, nextP) => {
          setZoom(nextZ);
          setPan(nextP);
        }}
        fitTrigger={fitTrigger}
        fitMode={fitMode}
        zoomWindowOpen={zoomWindowOpen}
        onCloseZoomWindow={() => setZoomWindowOpen(false)}
        pdfPageDataUrl={pdfPageDataUrl}
        searchHighlightTerm={docSearchQuery}
        autoSelectElement={autoSelectElement}
        onCommitPageUpdate={handleCommitPageUpdate}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* 4. BARRA FLUTUANTE INFERIOR: NAVEGAÇÃO DE PÁGINAS & CONTROLE DE ZOOM */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-elevated backdrop-blur-xl border border-[var(--border-subtle)] shadow-lg text-xs">
        <button
          onClick={() => setCurrentPageIndex((i) => Math.max(0, i - 1))}
          disabled={currentPageIndex === 0}
          className="p-1 rounded-full hover:bg-dock disabled:opacity-30 text-primary"
          title="Página Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setThumbnailsModalOpen(true)}
          className="px-2 font-semibold text-primary hover:text-accent"
        >
          Página {currentPageIndex + 1} de {sortedPages.length}
        </button>

        <button
          onClick={() => {
            if (currentPageIndex < sortedPages.length - 1) {
              setCurrentPageIndex(currentPageIndex + 1);
            } else {
              // Como no GoodNotes: avançar após a última página cria uma nova página com o mesmo template
              handleAddPageAfter(currentPageIndex);
            }
          }}
          className="p-1 rounded-full hover:bg-dock text-primary"
          title={
            currentPageIndex < sortedPages.length - 1
              ? 'Próxima Página'
              : 'Criar Nova Página'
          }
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="h-3.5 w-[1px] bg-[var(--border-subtle)] mx-1" />

        <button
          onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.15).toFixed(2)))}
          className="px-1.5 font-bold text-secondary hover:text-primary"
          title="Diminuir Zoom"
        >
          -
        </button>
        <button
          onClick={() => {
            setFitMode((m) => (m === 'width' ? 'page' : 'width'));
            setFitTrigger((t) => t + 1);
          }}
          className="font-semibold text-accent flex items-center gap-1 px-1"
          title="Toque para alternar entre Ajustar à Largura e Ajustar à Página Inteira"
        >
          {Math.round(zoom * 100)}%
          <RotateCcw className="w-3 h-3" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(4.0, +(z + 0.15).toFixed(2)))}
          className="px-1.5 font-bold text-secondary hover:text-primary"
          title="Aumentar Zoom"
        >
          +
        </button>
      </div>

      {/* Input oculto para Upload de Imagem */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              handleInsertImageDataUrl(reader.result, file.name);
            }
          };
          reader.readAsDataURL(file);
          e.target.value = '';
        }}
      />

      {/* Modal de Miniaturas, Favoritos e Sumário */}
      <PageThumbnailsModal
        isOpen={thumbnailsModalOpen}
        pages={sortedPages}
        activePageIndex={currentPageIndex}
        onClose={() => setThumbnailsModalOpen(false)}
        onSelectPage={(idx) => setCurrentPageIndex(idx)}
        onAddPageAfter={handleAddPageAfter}
        onDuplicatePage={handleDuplicatePage}
        onRotatePage={handleRotatePage}
        onTogglePageFavorite={handleTogglePageFavorite}
        onUpdateOutlineTitle={async (pg, outlineTitle) => {
          await db.pages.update(pg.id, { outlineTitle });
        }}
        onChangePageTemplate={async (pg, template, paperColor) => {
          await db.pages.update(pg.id, {
            template,
            paperColor,
            updatedAt: Date.now(),
          });
        }}
        onMovePageOrder={handleMovePageOrder}
        onDeletePage={handleDeletePage}
      />

      {/* Modal de Adesivos / Elementos */}
      <StickersPopover
        isOpen={stickersModalOpen}
        onClose={() => setStickersModalOpen(false)}
        onSelectSticker={(dataUrl, name, defW, defH) =>
          handleInsertImageDataUrl(dataUrl, name, defW, defH)
        }
      />
    </div>
  );
}
