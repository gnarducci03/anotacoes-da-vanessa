'use client';

import React, { useState } from 'react';
import { NotebookRecord } from '@/types/note';
import { COVER_PRESETS } from '@/lib/paper-templates';
import {
  Star,
  MoreHorizontal,
  Edit3,
  FolderInput,
  Copy,
  Trash2,
  RotateCcw,
  FileText,
} from 'lucide-react';

interface NotebookCardProps {
  notebook: NotebookRecord;
  pageCount: number;
  viewMode: 'grid' | 'list';
  isSelected?: boolean;
  selectionMode?: boolean;
  onOpen: (notebook: NotebookRecord) => void;
  onToggleSelect?: (id: string) => void;
  onToggleFavorite: (notebook: NotebookRecord) => void;
  onRename: (notebook: NotebookRecord) => void;
  onMove: (notebook: NotebookRecord) => void;
  onDuplicate: (notebook: NotebookRecord) => void;
  onTrashOrDelete: (notebook: NotebookRecord) => void;
  onRestore?: (notebook: NotebookRecord) => void;
}

export function NotebookCard({
  notebook,
  pageCount,
  viewMode,
  isSelected = false,
  selectionMode = false,
  onOpen,
  onToggleSelect,
  onToggleFavorite,
  onRename,
  onMove,
  onDuplicate,
  onTrashOrDelete,
  onRestore,
}: NotebookCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const preset =
    COVER_PRESETS.find((c) => c.id === notebook.coverStyle) || COVER_PRESETS[0];

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(notebook.updatedAt));

  const handleCardClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(notebook.id);
      return;
    }
    if (!notebook.isTrashed) {
      onOpen(notebook);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className={`group relative flex items-center justify-between px-4 py-3 rounded-xl bg-surface border transition-all cursor-pointer ${
          isSelected
            ? 'border-accent ring-2 ring-accent/25'
            : 'border-[var(--border-subtle)] hover:border-accent/40'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {selectionMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(notebook.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded-full accent-accent"
            />
          )}
          <div
            className="w-9 h-12 rounded-r-md rounded-l-sm flex-shrink-0 relative overflow-hidden shadow-sm"
            style={{ backgroundColor: preset.primaryColor }}
          >
            <div
              className="absolute inset-y-0 left-0 w-2"
              style={{ backgroundColor: preset.spineColor }}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm text-primary truncate">
                {notebook.title}
              </p>
              {notebook.pdfAssetId && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-red-500/10 text-red-500">
                  PDF
                </span>
              )}
            </div>
            <p className="text-xs text-secondary">
              {pageCount} {pageCount === 1 ? 'página' : 'páginas'} • {formattedDate}
            </p>
          </div>
        </div>

        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onToggleFavorite(notebook)}
            className="p-2 rounded-lg hover:bg-dock transition-colors"
            title="Favoritar"
          >
            <Star
              className={`w-4 h-4 ${
                notebook.isFavorite
                  ? 'fill-[#FF9500] text-[#FF9500]'
                  : 'text-muted'
              }`}
            />
          </button>
          {notebook.isTrashed && onRestore && (
            <button
              onClick={() => onRestore(notebook)}
              className="p-2 rounded-lg hover:bg-dock text-accent"
              title="Restaurar"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onRename(notebook)}
            className="p-2 rounded-lg hover:bg-dock text-secondary"
            title="Renomear"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMove(notebook)}
            className="p-2 rounded-lg hover:bg-dock text-secondary"
            title="Mover"
          >
            <FolderInput className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDuplicate(notebook)}
            className="p-2 rounded-lg hover:bg-dock text-secondary"
            title="Duplicar"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => onTrashOrDelete(notebook)}
            className="p-2 rounded-lg hover:bg-red-500/10 text-[#FF3B30]"
            title={notebook.isTrashed ? 'Excluir Permanentemente' : 'Mover para Lixeira'}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col items-center select-none">
      {/* Capa realista proporção 3:4 estilo GoodNotes */}
      <div
        onClick={handleCardClick}
        className={`relative w-full aspect-[3/4] rounded-r-2xl rounded-l-[5px] cursor-pointer transition-all duration-200 overflow-hidden ${
          isSelected
            ? 'ring-4 ring-accent scale-[0.98]'
            : 'hover:-translate-y-1 hover:shadow-xl shadow-md'
        }`}
        style={{
          backgroundColor: preset.primaryColor,
          boxShadow:
            '0 8px 20px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.08), inset -2px 0 4px rgba(0,0,0,0.08)',
        }}
      >
        {/* Lombada do caderno (Spine) */}
        <div
          className="absolute inset-y-0 left-0 w-4 z-10"
          style={{
            backgroundColor: preset.spineColor,
            boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.25), 1px 0 2px rgba(255,255,255,0.15)',
          }}
        />

        {/* Sulco de encadernação */}
        <div className="absolute inset-y-0 left-4 w-[2px] bg-black/15 z-10" />

        {/* Padrão de engenharia se for academic-grid */}
        {preset.pattern === 'grid' && (
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, #2B4C7E 1px, transparent 1px), linear-gradient(to bottom, #2B4C7E 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
          />
        )}

        {/* Faixa vertical se for pastel band */}
        {preset.pattern === 'band' && (
          <div
            className="absolute inset-y-0 right-5 w-3 opacity-45"
            style={{ backgroundColor: preset.spineColor }}
          />
        )}

        {/* Etiqueta da capa */}
        <div
          className="absolute left-7 right-4 top-6 rounded-lg px-3 py-2.5 shadow-sm backdrop-blur-sm"
          style={{
            backgroundColor:
              preset.pattern === 'minimal'
                ? 'rgba(255,255,255,0.10)'
                : 'rgba(255,255,255,0.88)',
          }}
        >
          <p
            className="text-[11px] font-semibold leading-tight line-clamp-2"
            style={{
              color: preset.pattern === 'minimal' ? '#F8FAFC' : '#1C1C1E',
            }}
          >
            {notebook.title}
          </p>
          <div className="mt-1.5 h-[2px] w-8 rounded-full bg-current opacity-25" />
        </div>

        {/* Badge PDF caso seja documento importado */}
        {notebook.pdfAssetId && (
          <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-sm">
            <FileText className="w-3 h-3" />
            PDF
          </div>
        )}

        {/* Estrela de Favorito no topo direito */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(notebook);
          }}
          className={`absolute top-2 right-2 z-20 p-1.5 rounded-full transition-opacity ${
            notebook.isFavorite
              ? 'opacity-100 bg-black/25'
              : 'opacity-0 group-hover:opacity-100 bg-black/25'
          }`}
          title="Favoritar Caderno"
        >
          <Star
            className={`w-3.5 h-3.5 ${
              notebook.isFavorite
                ? 'fill-[#FF9500] text-[#FF9500]'
                : 'text-white'
            }`}
          />
        </button>

        {/* Checkbox de seleção múltipla */}
        {selectionMode && (
          <div className="absolute bottom-2.5 left-6 z-20">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(notebook.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded-full accent-accent cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Título e menu abaixo da capa (estilo GoodNotes) */}
      <div className="w-full mt-2.5 px-1 flex flex-col items-center text-center relative">
        <div className="flex items-center justify-center gap-1 max-w-full">
          <button
            onClick={() => onRename(notebook)}
            className="font-medium text-[13px] text-primary truncate hover:text-accent transition-colors max-w-[135px]"
            title="Toque para renomear"
          >
            {notebook.title}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="p-1 rounded-full text-secondary hover:bg-dock hover:text-primary transition-colors"
            title="Opções do caderno"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
        <span className="text-[11px] text-secondary">
          {formattedDate} • {pageCount} {pageCount === 1 ? 'pág' : 'págs'}
        </span>

        {/* Popover de ações do caderno */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute top-7 right-0 z-40 w-48 rounded-2xl bg-surface/95 backdrop-blur-xl shadow-2xl border border-[var(--border-subtle)] py-1.5 text-left text-xs animate-in fade-in zoom-in-95 duration-100">
              {notebook.isTrashed && onRestore ? (
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onRestore(notebook);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2.5 hover:bg-dock text-accent font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar Caderno
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRename(notebook);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-dock text-primary"
                  >
                    <Edit3 className="w-4 h-4 text-secondary" />
                    Renomear
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleFavorite(notebook);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-dock text-primary"
                  >
                    <Star className="w-4 h-4 text-[#FF9500]" />
                    {notebook.isFavorite ? 'Remover Favorito' : 'Adicionar Favorito'}
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onMove(notebook);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-dock text-primary"
                  >
                    <FolderInput className="w-4 h-4 text-secondary" />
                    Mover para Pasta...
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate(notebook);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-dock text-primary"
                  >
                    <Copy className="w-4 h-4 text-secondary" />
                    Duplicar Caderno
                  </button>
                </>
              )}
              <div className="my-1 border-t border-[var(--border-subtle)]" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onTrashOrDelete(notebook);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-red-500/10 text-[#FF3B30] font-medium"
              >
                <Trash2 className="w-4 h-4" />
                {notebook.isTrashed ? 'Excluir Definitivamente' : 'Mover para Lixeira'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
