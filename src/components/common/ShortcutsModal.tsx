'use client';

import React from 'react';
import { X, Hand, Keyboard, PenTool } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-3xl bg-surface border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-elevated border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-primary">
            Gestos do Tablet, Caneta Stylus & Atalhos
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-dock text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
          {/* Gestos de Toque e Caneta */}
          <div>
            <h4 className="font-bold text-accent uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-3">
              <Hand className="w-4 h-4" />
              Gestos de Toque & Stylus (Estilo GoodNotes)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-app border border-[var(--border-subtle)]">
                <p className="font-semibold text-primary">
                  Pinça com 2 Dedos
                </p>
                <p className="text-secondary mt-0.5">
                  Zoom suave de 45% até 350% na página.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-app border border-[var(--border-subtle)]">
                <p className="font-semibold text-primary">
                  Toque com 2 Dedos
                </p>
                <p className="text-secondary mt-0.5">
                  Desfazer (Undo) imediato do último traço.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-app border border-[var(--border-subtle)]">
                <p className="font-semibold text-primary">
                  Toque com 3 Dedos
                </p>
                <p className="text-secondary mt-0.5">
                  Refazer (Redo) imediato.
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-app border border-[var(--border-subtle)]">
                <p className="font-semibold text-primary">
                  Segurar no Fim do Traço (420ms)
                </p>
                <p className="text-secondary mt-0.5">
                  Transforma o risco em Linha, Elipse ou Retângulo perfeito.
                </p>
              </div>
            </div>
          </div>

          {/* Dicas da Caneta */}
          <div>
            <h4 className="font-bold text-accent uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-3">
              <PenTool className="w-4 h-4" />
              Dicas das Ferramentas
            </h4>
            <ul className="space-y-2 text-secondary list-disc pl-4">
              <li>
                <strong className="text-primary">Só Caneta (Palm Reject):</strong>{' '}
                Ative na barra superior esquerda para usar 1 dedo para mover a folha enquanto apenas a ponta da Stylus escreve.
              </li>
              <li>
                <strong className="text-primary">Toque duplo na ferramenta ativa:</strong>{' '}
                Abre o popover de opções (Ponta Tinteiro/Esfero/Pincel, Borracha de Precisão ou Apenas Marca-Texto).
              </li>
              <li>
                <strong className="text-primary">Janela de Zoom:</strong>{' '}
                Permite escrever grande no painel inferior enquanto o texto fica pequeno e alinhado na pauta.
              </li>
            </ul>
          </div>

          {/* Atalhos de Teclado */}
          <div>
            <h4 className="font-bold text-accent uppercase tracking-wider text-[11px] flex items-center gap-1.5 mb-3">
              <Keyboard className="w-4 h-4" />
              Atalhos de Teclado (Teclado Capa / Desktop)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'P', label: 'Caneta' },
                { key: 'H', label: 'Marca-Texto' },
                { key: 'E', label: 'Borracha' },
                { key: 'S', label: 'Formas' },
                { key: 'L', label: 'Laço' },
                { key: 'T', label: 'Caixa de Texto' },
                { key: 'Ctrl/⌘ + Z', label: 'Desfazer' },
                { key: 'Ctrl/⌘ + Shift + Z', label: 'Refazer' },
                { key: '← / →', label: 'Trocar Página' },
              ].map((sc) => (
                <div
                  key={sc.key}
                  className="px-3 py-2 rounded-xl bg-app flex items-center justify-between"
                >
                  <span className="text-secondary">{sc.label}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-surface border border-[var(--border-subtle)] font-mono font-bold text-primary text-[10px]">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
