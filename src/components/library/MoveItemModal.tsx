'use client';

import React from 'react';
import { FolderRecord } from '@/types/note';
import { Folder, Home, Check } from 'lucide-react';

interface MoveItemModalProps {
  isOpen: boolean;
  title: string;
  folders: FolderRecord[];
  currentParentId: string | null;
  excludeFolderId?: string;
  onClose: () => void;
  onConfirmMove: (targetFolderId: string | null) => void;
}

export function MoveItemModal({
  isOpen,
  title,
  folders,
  currentParentId,
  excludeFolderId,
  onClose,
  onConfirmMove,
}: MoveItemModalProps) {
  if (!isOpen) return null;

  const availableFolders = folders.filter(
    (f) => !f.isTrashed && f.id !== excludeFolderId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-surface border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-elevated">
          <button
            onClick={onClose}
            className="text-sm font-medium text-accent hover:opacity-80"
          >
            Cancelar
          </button>
          <h3 className="text-sm font-semibold text-primary truncate max-w-[220px]">
            Mover &ldquo;{title}&rdquo;
          </h3>
          <span className="w-12" />
        </div>

        <div className="p-3 max-h-80 overflow-y-auto space-y-1">
          <button
            onClick={() => {
              onConfirmMove(null);
              onClose();
            }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
              currentParentId === null
                ? 'bg-accent/10 text-accent font-semibold'
                : 'hover:bg-dock text-primary'
            }`}
          >
            <span className="flex items-center gap-3">
              <Home className="w-4 h-4 text-accent" />
              Documentos (Raiz)
            </span>
            {currentParentId === null && <Check className="w-4 h-4" />}
          </button>

          {availableFolders.map((folder) => {
            const isCurrent = currentParentId === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => {
                  onConfirmMove(folder.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-colors ${
                  isCurrent
                    ? 'bg-accent/10 text-accent font-semibold'
                    : 'hover:bg-dock text-primary'
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <Folder className="w-4 h-4 text-[#58BAFA] fill-[#58BAFA]" />
                  <span className="truncate">{folder.name}</span>
                </span>
                {isCurrent && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
