'use client';

import React, { useState } from 'react';
import { FolderRecord } from '@/types/note';
import {
  Star,
  MoreHorizontal,
  Edit3,
  FolderInput,
  Trash2,
  RotateCcw,
} from 'lucide-react';

interface FolderCardProps {
  folder: FolderRecord;
  itemCount: number;
  viewMode: 'grid' | 'list';
  isSelected?: boolean;
  selectionMode?: boolean;
  onOpen: (folder: FolderRecord) => void;
  onToggleSelect?: (id: string) => void;
  onToggleFavorite: (folder: FolderRecord) => void;
  onRename: (folder: FolderRecord) => void;
  onMove: (folder: FolderRecord) => void;
  onTrashOrDelete: (folder: FolderRecord) => void;
  onDeletePermanently?: (folder: FolderRecord) => void;
  onRestore?: (folder: FolderRecord) => void;
}

export function FolderCard({
  folder,
  itemCount,
  viewMode,
  isSelected = false,
  selectionMode = false,
  onOpen,
  onToggleSelect,
  onToggleFavorite,
  onRename,
  onMove,
  onTrashOrDelete,
  onDeletePermanently,
  onRestore,
}: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(folder.id);
      return;
    }
    if (!folder.isTrashed) {
      onOpen(folder);
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleClick}
        className={`flex items-center justify-between px-4 py-3 rounded-xl bg-surface border transition-all cursor-pointer ${
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
              onChange={() => onToggleSelect?.(folder.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded-full accent-accent"
            />
          )}
          {/* Ícone vetorial de pasta iPadOS */}
          <svg className="w-10 h-8 flex-shrink-0" viewBox="0 0 64 52" fill="none">
            <path
              d="M4 10C4 6.68629 6.68629 4 10 4H24.3431C25.9345 4 27.4606 4.63214 28.5858 5.75736L31.4142 8.58579C32.5394 9.71095 34.0655 10.3431 35.6569 10.3431H54C57.3137 10.3431 60 13.0294 60 16.3431V42C60 45.3137 57.3137 48 54 48H10C6.68629 48 4 45.3137 4 42V10Z"
              fill="#62C2F9"
            />
            <path
              d="M4 17C4 14.2386 6.23858 12 9 12H55C57.7614 12 60 14.2386 60 17V42C60 45.3137 57.3137 48 54 48H10C6.68629 48 4 45.3137 4 42V17Z"
              fill="#7BD1FF"
            />
          </svg>
          <div className="min-w-0">
            <p className="font-medium text-sm text-primary truncate">{folder.name}</p>
            <p className="text-xs text-secondary">
              Pasta • {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onToggleFavorite(folder)}
            className="p-2 rounded-lg hover:bg-dock"
          >
            <Star
              className={`w-4 h-4 ${
                folder.isFavorite
                  ? 'fill-[#FF9500] text-[#FF9500]'
                  : 'text-muted'
              }`}
            />
          </button>
          <button
            onClick={() => onRename(folder)}
            className="p-2 rounded-lg hover:bg-dock text-secondary"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMove(folder)}
            className="p-2 rounded-lg hover:bg-dock text-secondary"
          >
            <FolderInput className="w-4 h-4" />
          </button>
          <button
            onClick={() => onTrashOrDelete(folder)}
            className="p-2 rounded-lg hover:bg-red-500/10 text-[#FF3B30]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex flex-col items-center select-none ${
        menuOpen ? 'z-50' : 'z-10'
      }`}
    >
      <div
        onClick={handleClick}
        className={`relative w-full aspect-[3/4] flex items-center justify-center cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-95' : 'hover:-translate-y-1'
        }`}
      >
        {/* Pasta iPadOS Grande */}
        <svg
          className="w-[88%] h-[78%] drop-shadow-md"
          viewBox="0 0 120 96"
          fill="none"
        >
          <path
            d="M6 16C6 10.4772 10.4772 6 16 6H45.0294C47.6816 6 50.2251 7.05357 52.1005 8.92893L57.8995 14.7279C59.7749 16.6033 62.3184 17.6569 64.9706 17.6569H104C109.523 17.6569 114 22.134 114 27.6569V80C114 85.5228 109.523 90 104 90H16C10.4772 90 6 85.5228 6 80V16Z"
            fill="#56B9F5"
          />
          <path
            d="M6 28C6 23.5817 9.58172 20 14 20H106C110.418 20 114 23.5817 114 28V80C114 85.5228 109.523 90 104 90H16C10.4772 90 6 85.5228 6 80V28Z"
            fill="url(#folderGrad)"
          />
          <defs>
            <linearGradient
              id="folderGrad"
              x1="60"
              y1="20"
              x2="60"
              y2="90"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#86D7FF" />
              <stop offset="1" stopColor="#58BAFA" />
            </linearGradient>
          </defs>
        </svg>

        {/* Contador de itens dentro da pasta */}
        {!folder.isTrashed && (
          <span className="absolute bottom-7 text-[11px] font-semibold text-sky-950/75 bg-white/45 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
          </span>
        )}

        {/* Botão Rápido de Excluir / Lixeira no topo esquerdo da pasta */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onTrashOrDelete(folder);
          }}
          className="absolute top-4 left-4 z-20 p-1.5 rounded-full bg-black/25 hover:bg-[#FF3B30] text-white transition-colors shadow-sm"
          title={
            folder.isTrashed
              ? 'Excluir Definitivamente'
              : 'Apagar Pasta (Mover para Lixeira)'
          }
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Estrela de favorito */}
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(folder);
          }}
          className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-black/25 hover:bg-black/45 transition-colors shadow-sm"
          title="Favoritar Pasta"
        >
          <Star
            className={`w-3.5 h-3.5 ${
              folder.isFavorite
                ? 'fill-[#FF9500] text-[#FF9500]'
                : 'text-white'
            }`}
          />
        </button>

        {folder.isTrashed && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-5 bottom-4 z-20 flex flex-col gap-1.5"
          >
            {onRestore && (
              <button
                type="button"
                onClick={() => onRestore(folder)}
                className="w-full py-1.5 rounded-lg bg-white/95 text-accent text-[11px] font-bold shadow flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Restaurar
              </button>
            )}
            <button
              type="button"
              onClick={() => onTrashOrDelete(folder)}
              className="w-full py-1.5 rounded-lg bg-[#FF3B30] text-white text-[11px] font-bold shadow flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Excluir
            </button>
          </div>
        )}

        {selectionMode && (
          <div className="absolute bottom-5 left-5">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(folder.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-5 h-5 rounded-full accent-accent"
            />
          </div>
        )}
      </div>

      <div className="w-full mt-1 px-1 flex flex-col items-center text-center relative">
        <div className="flex items-center justify-center gap-1.5 max-w-full">
          <button
            type="button"
            onClick={() => onRename(folder)}
            className="font-medium text-[13px] text-primary truncate hover:text-accent max-w-[125px]"
          >
            {folder.name}
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="p-1.5 rounded-full bg-dock/70 text-primary hover:bg-dock flex-shrink-0"
            title="Opções da pasta"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
        <span className="text-[11px] text-secondary">Pasta</span>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onPointerDown={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <div
              style={{ backgroundColor: 'var(--bg-surface)' }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-11 left-1/2 -translate-x-1/2 z-50 w-52 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] py-1.5 text-left text-xs"
            >
              {folder.isTrashed && onRestore ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRestore(folder);
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-2 hover:bg-dock text-accent font-semibold"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restaurar Pasta
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRename(folder);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-dock text-primary"
                  >
                    <Edit3 className="w-4 h-4 text-secondary" />
                    Renomear Pasta
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onToggleFavorite(folder);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-dock text-primary"
                  >
                    <Star className="w-4 h-4 text-[#FF9500]" />
                    {folder.isFavorite ? 'Remover Favorito' : 'Favoritar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onMove(folder);
                    }}
                    className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-dock text-primary"
                  >
                    <FolderInput className="w-4 h-4 text-secondary" />
                    Mover Pasta...
                  </button>
                </>
              )}
              <div className="my-1 border-t border-[var(--border-subtle)]" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onTrashOrDelete(folder);
                }}
                className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-red-500/10 text-[#FF3B30] font-semibold"
              >
                <Trash2 className="w-4 h-4" />
                {folder.isTrashed ? 'Excluir Definitivamente' : 'Mover para Lixeira'}
              </button>
              {!folder.isTrashed && onDeletePermanently && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onDeletePermanently(folder);
                  }}
                  className="w-full px-3.5 py-2 flex items-center gap-2 hover:bg-red-500/15 text-[#FF3B30] font-bold"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Definitivamente
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
