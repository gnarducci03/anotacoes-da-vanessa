'use client';

import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface StickerItem {
  id: string;
  name: string;
  category: string;
  svgDataUrl: string;
  defaultWidth: number;
  defaultHeight: number;
}

function makeSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export const BUILTIN_STICKERS: StickerItem[] = [
  {
    id: 'sticky-yellow',
    name: 'Post-it Amarelo',
    category: 'Notas',
    defaultWidth: 230,
    defaultHeight: 210,
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" preserveAspectRatio="none">
        <rect x="6" y="10" width="208" height="204" rx="10" fill="#FEF08A" stroke="#FACC15" stroke-width="2"/>
        <rect x="75" y="2" width="70" height="18" rx="4" fill="#FDE047" opacity="0.9"/>
        <line x1="24" y1="68" x2="196" y2="68" stroke="#EAB308" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.55"/>
        <line x1="24" y1="108" x2="196" y2="108" stroke="#EAB308" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.55"/>
        <line x1="24" y1="148" x2="196" y2="148" stroke="#EAB308" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.55"/>
        <line x1="24" y1="188" x2="196" y2="188" stroke="#EAB308" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.55"/>
      </svg>
    `),
  },
  {
    id: 'sticky-pink',
    name: 'Post-it Rosa',
    category: 'Notas',
    defaultWidth: 230,
    defaultHeight: 210,
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" preserveAspectRatio="none">
        <rect x="6" y="10" width="208" height="204" rx="10" fill="#FBCFE8" stroke="#F472B6" stroke-width="2"/>
        <rect x="75" y="2" width="70" height="18" rx="4" fill="#F9A8D4" opacity="0.9"/>
        <line x1="24" y1="68" x2="196" y2="68" stroke="#EC4899" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
        <line x1="24" y1="108" x2="196" y2="108" stroke="#EC4899" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
        <line x1="24" y1="148" x2="196" y2="148" stroke="#EC4899" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
      </svg>
    `),
  },
  {
    id: 'sticky-blue',
    name: 'Post-it Azul',
    category: 'Notas',
    defaultWidth: 230,
    defaultHeight: 210,
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" preserveAspectRatio="none">
        <rect x="6" y="10" width="208" height="204" rx="10" fill="#BAE6FD" stroke="#38BDF8" stroke-width="2"/>
        <rect x="75" y="2" width="70" height="18" rx="4" fill="#7DD3FC" opacity="0.9"/>
        <line x1="24" y1="68" x2="196" y2="68" stroke="#0284C7" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
        <line x1="24" y1="108" x2="196" y2="108" stroke="#0284C7" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
        <line x1="24" y1="148" x2="196" y2="148" stroke="#0284C7" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
      </svg>
    `),
  },
  {
    id: 'sticky-green',
    name: 'Post-it Verde Menta',
    category: 'Notas',
    defaultWidth: 230,
    defaultHeight: 210,
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220" preserveAspectRatio="none">
        <rect x="6" y="10" width="208" height="204" rx="10" fill="#BBF7D0" stroke="#4ADE80" stroke-width="2"/>
        <rect x="75" y="2" width="70" height="18" rx="4" fill="#86EFAC" opacity="0.9"/>
        <line x1="24" y1="68" x2="196" y2="68" stroke="#16A34A" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
        <line x1="24" y1="108" x2="196" y2="108" stroke="#16A34A" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
        <line x1="24" y1="148" x2="196" y2="148" stroke="#16A34A" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.35"/>
      </svg>
    `),
  },
  {
    id: 'badge-exam',
    name: 'Cai na Prova!',
    category: 'Estudo',
    defaultWidth: 210,
    defaultHeight: 74,
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="86" viewBox="0 0 240 86" preserveAspectRatio="none">
        <rect x="4" y="6" width="232" height="74" rx="22" fill="#FEE2E2" stroke="#EF4444" stroke-width="3" />
        <rect x="14" y="14" width="212" height="24" rx="10" fill="#EF4444" />
        <text x="120" y="31" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="13">★ CAI NA PROVA!</text>
      </svg>
    `),
  },
  {
    id: 'badge-important',
    name: 'Importante',
    category: 'Estudo',
    defaultWidth: 210,
    defaultHeight: 74,
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="86" viewBox="0 0 240 86" preserveAspectRatio="none">
        <rect x="4" y="6" width="232" height="74" rx="18" fill="#DBEAFE" stroke="#007AFF" stroke-width="3" />
        <rect x="14" y="14" width="212" height="24" rx="8" fill="#007AFF" />
        <text x="120" y="31" text-anchor="middle" fill="#FFFFFF" font-family="sans-serif" font-weight="800" font-size="13">! IMPORTANTE</text>
      </svg>
    `),
  },
  {
    id: 'washi-sage',
    name: 'Fita Washi Verde',
    category: 'Fitas',
    defaultWidth: 220,
    defaultHeight: 54,
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="260" height="60" viewBox="0 0 260 60" preserveAspectRatio="none">
        <polygon points="8,6 252,6 246,54 14,54" fill="#86EFAC" opacity="0.85" stroke="#4ADE80" stroke-width="1.5"/>
      </svg>
    `),
  },
  {
    id: 'coord-axes',
    name: 'Plano Cartesiano X/Y',
    category: 'Exatas',
    defaultWidth: 220,
    defaultHeight: 220,
    svgDataUrl: makeSvgDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240" preserveAspectRatio="none">
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
  onSelectSticker: (
    dataUrl: string,
    name: string,
    defaultWidth?: number,
    defaultHeight?: number
  ) => void;
}

export function StickersPopover({
  isOpen,
  onClose,
  onSelectSticker,
}: StickersPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div
        style={{ backgroundColor: 'var(--bg-surface)' }}
        className="w-full max-w-lg rounded-3xl bg-surface border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
      >
        <div className="px-5 py-3.5 bg-dock border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF9500]" />
            <h3 className="text-sm font-bold text-primary">
              Post-its, Adesivos & Elementos (Permite digitar ou escrever por cima!)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-h-[68vh] overflow-y-auto">
          {BUILTIN_STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              onClick={() => {
                onSelectSticker(
                  sticker.svgDataUrl,
                  sticker.name,
                  sticker.defaultWidth,
                  sticker.defaultHeight
                );
                onClose();
              }}
              className="p-3 rounded-2xl bg-app hover:bg-dock border border-[var(--border-subtle)] hover:border-accent flex flex-col items-center gap-2 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sticker.svgDataUrl}
                alt={sticker.name}
                className="w-24 h-18 object-contain"
              />
              <span className="text-xs font-semibold text-primary text-center">
                {sticker.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
