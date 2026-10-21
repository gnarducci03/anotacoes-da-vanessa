'use client';

import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface StickerItem {
  id: string;
  name: string;
  category: string;
  svgDataUrl: string;
}

function makeSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export const BUILTIN_STICKERS: StickerItem[] = [
  {
    id: 'sticky-yellow',
    name: 'Post-it Amarelo',
    category: 'Notas',
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
        <rect x="10" y="10" width="200" height="200" rx="8" fill="#FEF08A" stroke="#FACC15" stroke-width="2"/>
        <rect x="75" y="4" width="70" height="18" rx="3" fill="#FDE047" opacity="0.85"/>
        <line x1="30" y1="65" x2="190" y2="65" stroke="#EAB308" stroke-width="1.5" stroke-dasharray="4 4"/>
        <line x1="30" y1="105" x2="190" y2="105" stroke="#EAB308" stroke-width="1.5" stroke-dasharray="4 4"/>
        <line x1="30" y1="145" x2="190" y2="145" stroke="#EAB308" stroke-width="1.5" stroke-dasharray="4 4"/>
      </svg>
    `),
  },
  {
    id: 'sticky-pink',
    name: 'Post-it Rosa',
    category: 'Notas',
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
        <rect x="10" y="10" width="200" height="200" rx="8" fill="#FBCFE8" stroke="#F472B6" stroke-width="2"/>
        <rect x="75" y="4" width="70" height="18" rx="3" fill="#F9A8D4" opacity="0.85"/>
      </svg>
    `),
  },
  {
    id: 'badge-exam',
    name: 'Cai na Prova!',
    category: 'Estudo',
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="90" viewBox="0 0 240 90">
        <rect x="6" y="12" width="228" height="66" rx="33" fill="#EF4444" />
        <text x="120" y="53" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="22">★ CAI NA PROVA!</text>
      </svg>
    `),
  },
  {
    id: 'badge-important',
    name: 'Importante',
    category: 'Estudo',
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="90" viewBox="0 0 240 90">
        <rect x="6" y="12" width="228" height="66" rx="16" fill="#007AFF" />
        <text x="120" y="53" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="22">! IMPORTANTE</text>
      </svg>
    `),
  },
  {
    id: 'washi-sage',
    name: 'Fita Washi Verde',
    category: 'Fitas',
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="260" height="60" viewBox="0 0 260 60">
        <polygon points="10,8 250,8 244,52 16,52" fill="#86EFAC" opacity="0.82" stroke="#4ADE80" stroke-width="1.5"/>
      </svg>
    `),
  },
  {
    id: 'coord-axes',
    name: 'Plano Cartesiano X/Y',
    category: 'Exatas',
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
        <rect width="240" height="240" fill="none"/>
        <line x1="20" y1="120" x2="220" y2="120" stroke="#1E293B" stroke-width="2.5"/>
        <line x1="120" y1="220" x2="120" y2="20" stroke="#1E293B" stroke-width="2.5"/>
        <polygon points="224,120 212,114 212,126" fill="#1E293B"/>
        <polygon points="120,16 114,28 126,28" fill="#1E293B"/>
        <text x="210" y="140" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1E293B">x</text>
        <text x="132" y="32" font-family="sans-serif" font-size="16" font-weight="bold" fill="#1E293B">y</text>
      </svg>
    `),
  },
];

interface StickersPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (dataUrl: string, name: string) => void;
}

export function StickersPopover({
  isOpen,
  onClose,
  onSelectSticker,
}: StickersPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-3xl bg-surface border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 bg-elevated border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF9500]" />
            <h3 className="text-sm font-bold text-primary">
              Elementos & Adesivos (Elements)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-dock text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[65vh] overflow-y-auto">
          {BUILTIN_STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => {
                onSelectSticker(sticker.svgDataUrl, sticker.name);
                onClose();
              }}
              className="p-3 rounded-2xl bg-app hover:bg-dock border border-[var(--border-subtle)] hover:border-accent flex flex-col items-center gap-2 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sticker.svgDataUrl}
                alt={sticker.name}
                className="w-24 h-20 object-contain"
              />
              <span className="text-xs font-medium text-primary">
                {sticker.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
