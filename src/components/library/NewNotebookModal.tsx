'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  CoverStyleId,
  PageOrientation,
  PageSizeId,
  PaperColor,
  PaperTemplateId,
} from '@/types/note';
import {
  COVER_PRESETS,
  PAPER_COLOR_THEMES,
  PAPER_TEMPLATES,
  renderPaperTemplate,
} from '@/lib/paper-templates';
import { BookOpen, FileText, Smartphone, Monitor, Check } from 'lucide-react';

interface NewNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: {
    title: string;
    coverStyle: CoverStyleId;
    coverColor: string;
    defaultTemplate: PaperTemplateId;
    defaultPaperColor: PaperColor;
    pageSize: PageSizeId;
    orientation: PageOrientation;
  }) => void;
}

function PaperMiniPreview({
  template,
  paperColor,
  selected,
  onSelect,
  name,
}: {
  template: PaperTemplateId;
  paperColor: PaperColor;
  selected: boolean;
  onSelect: () => void;
  name: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(150 / 768, 195 / 994);
    renderPaperTemplate(ctx, 768, 994, template, paperColor);
    ctx.restore();
  }, [template, paperColor]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col items-center gap-1.5 text-center focus:outline-none"
    >
      <div
        className={`relative rounded-xl overflow-hidden border-2 transition-all shadow-sm ${
          selected
            ? 'border-accent ring-2 ring-accent/30 scale-[1.02]'
            : 'border-[var(--border-subtle)] group-hover:border-accent/50'
        }`}
      >
        <canvas ref={canvasRef} width={150} height={195} className="block w-28 h-36" />
        {selected && (
          <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow">
            <Check className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <span
        className={`text-xs font-medium ${
          selected ? 'text-accent font-semibold' : 'text-primary'
        }`}
      >
        {name}
      </span>
    </button>
  );
}

export function NewNotebookModal({
  isOpen,
  onClose,
  onCreate,
}: NewNotebookModalProps) {
  const [activeTab, setActiveTab] = useState<'paper' | 'cover'>('paper');
  const [title, setTitle] = useState('Caderno Sem Título');
  const [coverStyle, setCoverStyle] = useState<CoverStyleId>('classic-kraft');
  const [template, setTemplate] = useState<PaperTemplateId>('ruled-narrow');
  const [paperColor, setPaperColor] = useState<PaperColor>('cream');
  const [pageSize, setPageSize] = useState<PageSizeId>('goodnotes');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');

  if (!isOpen) return null;

  const selectedCover =
    COVER_PRESETS.find((c) => c.id === coverStyle) || COVER_PRESETS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      title: title.trim() || 'Caderno Sem Título',
      coverStyle,
      coverColor: selectedCover.primaryColor,
      defaultTemplate: template,
      defaultPaperColor: paperColor,
      pageSize,
      orientation,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-surface border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
      >
        {/* Top Header estilo iPadOS Sheet */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-elevated">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-accent hover:opacity-80 px-2 py-1"
          >
            Cancelar
          </button>
          <h2 className="text-base font-semibold text-primary">Novo Caderno</h2>
          <button
            type="submit"
            className="px-4 py-1.5 rounded-full bg-accent text-white text-sm font-semibold shadow-sm hover:opacity-95 transition-opacity"
          >
            Criar
          </button>
        </div>

        {/* Barra de Título + Seletor de Abas (Capa / Papel) */}
        <div className="px-6 py-4 bg-app/60 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-secondary mb-1">
              Título do Caderno
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Cálculo I, Reunião de Produto..."
              className="w-full px-3.5 py-2 rounded-xl bg-surface border border-[var(--border-subtle)] text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              autoFocus
            />
          </div>

          <div className="flex items-center bg-dock p-1 rounded-xl self-end sm:self-center">
            <button
              type="button"
              onClick={() => setActiveTab('cover')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'cover'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Capa ({selectedCover.name})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paper')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'paper'
                  ? 'bg-surface text-accent shadow-sm'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              <FileText className="w-4 h-4" />
              Papel ({PAPER_TEMPLATES.find((t) => t.id === template)?.name})
            </button>
          </div>
        </div>

        {/* Filtros de Tamanho, Cor do Papel e Orientação */}
        <div className="px-6 py-3 bg-surface border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Tamanho */}
          <div className="flex items-center gap-2">
            <span className="text-secondary font-medium">Tamanho:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSizeId)}
              className="px-2.5 py-1.5 rounded-lg bg-dock text-primary font-medium focus:outline-none"
            >
              <option value="goodnotes">GoodNotes Padrão (iPad)</option>
              <option value="a4">ISO A4</option>
              <option value="a5">ISO A5</option>
              <option value="letter">US Letter (Carta)</option>
            </select>
          </div>

          {/* Cor do Papel */}
          <div className="flex items-center gap-2">
            <span className="text-secondary font-medium">Cor do Papel:</span>
            <div className="flex items-center gap-1.5 bg-dock p-1 rounded-lg">
              {(['cream', 'white', 'dark'] as PaperColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPaperColor(c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                    paperColor === c
                      ? 'bg-surface text-primary font-semibold shadow-sm'
                      : 'text-secondary'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/20"
                    style={{ backgroundColor: PAPER_COLOR_THEMES[c].bg }}
                  />
                  {c === 'cream' ? 'Amarelo' : c === 'white' ? 'Branco' : 'Escuro'}
                </button>
              ))}
            </div>
          </div>

          {/* Orientação */}
          <div className="flex items-center gap-1 bg-dock p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setOrientation('portrait')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${
                orientation === 'portrait'
                  ? 'bg-surface text-accent font-semibold shadow-sm'
                  : 'text-secondary'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Retrato
            </button>
            <button
              type="button"
              onClick={() => setOrientation('landscape')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md ${
                orientation === 'landscape'
                  ? 'bg-surface text-accent font-semibold shadow-sm'
                  : 'text-secondary'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Paisagem
            </button>
          </div>
        </div>

        {/* Grade de Seleção */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'paper' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-5 justify-items-center">
              {PAPER_TEMPLATES.map((item) => (
                <PaperMiniPreview
                  key={item.id}
                  template={item.id}
                  paperColor={paperColor}
                  selected={template === item.id}
                  onSelect={() => setTemplate(item.id)}
                  name={item.name}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-5 justify-items-center">
              {COVER_PRESETS.map((cover) => {
                const isSelected = coverStyle === cover.id;
                return (
                  <button
                    key={cover.id}
                    type="button"
                    onClick={() => setCoverStyle(cover.id)}
                    className="group flex flex-col items-center gap-1.5 text-center focus:outline-none"
                  >
                    <div
                      className={`relative w-28 h-36 rounded-r-xl rounded-l-[4px] overflow-hidden transition-all shadow-md ${
                        isSelected
                          ? 'ring-3 ring-accent scale-105'
                          : 'group-hover:scale-102'
                      }`}
                      style={{ backgroundColor: cover.primaryColor }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 w-3"
                        style={{ backgroundColor: cover.spineColor }}
                      />
                      <div className="absolute left-5 right-2.5 top-4 h-7 rounded bg-white/85 px-1.5 py-1 text-left">
                        <div className="h-1.5 w-12 rounded bg-neutral-700/70 mb-1" />
                        <div className="h-1 w-8 rounded bg-neutral-500/50" />
                      </div>
                      {isSelected && (
                        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center shadow">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? 'text-accent font-semibold' : 'text-primary'
                      }`}
                    >
                      {cover.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
