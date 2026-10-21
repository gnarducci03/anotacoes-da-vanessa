'use client';

import React, { useState } from 'react';
import {
  ActiveToolId,
  EraserMode,
  PenTipType,
  ShapeKind,
} from '@/types/note';
import {
  Undo2,
  Redo2,
  Shapes,
  Lasso,
  Type,
  Image as ImageIcon,
  Hand,
  PenTool,
  Radio,
  Trash2,
  Check,
  ZoomIn,
  Square,
  Circle,
  Triangle,
  Minus,
  MoveUpRight,
  Sticker,
} from 'lucide-react';

export const PEN_COLOR_PALETTE = [
  '#111827', // Preto Tinta
  '#1D4ED8', // Azul Royal
  '#0284C7', // Azul Celeste
  '#DC2626', // Vermelho Carmim
  '#15803D', // Verde Floresta
  '#7E22CE', // Roxo
  '#EA580C', // Laranja
  '#854D0E', // Marrom
  '#475569', // Cinza Grafite
  '#DB2777', // Rosa
  '#0D9488', // Turquesa
  '#FFFFFF', // Branco (Papel Escuro)
];

export const HIGHLIGHTER_COLOR_PALETTE = [
  '#FACC15', // Amarelo Solar
  '#FDE047', // Amarelo Limão
  '#F472B6', // Rosa Pastel
  '#FB7185', // Rosa Coral
  '#4ADE80', // Verde Menta
  '#A3E635', // Verde Lima
  '#38BDF8', // Azul Céu
  '#2DD4BF', // Turquesa Água
  '#FB923C', // Laranja Pêssego
  '#FBBF24', // Âmbar Quente
  '#C084FC', // Lavanda
  '#818CF8', // Índigo Suave
];

interface WritingToolbarProps {
  activeTool: ActiveToolId;
  onSelectTool: (tool: ActiveToolId) => void;
  // Caneta
  penType: PenTipType;
  onChangePenType: (tip: PenTipType) => void;
  penColorSlots: [string, string, string];
  activePenColorSlot: number;
  onSelectPenColorSlot: (slotIndex: number) => void;
  onUpdatePenColorSlot: (slotIndex: number, color: string) => void;
  penSizeSlots: [number, number, number];
  activePenSizeSlot: number;
  onSelectPenSizeSlot: (slotIndex: number) => void;
  onUpdatePenSizeSlot: (slotIndex: number, size: number) => void;
  holdToSnapShape: boolean;
  onToggleHoldToSnapShape: () => void;
  // Marca-texto
  highlighterColorSlots: [string, string, string];
  activeHighlighterColorSlot: number;
  onSelectHighlighterColorSlot: (slotIndex: number) => void;
  onUpdateHighlighterColorSlot: (slotIndex: number, color: string) => void;
  highlighterSizeSlots: [number, number, number];
  activeHighlighterSizeSlot: number;
  onSelectHighlighterSizeSlot: (slotIndex: number) => void;
  straightLineHighlighter: boolean;
  onToggleStraightLineHighlighter: () => void;
  // Borracha
  eraserMode: EraserMode;
  onChangeEraserMode: (mode: EraserMode) => void;
  eraserRadius: number;
  onChangeEraserRadius: (radius: number) => void;
  eraseHighlighterOnly: boolean;
  onToggleEraseHighlighterOnly: () => void;
  autoDeselectEraser: boolean;
  onToggleAutoDeselectEraser: () => void;
  onClearPage: () => void;
  // Formas
  activeShapeKind: ShapeKind;
  onChangeShapeKind: (kind: ShapeKind) => void;
  fillShapes: boolean;
  onToggleFillShapes: () => void;
  // Laço
  lassoFilters: {
    strokes: boolean;
    shapes: boolean;
    textBoxes: boolean;
    images: boolean;
  };
  onToggleLassoFilter: (
    key: 'strokes' | 'shapes' | 'textBoxes' | 'images'
  ) => void;
  // Ações
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onTriggerUploadImage: () => void;
  onOpenStickersPopover: () => void;
  zoomWindowOpen: boolean;
  onToggleZoomWindow: () => void;
  stylusOnlyMode: boolean;
  onToggleStylusOnlyMode: () => void;
}

export function WritingToolbar({
  activeTool,
  onSelectTool,
  penType,
  onChangePenType,
  penColorSlots,
  activePenColorSlot,
  onSelectPenColorSlot,
  onUpdatePenColorSlot,
  penSizeSlots,
  activePenSizeSlot,
  onSelectPenSizeSlot,
  onUpdatePenSizeSlot,
  holdToSnapShape,
  onToggleHoldToSnapShape,
  highlighterColorSlots,
  activeHighlighterColorSlot,
  onSelectHighlighterColorSlot,
  onUpdateHighlighterColorSlot,
  highlighterSizeSlots,
  activeHighlighterSizeSlot,
  onSelectHighlighterSizeSlot,
  straightLineHighlighter,
  onToggleStraightLineHighlighter,
  eraserMode,
  onChangeEraserMode,
  eraserRadius,
  onChangeEraserRadius,
  eraseHighlighterOnly,
  onToggleEraseHighlighterOnly,
  autoDeselectEraser,
  onToggleAutoDeselectEraser,
  onClearPage,
  activeShapeKind,
  onChangeShapeKind,
  fillShapes,
  onToggleFillShapes,
  lassoFilters,
  onToggleLassoFilter,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onTriggerUploadImage,
  onOpenStickersPopover,
  zoomWindowOpen,
  onToggleZoomWindow,
  stylusOnlyMode,
  onToggleStylusOnlyMode,
}: WritingToolbarProps) {
  const [openPopover, setOpenPopover] = useState<
    'pen' | 'highlighter' | 'eraser' | 'shape' | 'lasso' | 'colorPicker' | 'sizeSlider' | null
  >(null);

  if (activeTool === 'readonly') {
    return null;
  }

  const handleToolClick = (tool: ActiveToolId) => {
    if (activeTool === tool) {
      if (
        tool === 'pen' ||
        tool === 'highlighter' ||
        tool === 'eraser' ||
        tool === 'shape' ||
        tool === 'lasso'
      ) {
        setOpenPopover((prev) => (prev === tool ? null : tool));
      }
    } else {
      onSelectTool(tool);
      setOpenPopover(null);
    }
  };

  const currentPenColor = penColorSlots[activePenColorSlot];
  const currentHighlighterColor =
    highlighterColorSlots[activeHighlighterColorSlot];

  const isHighlighter = activeTool === 'highlighter';
  const colorSlots = isHighlighter ? highlighterColorSlots : penColorSlots;
  const activeColorSlot = isHighlighter
    ? activeHighlighterColorSlot
    : activePenColorSlot;

  return (
    <div className="relative z-30 w-full bg-dock/95 backdrop-blur-xl border-b border-[var(--border-subtle)] px-3 py-1.5 flex items-center justify-between gap-2 select-none">
      {/* Esquerda: Desfazer, Refazer, Janela de Zoom e Rejeição de Palma */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-xl hover:bg-surface disabled:opacity-35 text-primary transition-colors"
          title="Desfazer (Ctrl+Z ou 2 dedos)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-xl hover:bg-surface disabled:opacity-35 text-primary transition-colors"
          title="Refazer (Ctrl+Shift+Z ou 3 dedos)"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="h-5 w-[1px] bg-[var(--border-subtle)] mx-1" />

        {/* Botão Janela de Zoom (Zoom Window estilo GoodNotes) */}
        <button
          onClick={onToggleZoomWindow}
          className={`p-2 rounded-xl transition-all flex items-center gap-1 text-xs font-medium ${
            zoomWindowOpen
              ? 'bg-accent text-white shadow-sm'
              : 'hover:bg-surface text-secondary hover:text-primary'
          }`}
          title="Janela de Zoom com Avanço Automático"
        >
          <ZoomIn className="w-4 h-4" />
          <span className="hidden lg:inline">Zoom</span>
        </button>

        {/* Toggle Stylus-Only / Palm Rejection (Proporcional e na paleta GoodNotes) */}
        <button
          onClick={onToggleStylusOnlyMode}
          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
            stylusOnlyMode
              ? 'bg-accent/15 text-accent ring-1 ring-accent/35'
              : 'hover:bg-surface text-secondary hover:text-primary'
          }`}
          title={
            stylusOnlyMode
              ? 'Modo Só Caneta Ativo: a palma da mão é bloqueada ao escrever (use 2 dedos para mover/zoom)'
              : 'Modo Dedo + Caneta: toque para bloquear a mão e escrever só com a caneta'
          }
        >
          {stylusOnlyMode ? (
            <>
              <PenTool className="w-3.5 h-3.5" />
              <span>Só Caneta</span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            </>
          ) : (
            <>
              <Hand className="w-3.5 h-3.5" />
              <span>Caneta + Toque</span>
            </>
          )}
        </button>
      </div>

      {/* Centro: Instrumentos de Escrita estilo GoodNotes */}
      <div className="flex items-center bg-surface px-2 py-1 rounded-2xl shadow-sm border border-[var(--border-subtle)] gap-1">
        {/* 1. Caneta (Fountain / Ball / Brush) */}
        <button
          onClick={() => handleToolClick('pen')}
          className={`relative px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
            activeTool === 'pen'
              ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
              : 'hover:bg-dock text-secondary hover:text-primary'
          }`}
          title="Caneta (Toque novamente para mudar ponta)"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3L6 13V20H18V13L12 3Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M12 3V11"
              stroke={currentPenColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="12" cy="11" r="1.5" fill={currentPenColor} />
          </svg>
          <span className="text-[11px] font-semibold hidden md:inline">
            {penType === 'fountain'
              ? 'Tinteiro'
              : penType === 'ball'
              ? 'Esfero'
              : 'Pincel'}
          </span>
        </button>

        {/* 2. Marca-Texto (Highlighter) */}
        <button
          onClick={() => handleToolClick('highlighter')}
          className={`relative px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
            activeTool === 'highlighter'
              ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
              : 'hover:bg-dock text-secondary hover:text-primary'
          }`}
          title="Marca-Texto (Camada inferior translúcida)"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 14L10 5L16 7L15 14H7Z"
              fill={currentHighlighterColor}
              fillOpacity="0.6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <path
              d="M6 14H16V20H6V14Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[11px] font-semibold hidden md:inline">
            Grifar
          </span>
        </button>

        {/* 3. Borracha (Eraser) */}
        <button
          onClick={() => handleToolClick('eraser')}
          className={`relative px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
            activeTool === 'eraser'
              ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
              : 'hover:bg-dock text-secondary hover:text-primary'
          }`}
          title="Borracha (Traço inteiro ou Precisão)"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path
              d="M16 4L20 8L10 18H5L3 16L16 4Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M12 8L16 12"
              stroke="#F472B6"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-[11px] font-semibold hidden md:inline">
            {eraserMode === 'stroke' ? 'Traço' : 'Precisão'}
          </span>
        </button>

        {/* 4. Formas Geométricas (Shapes) */}
        <button
          onClick={() => handleToolClick('shape')}
          className={`relative px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
            activeTool === 'shape'
              ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
              : 'hover:bg-dock text-secondary hover:text-primary'
          }`}
          title="Formas Geométricas"
        >
          <Shapes className="w-4 h-4" />
          <span className="text-[11px] font-semibold hidden md:inline">
            Formas
          </span>
        </button>

        {/* 5. Laço (Lasso Tool) */}
        <button
          onClick={() => handleToolClick('lasso')}
          className={`relative px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
            activeTool === 'lasso'
              ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
              : 'hover:bg-dock text-secondary hover:text-primary'
          }`}
          title="Laço de Seleção (Mover, Redimensionar, Colorir)"
        >
          <Lasso className="w-4 h-4" />
          <span className="text-[11px] font-semibold hidden md:inline">
            Laço
          </span>
        </button>

        {/* 6. Elementos / Stickers (Estrela GoodNotes) */}
        <button
          onClick={onOpenStickersPopover}
          className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-dock text-secondary hover:text-primary transition-all"
          title="Adesivos e Elementos de Estudo"
        >
          <Sticker className="w-4 h-4 text-[#FF9500]" />
        </button>

        {/* 7. Caixa de Texto */}
        <button
          onClick={() => handleToolClick('text')}
          className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
            activeTool === 'text'
              ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
              : 'hover:bg-dock text-secondary hover:text-primary'
          }`}
          title="Caixa de Texto (Toque na página para digitar)"
        >
          <Type className="w-4 h-4" />
        </button>

        {/* 8. Inserir Imagem */}
        <button
          onClick={() => {
            onSelectTool('image');
            onTriggerUploadImage();
          }}
          className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
            activeTool === 'image'
              ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
              : 'hover:bg-dock text-secondary hover:text-primary'
          }`}
          title="Inserir Imagem"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        {/* 9. Apontador Laser */}
        <button
          onClick={() => handleToolClick('laser')}
          className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all ${
            activeTool === 'laser'
              ? 'bg-red-500/15 text-[#FF3B30] ring-1 ring-red-500/40'
              : 'hover:bg-dock text-secondary hover:text-primary'
          }`}
          title="Apontador Laser de Apresentação"
        >
          <Radio className="w-4 h-4" />
        </button>
      </div>

      {/* Direita: Slots de Cores + Paleta Completa + Espessura (Contextuais da Caneta/Marca-Texto/Formas) */}
      <div className="flex items-center gap-2.5">
        {(activeTool === 'pen' ||
          activeTool === 'highlighter' ||
          activeTool === 'shape' ||
          activeTool === 'text') && (
          <>
            {/* Slots de Cores + Botão Paleta de 12 Cores */}
            <div className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-full border border-[var(--border-subtle)] shadow-xs">
              {colorSlots.map((color, idx) => {
                const isSelected = activeColorSlot === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isSelected) {
                        setOpenPopover((prev) =>
                          prev === 'colorPicker' ? null : 'colorPicker'
                        );
                      } else if (isHighlighter) {
                        onSelectHighlighterColorSlot(idx);
                      } else {
                        onSelectPenColorSlot(idx);
                      }
                    }}
                    className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center border ${
                      isSelected
                        ? 'scale-110 ring-2 ring-accent border-white'
                        : 'border-black/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title="Toque para selecionar • Toque novamente para abrir todas as cores"
                  />
                );
              })}

              {/* Botão multicolorido para abrir diretamente todas as 12 opções de cores */}
              <button
                onClick={() =>
                  setOpenPopover((prev) =>
                    prev === 'colorPicker' ? null : 'colorPicker'
                  )
                }
                className="w-6 h-6 rounded-full border border-black/20 hover:scale-105 transition-transform flex items-center justify-center text-[11px] font-bold text-white shadow-inner"
                style={{
                  background:
                    'conic-gradient(from 0deg, #FACC15, #F472B6, #C084FC, #38BDF8, #4ADE80, #FB923C, #FACC15)',
                }}
                title="Escolher entre todas as 12 cores"
              />
            </div>

            {/* 3 Slots de Espessura */}
            <div className="hidden sm:flex items-center gap-1 bg-surface px-2 py-1 rounded-full border border-[var(--border-subtle)] shadow-xs">
              {(isHighlighter ? highlighterSizeSlots : penSizeSlots).map(
                (sz, idx) => {
                  const isSelected =
                    (isHighlighter
                      ? activeHighlighterSizeSlot
                      : activePenSizeSlot) === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (isSelected && !isHighlighter) {
                          setOpenPopover((prev) =>
                            prev === 'sizeSlider' ? null : 'sizeSlider'
                          );
                        } else if (isHighlighter) {
                          onSelectHighlighterSizeSlot(idx);
                        } else {
                          onSelectPenSizeSlot(idx);
                        }
                      }}
                      className={`w-7 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-accent/15 text-accent'
                          : 'hover:bg-dock text-primary'
                      }`}
                      title={`Espessura ${sz}px (Toque novamente para ajustar)`}
                    >
                      <span
                        className="rounded-full bg-current block"
                        style={{
                          width: '16px',
                          height: `${Math.min(10, Math.max(2, isHighlighter ? sz / 4 : sz))}px`,
                        }}
                      />
                    </button>
                  );
                }
              )}
            </div>
          </>
        )}

        {/* Quando a Borracha está ativa: mostra 3 tamanhos de borracha */}
        {activeTool === 'eraser' && (
          <div className="flex items-center gap-1.5 bg-surface px-2.5 py-1 rounded-full border border-[var(--border-subtle)] shadow-xs">
            {[14, 28, 52].map((rad) => (
              <button
                key={rad}
                onClick={() => onChangeEraserRadius(rad)}
                className={`w-7 h-6 rounded-full flex items-center justify-center ${
                  eraserRadius === rad
                    ? 'bg-accent/15 text-accent ring-1 ring-accent'
                    : 'text-secondary hover:bg-dock'
                }`}
                title={`Raio da borracha: ${rad}px`}
              >
                <span
                  className="rounded-full border-2 border-current block"
                  style={{
                    width: `${Math.max(8, rad / 2.6)}px`,
                    height: `${Math.max(8, rad / 2.6)}px`,
                  }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ================= POPOVERS CONTEXTUAIS SÓLIDOS ESTILO GOODNOTES ================= */}

      {/* Popover da Caneta */}
      {openPopover === 'pen' && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenPopover(null)}
          />
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-76 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] p-4 space-y-3 text-xs"
          >
            <p className="font-semibold text-secondary uppercase tracking-wider text-[10px]">
              Tipo de Ponta da Caneta
            </p>
            <div className="space-y-1.5">
              {(
                [
                  {
                    id: 'fountain',
                    name: 'Caneta Tinteiro (Fountain Pen)',
                    desc: 'Sensível à pressão e velocidade',
                  },
                  {
                    id: 'ball',
                    name: 'Caneta Esferográfica (Ball Pen)',
                    desc: 'Traço uniforme para diagramas',
                  },
                  {
                    id: 'brush',
                    name: 'Caneta Pincel (Brush Pen)',
                    desc: 'Alto contraste artístico e caligrafia',
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onChangePenType(item.id);
                    setOpenPopover(null);
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors ${
                    penType === item.id
                      ? 'bg-accent/15 text-accent font-semibold'
                      : 'hover:bg-dock text-primary'
                  }`}
                >
                  <div>
                    <p className="text-xs font-medium">{item.name}</p>
                    <p className="text-[10px] text-secondary">{item.desc}</p>
                  </div>
                  {penType === item.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              <p className="font-semibold text-secondary uppercase tracking-wider text-[10px]">
                Cores da Caneta
              </p>
              <div className="grid grid-cols-6 gap-2">
                {PEN_COLOR_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => {
                      onUpdatePenColorSlot(activePenColorSlot, hex);
                    }}
                    className={`w-7 h-7 rounded-full border transition-transform ${
                      currentPenColor === hex
                        ? 'scale-110 ring-2 ring-accent border-white'
                        : 'border-black/20 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <label className="flex items-center justify-between cursor-pointer py-1">
                <span className="text-primary font-medium">
                  Segurar para virar Forma (Snap)
                </span>
                <input
                  type="checkbox"
                  checked={holdToSnapShape}
                  onChange={onToggleHoldToSnapShape}
                  className="w-4 h-4 accent-accent"
                />
              </label>
            </div>
          </div>
        </>
      )}

      {/* Popover do Marca-Texto (Com Paleta Completa de 12 Cores + Espessuras + Linha Reta) */}
      {openPopover === 'highlighter' && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenPopover(null)}
          />
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-76 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] p-4 space-y-3.5 text-xs"
          >
            <div>
              <p className="font-semibold text-secondary uppercase tracking-wider text-[10px] mb-2">
                Cores do Marca-Texto (12 Opções)
              </p>
              <div className="grid grid-cols-6 gap-2">
                {HIGHLIGHTER_COLOR_PALETTE.map((hex) => {
                  const isCurrent = currentHighlighterColor === hex;
                  return (
                    <button
                      key={hex}
                      onClick={() => {
                        onUpdateHighlighterColorSlot(
                          activeHighlighterColorSlot,
                          hex
                        );
                        setOpenPopover(null);
                      }}
                      className={`w-8 h-8 rounded-full border transition-transform flex items-center justify-center ${
                        isCurrent
                          ? 'scale-110 ring-2 ring-accent border-white shadow-sm'
                          : 'border-black/15 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {isCurrent && (
                        <Check className="w-3.5 h-3.5 text-slate-900 stroke-[2.5]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-secondary font-medium">
                Cor Personalizada:
              </span>
              <input
                type="color"
                value={currentHighlighterColor}
                onChange={(e) =>
                  onUpdateHighlighterColorSlot(
                    activeHighlighterColorSlot,
                    e.target.value
                  )
                }
                className="w-8 h-7 rounded cursor-pointer bg-transparent"
              />
            </div>

            <div className="pt-2.5 border-t border-[var(--border-subtle)]">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-semibold text-primary">
                    Desenhar em Linha Reta
                  </p>
                  <p className="text-[10px] text-secondary">
                    Alinha grifos horizontais automaticamente
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={straightLineHighlighter}
                  onChange={onToggleStraightLineHighlighter}
                  className="w-4 h-4 accent-accent"
                />
              </label>
            </div>
          </div>
        </>
      )}

      {/* Popover da Borracha */}
      {openPopover === 'eraser' && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenPopover(null)}
          />
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-72 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] p-4 space-y-3 text-xs"
          >
            <p className="font-semibold text-secondary uppercase tracking-wider text-[10px]">
              Modo da Borracha
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onChangeEraserMode('stroke')}
                className={`p-2.5 rounded-xl border text-center font-medium ${
                  eraserMode === 'stroke'
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-[var(--border-subtle)] text-primary'
                }`}
              >
                Traço Inteiro
              </button>
              <button
                onClick={() => onChangeEraserMode('precision')}
                className={`p-2.5 rounded-xl border text-center font-medium ${
                  eraserMode === 'precision'
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-[var(--border-subtle)] text-primary'
                }`}
              >
                Precisão
              </button>
            </div>

            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-primary">Apagar Apenas Marca-Texto</span>
                <input
                  type="checkbox"
                  checked={eraseHighlighterOnly}
                  onChange={onToggleEraseHighlighterOnly}
                  className="w-4 h-4 accent-accent"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-primary">
                  Desselecionar Automaticamente
                </span>
                <input
                  type="checkbox"
                  checked={autoDeselectEraser}
                  onChange={onToggleAutoDeselectEraser}
                  className="w-4 h-4 accent-accent"
                />
              </label>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => {
                  setOpenPopover(null);
                  onClearPage();
                }}
                className="w-full py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[#FF3B30] font-semibold flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Página Inteira
              </button>
            </div>
          </div>
        </>
      )}

      {/* Popover de Formas Geométricas */}
      {openPopover === 'shape' && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenPopover(null)}
          />
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-72 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] p-4 space-y-3 text-xs"
          >
            <p className="font-semibold text-secondary uppercase tracking-wider text-[10px]">
              Tipo de Forma
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'line', icon: Minus, label: 'Linha' },
                  { id: 'arrow', icon: MoveUpRight, label: 'Seta' },
                  { id: 'rectangle', icon: Square, label: 'Retângulo' },
                  { id: 'ellipse', icon: Circle, label: 'Elipse' },
                  { id: 'triangle', icon: Triangle, label: 'Triângulo' },
                ] as const
              ).map((sh) => {
                const Icon = sh.icon;
                return (
                  <button
                    key={sh.id}
                    onClick={() => onChangeShapeKind(sh.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border ${
                      activeShapeKind === sh.id
                        ? 'border-accent bg-accent/15 text-accent font-semibold'
                        : 'border-[var(--border-subtle)] text-primary hover:bg-dock'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px]">{sh.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-primary font-medium">
                  Preenchimento de Cor Translúcido
                </span>
                <input
                  type="checkbox"
                  checked={fillShapes}
                  onChange={onToggleFillShapes}
                  className="w-4 h-4 accent-accent"
                />
              </label>
            </div>
          </div>
        </>
      )}

      {/* Popover do Laço */}
      {openPopover === 'lasso' && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenPopover(null)}
          />
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-50 w-64 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] p-4 space-y-2.5 text-xs"
          >
            <p className="font-semibold text-secondary uppercase tracking-wider text-[10px]">
              Incluir na Seleção do Laço
            </p>
            {(
              [
                { key: 'strokes', label: 'Escrita à Mão (Traços)' },
                { key: 'shapes', label: 'Formas Geométricas' },
                { key: 'textBoxes', label: 'Caixas de Texto' },
                { key: 'images', label: 'Imagens & Adesivos' },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-primary">{item.label}</span>
                <input
                  type="checkbox"
                  checked={lassoFilters[item.key]}
                  onChange={() => onToggleLassoFilter(item.key)}
                  className="w-4 h-4 accent-accent"
                />
              </label>
            ))}
          </div>
        </>
      )}

      {/* Popover Seletor de Cores do Slot Ativo */}
      {openPopover === 'colorPicker' && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenPopover(null)}
          />
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="absolute top-14 right-6 z-50 w-68 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] p-4 space-y-3 text-xs"
          >
            <p className="font-semibold text-secondary uppercase tracking-wider text-[10px]">
              {isHighlighter
                ? `Cores do Marca-Texto (Slot ${activeColorSlot + 1})`
                : `Paleta de Cores (Slot ${activeColorSlot + 1})`}
            </p>
            <div className="grid grid-cols-6 gap-2">
              {(isHighlighter
                ? HIGHLIGHTER_COLOR_PALETTE
                : PEN_COLOR_PALETTE
              ).map((hex) => (
                <button
                  key={hex}
                  onClick={() => {
                    if (isHighlighter) {
                      onUpdateHighlighterColorSlot(activeColorSlot, hex);
                    } else {
                      onUpdatePenColorSlot(activeColorSlot, hex);
                    }
                    setOpenPopover(null);
                  }}
                  className="w-8 h-8 rounded-full border border-black/20 hover:scale-110 transition-transform"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-secondary">Cor Personalizada:</span>
              <input
                type="color"
                value={colorSlots[activeColorSlot]}
                onChange={(e) => {
                  if (isHighlighter) {
                    onUpdateHighlighterColorSlot(activeColorSlot, e.target.value);
                  } else {
                    onUpdatePenColorSlot(activeColorSlot, e.target.value);
                  }
                }}
                className="w-8 h-7 rounded cursor-pointer bg-transparent"
              />
            </div>
          </div>
        </>
      )}

      {/* Popover Slider de Espessura da Caneta */}
      {openPopover === 'sizeSlider' && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpenPopover(null)}
          />
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="absolute top-14 right-4 z-50 w-60 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] p-4 space-y-2 text-xs"
          >
            <div className="flex justify-between">
              <span className="font-semibold text-secondary">
                Espessura (Slot {activePenSizeSlot + 1})
              </span>
              <span className="font-bold text-accent">
                {penSizeSlots[activePenSizeSlot]}px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={18}
              step={0.5}
              value={penSizeSlots[activePenSizeSlot]}
              onChange={(e) =>
                onUpdatePenSizeSlot(
                  activePenSizeSlot,
                  parseFloat(e.target.value)
                )
              }
              className="w-full accent-accent"
            />
          </div>
        </>
      )}
    </div>
  );
}
