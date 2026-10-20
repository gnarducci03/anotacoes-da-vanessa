import { CoverStyleId, PageOrientation, PageSizeId, PaperColor, PaperTemplateId } from '@/types/note';

export interface CoverPreset {
  id: CoverStyleId;
  name: string;
  category: 'Classico' | 'Pastel' | 'Tecnico';
  primaryColor: string;
  spineColor: string;
  accentColor: string;
  textColor: string;
  pattern?: 'leather' | 'band' | 'grid' | 'minimal' | 'none';
}

export const COVER_PRESETS: CoverPreset[] = [
  {
    id: 'classic-kraft',
    name: 'Kraft Clássico',
    category: 'Classico',
    primaryColor: '#C59B6D',
    spineColor: '#3A2E25',
    accentColor: '#FBF7EC',
    textColor: '#2A211B',
    pattern: 'leather',
  },
  {
    id: 'leather-navy',
    name: 'Azul Marinho',
    category: 'Classico',
    primaryColor: '#1E3A5F',
    spineColor: '#112238',
    accentColor: '#E2E8F0',
    textColor: '#FFFFFF',
    pattern: 'leather',
  },
  {
    id: 'leather-onyx',
    name: 'Preto Ônix',
    category: 'Classico',
    primaryColor: '#262629',
    spineColor: '#141416',
    accentColor: '#D4AF37',
    textColor: '#F4F4F6',
    pattern: 'leather',
  },
  {
    id: 'leather-forest',
    name: 'Verde Floresta',
    category: 'Classico',
    primaryColor: '#234E3D',
    spineColor: '#142F24',
    accentColor: '#E6F4EA',
    textColor: '#FFFFFF',
    pattern: 'leather',
  },
  {
    id: 'leather-burgundy',
    name: 'Vinho Imperial',
    category: 'Classico',
    primaryColor: '#6B2137',
    spineColor: '#431221',
    accentColor: '#FCE7F3',
    textColor: '#FFFFFF',
    pattern: 'leather',
  },
  {
    id: 'pastel-sage',
    name: 'Sálvia Pastel',
    category: 'Pastel',
    primaryColor: '#B8D0C5',
    spineColor: '#7A9E8E',
    accentColor: '#FFFFFF',
    textColor: '#1F352B',
    pattern: 'band',
  },
  {
    id: 'pastel-lavender',
    name: 'Lavanda Suave',
    category: 'Pastel',
    primaryColor: '#D4C5EC',
    spineColor: '#9B82C6',
    accentColor: '#FFFFFF',
    textColor: '#2E1F47',
    pattern: 'band',
  },
  {
    id: 'pastel-peach',
    name: 'Pêssego Solar',
    category: 'Pastel',
    primaryColor: '#F5C7B8',
    spineColor: '#D98E76',
    accentColor: '#FFFFFF',
    textColor: '#432319',
    pattern: 'band',
  },
  {
    id: 'pastel-sky',
    name: 'Azul Gelo',
    category: 'Pastel',
    primaryColor: '#BFE0F5',
    spineColor: '#6CA8CF',
    accentColor: '#FFFFFF',
    textColor: '#17374C',
    pattern: 'band',
  },
  {
    id: 'academic-grid',
    name: 'Engenharia / Grade',
    category: 'Tecnico',
    primaryColor: '#F3EFE6',
    spineColor: '#2B4C7E',
    accentColor: '#2B4C7E',
    textColor: '#1E293B',
    pattern: 'grid',
  },
  {
    id: 'minimal-slate',
    name: 'Ardósia Minimal',
    category: 'Tecnico',
    primaryColor: '#334155',
    spineColor: '#1E293B',
    accentColor: '#38BDF8',
    textColor: '#F8FAFC',
    pattern: 'minimal',
  },
  {
    id: 'none',
    name: 'Sem Capa (1ª Página)',
    category: 'Tecnico',
    primaryColor: '#FBF7EC',
    spineColor: '#D6CEBF',
    accentColor: '#007AFF',
    textColor: '#1C1C1E',
    pattern: 'none',
  },
];

export interface PaperTemplateSpec {
  id: PaperTemplateId;
  name: string;
  category: 'Essenciais' | 'Escrita' | 'Produtividade' | 'Especial';
  description: string;
}

export const PAPER_TEMPLATES: PaperTemplateSpec[] = [
  { id: 'blank', name: 'Em Branco', category: 'Essenciais', description: 'Folha limpa para esboços e mapas mentais' },
  { id: 'ruled-narrow', name: 'Pautado Estreito', category: 'Escrita', description: 'Linhas de 7mm com margem vertical' },
  { id: 'ruled-wide', name: 'Pautado Largo', category: 'Escrita', description: 'Linhas de 9.5mm com margem vertical' },
  { id: 'cornell', name: 'Método Cornell', category: 'Escrita', description: 'Coluna de tópicos, notas e resumo no rodapé' },
  { id: 'squared', name: 'Quadriculado', category: 'Essenciais', description: 'Malha exata de 5mm para cálculo e geometria' },
  { id: 'dotted', name: 'Pontilhado', category: 'Essenciais', description: 'Pontos discretos estilo Bullet Journal' },
  { id: 'two-column', name: 'Duas Colunas', category: 'Escrita', description: 'Pautado dividido em 2 colunas simétricas' },
  { id: 'checklist', name: 'Lista de Tarefas', category: 'Produtividade', description: 'Pautas com caixas de verificação' },
  { id: 'weekly-planner', name: 'Planejador Semanal', category: 'Produtividade', description: 'Grade de 7 dias + prioridades da semana' },
  { id: 'music', name: 'Pauta Musical', category: 'Especial', description: 'Pentagramas clássicos para partituras' },
];

export const PAPER_COLOR_THEMES: Record<
  PaperColor,
  { name: string; bg: string; line: string; margin: string; header: string; text: string }
> = {
  cream: {
    name: 'Amarelo (GoodNotes)',
    bg: '#FBF7EC',
    line: '#D8CFC0',
    margin: '#E5989B',
    header: '#C5B9A5',
    text: '#5C5446',
  },
  white: {
    name: 'Branco Puro',
    bg: '#FFFFFF',
    line: '#D8E2EB',
    margin: '#F4A2A2',
    header: '#B8C7D6',
    text: '#475569',
  },
  dark: {
    name: 'Escuro Noturno',
    bg: '#1C1C21',
    line: '#32323C',
    margin: '#6E4752',
    header: '#454554',
    text: '#94A3B8',
  },
};

export function getPageDimensions(
  pageSize: PageSizeId = 'goodnotes',
  orientation: PageOrientation = 'portrait'
): { width: number; height: number } {
  const baseSizes: Record<PageSizeId, { w: number; h: number }> = {
    goodnotes: { w: 768, h: 994 }, // Proporção clássica iPad GoodNotes
    a4: { w: 794, h: 1123 },
    a5: { w: 559, h: 794 },
    letter: { w: 816, h: 1056 },
  };
  const base = baseSizes[pageSize] || baseSizes.goodnotes;
  return orientation === 'portrait'
    ? { width: base.w, height: base.h }
    : { width: base.h, height: base.w };
}

/**
 * Renderiza vetorialmente qualquer template de papel do GoodNotes em um Canvas 2D
 */
export function renderPaperTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  template: PaperTemplateId,
  paperColor: PaperColor
) {
  const palette = PAPER_COLOR_THEMES[paperColor] || PAPER_COLOR_THEMES.cream;

  ctx.save();
  // Fundo da página
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, width, height);

  const headerTop = 74;
  const bottomMargin = height - 48;

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;

  switch (template) {
    case 'blank':
      break;

    case 'ruled-narrow':
    case 'ruled-wide': {
      const spacing = template === 'ruled-narrow' ? 28 : 38;
      // Linha dupla de cabeçalho
      ctx.strokeStyle = palette.header;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, headerTop);
      ctx.lineTo(width, headerTop);
      ctx.moveTo(0, headerTop + 4);
      ctx.lineTo(width, headerTop + 4);
      ctx.stroke();

      // Linhas horizontais
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = headerTop + spacing + 4; y < bottomMargin; y += spacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Linha de margem esquerda
      ctx.strokeStyle = palette.margin;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(78, 0);
      ctx.lineTo(78, height);
      ctx.stroke();
      break;
    }

    case 'cornell': {
      const spacing = 30;
      const cueColumnX = Math.round(width * 0.28);
      const summaryTopY = Math.round(height - 175);

      // Linhas horizontais na área de notas
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = headerTop + spacing; y < summaryTopY; y += spacing) {
        ctx.moveTo(cueColumnX, y);
        ctx.lineTo(width - 28, y);
      }
      ctx.stroke();

      // Divisórias principais do Cornell (Cabeçalho, Coluna Cue, Rodapé Resumo)
      ctx.strokeStyle = palette.header;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      // Cabeçalho
      ctx.moveTo(28, headerTop);
      ctx.lineTo(width - 28, headerTop);
      // Coluna esquerda
      ctx.moveTo(cueColumnX, headerTop);
      ctx.lineTo(cueColumnX, summaryTopY);
      // Rodapé resumo
      ctx.moveTo(28, summaryTopY);
      ctx.lineTo(width - 28, summaryTopY);
      ctx.stroke();

      // Labels discretos estilo Cornell
      ctx.fillStyle = palette.text;
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
      ctx.fillText('TÓPICOS / PALAVRAS-CHAVE', 34, headerTop + 20);
      ctx.fillText('ANOTAÇÕES DA AULA', cueColumnX + 14, headerTop + 20);
      ctx.fillText('RESUMO / SÍNTESE', 34, summaryTopY + 20);
      break;
    }

    case 'squared': {
      const grid = 24;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      for (let x = grid; x < width; x += grid) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = grid; y < height; y += grid) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }

    case 'dotted': {
      const step = 24;
      ctx.fillStyle = palette.header;
      for (let x = step; x < width - 12; x += step) {
        for (let y = step; y < height - 12; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'two-column': {
      const spacing = 30;
      const midX = width / 2;
      ctx.strokeStyle = palette.header;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(28, headerTop);
      ctx.lineTo(width - 28, headerTop);
      ctx.moveTo(midX, headerTop);
      ctx.lineTo(midX, bottomMargin);
      ctx.stroke();

      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = headerTop + spacing; y < bottomMargin; y += spacing) {
        ctx.moveTo(28, y);
        ctx.lineTo(midX - 14, y);
        ctx.moveTo(midX + 14, y);
        ctx.lineTo(width - 28, y);
      }
      ctx.stroke();
      break;
    }

    case 'checklist': {
      const spacing = 34;
      ctx.strokeStyle = palette.header;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(36, headerTop);
      ctx.lineTo(width - 36, headerTop);
      ctx.stroke();

      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      for (let y = headerTop + spacing; y < bottomMargin; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(74, y);
        ctx.lineTo(width - 36, y);
        ctx.stroke();

        // Checkbox quadrado
        ctx.strokeRect(42, y - 15, 15, 15);
      }
      break;
    }

    case 'weekly-planner': {
      const pad = 32;
      const top = 72;
      const usableW = width - pad * 2;
      const usableH = height - top - 36;
      const colW = usableW / 2;
      const rowH = usableH / 4;
      const days = [
        'SEGUNDA-FEIRA',
        'TERÇA-FEIRA',
        'QUARTA-FEIRA',
        'QUINTA-FEIRA',
        'SEXTA-FEIRA',
        'SÁBADO',
        'DOMINGO',
        'PRIORIDADES & NOTAS',
      ];

      ctx.strokeStyle = palette.header;
      ctx.lineWidth = 1.3;
      ctx.fillStyle = palette.text;
      ctx.font = '600 10px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 2; c++) {
          const x = pad + c * colW;
          const y = top + r * rowH;
          ctx.strokeRect(x + 4, y + 4, colW - 8, rowH - 8);
          ctx.fillText(days[r * 2 + c], x + 14, y + 22);
        }
      }
      break;
    }

    case 'music': {
      const staffSpacing = 8;
      const groupGap = 54;
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      for (let baseY = 85; baseY < height - 80; baseY += staffSpacing * 4 + groupGap) {
        ctx.beginPath();
        for (let line = 0; line < 5; line++) {
          const y = baseY + line * staffSpacing;
          ctx.moveTo(42, y);
          ctx.lineTo(width - 42, y);
        }
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}
