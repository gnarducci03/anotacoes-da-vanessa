'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  PageRecord,
  PaperColor,
  PaperTemplateId,
} from '@/types/note';
import {
  PAPER_COLOR_THEMES,
  PAPER_TEMPLATES,
  renderPaperTemplate,
} from '@/lib/paper-templates';
import { drawShapeOnCanvas, drawStrokeOnCanvas } from '@/lib/ink-engine';
import {
  X,
  Plus,
  Bookmark,
  Copy,
  Trash2,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  FileText,
} from 'lucide-react';

interface PageThumbnailsModalProps {
  isOpen: boolean;
  pages: PageRecord[];
  activePageIndex: number;
  onClose: () => void;
  onSelectPage: (index: number) => void;
  onAddPageAfter: (
    index: number,
    template?: PaperTemplateId,
    paperColor?: PaperColor
  ) => void;
  onDuplicatePage: (page: PageRecord) => void;
  onRotatePage: (page: PageRecord) => void;
  onTogglePageFavorite: (page: PageRecord) => void;
  onUpdateOutlineTitle: (page: PageRecord, outlineTitle: string) => void;
  onChangePageTemplate: (
    page: PageRecord,
    template: PaperTemplateId,
    paperColor: PaperColor
  ) => void;
  onMovePageOrder: (pageIndex: number, direction: 'left' | 'right') => void;
  onDeletePage: (page: PageRecord) => void;
}

function PageThumbnailCanvas({ page }: { page: PageRecord }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(canvas.width / 768, canvas.height / 994);

    renderPaperTemplate(ctx, 768, 994, page.template, page.paperColor);

    // Marca-texto abaixo
    for (const s of page.strokes) {
      if (s.tool === 'highlighter') drawStrokeOnCanvas(ctx, s);
    }
    // Formas
    for (const sh of page.shapes) {
      drawShapeOnCanvas(ctx, sh);
    }
    // Caneta acima
    for (const s of page.strokes) {
      if (s.tool === 'pen') drawStrokeOnCanvas(ctx, s);
    }

    ctx.restore();
  }, [page]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={233}
      className="w-full h-full object-contain block"
    />
  );
}

export function PageThumbnailsModal({
  isOpen,
  pages,
  activePageIndex,
  onClose,
  onSelectPage,
  onAddPageAfter,
  onDuplicatePage,
  onRotatePage,
  onTogglePageFavorite,
  onUpdateOutlineTitle,
  onChangePageTemplate,
  onMovePageOrder,
  onDeletePage,
}: PageThumbnailsModalProps) {
  const [tab, setTab] = useState<'thumbnails' | 'favorites' | 'outline'>(
    'thumbnails'
  );
  const [editingTemplatePage, setEditingTemplatePage] =
    useState<PageRecord | null>(null);

  if (!isOpen) return null;

  const displayedPages =
    tab === 'favorites' ? pages.filter((p) => p.isFavorite) : pages;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-5xl h-[86vh] rounded-3xl bg-app border border-[var(--border-subtle)] shadow-2xl flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="px-6 py-4 bg-elevated border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center bg-dock p-1 rounded-xl">
            <button
              onClick={() => setTab('thumbnails')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'thumbnails'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Miniaturas ({pages.length})
            </button>
            <button
              onClick={() => setTab('favorites')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'favorites'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Favoritos ({pages.filter((p) => p.isFavorite).length})
            </button>
            <button
              onClick={() => setTab('outline')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'outline'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              Sumário (Outline)
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-semibold flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Fechar
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'outline' ? (
            <div className="max-w-2xl mx-auto space-y-2">
              <p className="text-xs text-secondary mb-4">
                Defina títulos de capítulos/tópicos para navegar rapidamente pelo caderno:
              </p>
              {pages.map((pg, idx) => (
                <div
                  key={pg.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-surface border border-[var(--border-subtle)]"
                >
                  <button
                    onClick={() => {
                      onSelectPage(idx);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-accent/10 text-accent font-bold text-xs"
                  >
                    Pág. {idx + 1}
                  </button>
                  <input
                    type="text"
                    value={pg.outlineTitle || ''}
                    onChange={(e) => onUpdateOutlineTitle(pg, e.target.value)}
                    placeholder="Adicionar título ao sumário desta página..."
                    className="flex-1 bg-transparent text-sm text-primary focus:outline-none border-b border-transparent focus:border-accent py-1"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {displayedPages.map((pg) => {
                const idx = pages.findIndex((p) => p.id === pg.id);
                const isCurrent = idx === activePageIndex;
                return (
                  <div
                    key={pg.id}
                    className="flex flex-col items-center group"
                  >
                    <div
                      onClick={() => {
                        onSelectPage(idx);
                        onClose();
                      }}
                      className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-surface cursor-pointer transition-all shadow-md ${
                        isCurrent
                          ? 'ring-4 ring-accent scale-[1.02]'
                          : 'hover:ring-2 hover:ring-accent/50'
                      }`}
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          transform: `rotate(${pg.rotation || 0}deg)`,
                        }}
                      >
                        <PageThumbnailCanvas page={pg} />
                      </div>

                      {/* Bandeira de Favorito estilo Bookmark do GoodNotes */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePageFavorite(pg);
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
                          pg.isFavorite
                            ? 'bg-[#FF3B30] text-white shadow'
                            : 'bg-black/25 text-white opacity-0 group-hover:opacity-100'
                        }`}
                        title="Marcar página como favorita"
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 ${
                            pg.isFavorite ? 'fill-current' : ''
                          }`}
                        />
                      </button>

                      {pg.pdfPageIndex && (
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/65 text-white text-[9px] font-bold">
                          PDF #{pg.pdfPageIndex}
                        </span>
                      )}
                    </div>

                    {/* Número da Página + Controles rápidos */}
                    <div className="mt-2 flex items-center justify-between w-full px-1">
                      <span
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-accent' : 'text-primary'
                        }`}
                      >
                        Página {idx + 1}
                      </span>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => onMovePageOrder(idx, 'left')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-dock disabled:opacity-25 text-secondary"
                          title="Mover para antes"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onMovePageOrder(idx, 'right')}
                          disabled={idx === pages.length - 1}
                          className="p-1 rounded hover:bg-dock disabled:opacity-25 text-secondary"
                          title="Mover para depois"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingTemplatePage(pg)}
                          className="p-1 rounded hover:bg-dock text-secondary"
                          title="Trocar Template da Página"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onRotatePage(pg)}
                          className="p-1 rounded hover:bg-dock text-secondary"
                          title="Rotacionar 90°"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicatePage(pg)}
                          className="p-1 rounded hover:bg-dock text-secondary"
                          title="Duplicar Página"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {pages.length > 1 && (
                          <button
                            onClick={() => onDeletePage(pg)}
                            className="p-1 rounded hover:bg-red-500/10 text-[#FF3B30]"
                            title="Excluir Página"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Card "+ Adicionar Página" no final */}
              {tab === 'thumbnails' && (
                <button
                  onClick={() => onAddPageAfter(pages.length - 1)}
                  className="aspect-[3/4] rounded-xl border-2 border-dashed border-accent/45 hover:border-accent bg-surface/50 hover:bg-accent/5 flex flex-col items-center justify-center gap-2 text-accent transition-all"
                >
                  <Plus className="w-7 h-7" />
                  <span className="text-xs font-semibold">Adicionar Página</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-modal para trocar o Template de uma página específica */}
      {editingTemplatePage && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-surface border border-[var(--border-subtle)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-primary">
                Alterar Papel da Página {editingTemplatePage.pageNumber + 1}
              </h4>
              <button
                onClick={() => setEditingTemplatePage(null)}
                className="text-xs text-accent font-semibold"
              >
                Concluir
              </button>
            </div>

            <div className="flex items-center gap-2">
              {(['cream', 'white', 'dark'] as PaperColor[]).map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onChangePageTemplate(
                      editingTemplatePage,
                      editingTemplatePage.template,
                      color
                    );
                    setEditingTemplatePage({
                      ...editingTemplatePage,
                      paperColor: color,
                    });
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border ${
                    editingTemplatePage.paperColor === color
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-[var(--border-subtle)] text-secondary'
                  }`}
                >
                  {PAPER_COLOR_THEMES[color].name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {PAPER_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    onChangePageTemplate(
                      editingTemplatePage,
                      tpl.id,
                      editingTemplatePage.paperColor
                    );
                    setEditingTemplatePage(null);
                  }}
                  className={`p-2.5 rounded-xl text-left text-xs border ${
                    editingTemplatePage.template === tpl.id
                      ? 'border-accent bg-accent/10 text-accent font-semibold'
                      : 'border-[var(--border-subtle)] text-primary hover:bg-dock'
                  }`}
                >
                  {tpl.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
