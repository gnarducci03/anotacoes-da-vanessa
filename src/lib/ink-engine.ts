import getStroke from 'perfect-freehand';
import {
  BoundingBox,
  PenTipType,
  ShapeElement,
  StrokeElement,
  StrokePoint,
} from '@/types/note';
import { createId } from './db';

/**
 * Calcula a caixa delimitadora (Bounding Box) de uma lista de pontos
 */
export function computeBoundingBox(
  points: StrokePoint[],
  padding = 6
): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

/**
 * Converte o polígono retornado pelo perfect-freehand em um comando SVG path suave (quadratic curves)
 */
export function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

/**
 * Curva de sensibilidade da caneta: amplifica toques suaves da stylus (S-Pen / Apple Pencil)
 * para que a escrita saia fluida e encorpada mesmo sem fazer força na tela.
 */
export function boostStylusPressure(rawPressure: number): number {
  if (!rawPressure || rawPressure <= 0) return 0.65;
  // Curva gamma < 1 (0.45) deixa até o toque mais leve da caneta super sensível e responsivo
  const boosted = Math.pow(Math.min(1, Math.max(0.02, rawPressure)), 0.45);
  return Math.min(1, Math.max(0.46, boosted));
}

/**
 * Desenha um traço de Caneta (Fountain, Ball, Brush) ou Marca-Texto em um Canvas 2D
 * com alta sensibilidade e renderização direta em curvas quadráticas (zero alocação de Path2D string)
 */
export function drawStrokeOnCanvas(
  ctx: CanvasRenderingContext2D,
  stroke: StrokeElement
) {
  if (stroke.points.length === 0) return;

  ctx.save();

  if (stroke.tool === 'highlighter') {
    // Marca-texto estilo GoodNotes: ponta arredondada/chanfrada suave com curvas quadráticas
    ctx.globalAlpha = stroke.opacity ?? 0.42;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const pts = stroke.points;
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 1) {
      ctx.lineTo(pts[0].x + 0.5, pts[0].y);
    } else if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
    } else {
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Ponto único ou pingo de letra ("i", "j", "."): desenha círculo imediato e nítido
  if (stroke.points.length === 1) {
    const p = stroke.points[0];
    const radius = Math.max(1.4, stroke.size * 0.58);
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity ?? 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Caneta: configurações calibradas para resposta imediata na ponta da caneta (baixo streamline = zero atraso)
  const tipConfig: Record<
    PenTipType,
    {
      thinning: number;
      smoothing: number;
      streamline: number;
      simulatePressure: boolean;
      startTaper: number;
      endTaper: number;
    }
  > = {
    fountain: {
      thinning: 0.4,
      smoothing: 0.32,
      streamline: 0.14,
      simulatePressure: false,
      startTaper: 0,
      endTaper: 0,
    },
    ball: {
      thinning: 0.02,
      smoothing: 0.26,
      streamline: 0.1,
      simulatePressure: false,
      startTaper: 0,
      endTaper: 0,
    },
    brush: {
      thinning: 0.68,
      smoothing: 0.38,
      streamline: 0.18,
      simulatePressure: false,
      startTaper: 10,
      endTaper: 14,
    },
  };

  const cfg = tipConfig[stroke.penType || 'fountain'];
  const hasRealPressure = stroke.points.some(
    (p) => p.pressure !== 0.5 && p.pressure > 0
  );

  const outlinePoints = getStroke(
    stroke.points.map((p) => [
      p.x,
      p.y,
      hasRealPressure ? boostStylusPressure(p.pressure) : 0.65,
    ]),
    {
      size: stroke.size * 1.12,
      thinning: cfg.thinning,
      smoothing: cfg.smoothing,
      streamline: cfg.streamline,
      simulatePressure: !hasRealPressure || cfg.simulatePressure,
      start: { taper: cfg.startTaper, cap: true },
      end: { taper: cfg.endTaper, cap: true },
    }
  );

  if (outlinePoints.length > 0) {
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.opacity ?? 1;
    ctx.beginPath();
    const [firstX, firstY] = outlinePoints[0];
    ctx.moveTo(firstX, firstY);
    for (let i = 0; i < outlinePoints.length; i++) {
      const [x0, y0] = outlinePoints[i];
      const [x1, y1] = outlinePoints[(i + 1) % outlinePoints.length];
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Desenha uma Forma Geométrica (Linha, Seta, Retângulo, Elipse, Triângulo) no Canvas 2D
 */
export function drawShapeOnCanvas(
  ctx: CanvasRenderingContext2D,
  shape: ShapeElement
) {
  ctx.save();
  ctx.strokeStyle = shape.strokeColor;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = shape.opacity ?? 1;

  const minX = Math.min(shape.x1, shape.x2);
  const minY = Math.min(shape.y1, shape.y2);
  const w = Math.abs(shape.x2 - shape.x1);
  const h = Math.abs(shape.y2 - shape.y1);
  const cx = minX + w / 2;
  const cy = minY + h / 2;

  if (shape.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate((shape.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  switch (shape.shapeType) {
    case 'line': {
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      break;
    }

    case 'arrow': {
      const headLen = Math.max(12, shape.strokeWidth * 3.5);
      const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.lineTo(
        shape.x2 - headLen * Math.cos(angle - Math.PI / 6),
        shape.y2 - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(shape.x2, shape.y2);
      ctx.lineTo(
        shape.x2 - headLen * Math.cos(angle + Math.PI / 6),
        shape.y2 - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      break;
    }

    case 'rectangle': {
      if (shape.fillColor) {
        ctx.fillStyle = shape.fillColor;
        ctx.fillRect(minX, minY, w, h);
      }
      ctx.strokeRect(minX, minY, w, h);
      break;
    }

    case 'ellipse': {
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(2, w / 2), Math.max(2, h / 2), 0, 0, Math.PI * 2);
      if (shape.fillColor) {
        ctx.fillStyle = shape.fillColor;
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'triangle': {
      ctx.beginPath();
      ctx.moveTo(cx, minY);
      ctx.lineTo(minX + w, minY + h);
      ctx.lineTo(minX, minY + h);
      ctx.closePath();
      if (shape.fillColor) {
        ctx.fillStyle = shape.fillColor;
        ctx.fill();
      }
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

/**
 * Testa se um círculo (borracha) colide com um traço
 */
export function hitTestStroke(
  stroke: StrokeElement,
  x: number,
  y: number,
  radius: number
): boolean {
  const pad = radius + stroke.size;
  if (
    x < stroke.bbox.minX - pad ||
    x > stroke.bbox.maxX + pad ||
    y < stroke.bbox.minY - pad ||
    y > stroke.bbox.maxY + pad
  ) {
    return false;
  }

  const thresholdSq = (radius + stroke.size * 0.65) ** 2;
  for (const pt of stroke.points) {
    const dx = pt.x - x;
    const dy = pt.y - y;
    if (dx * dx + dy * dy <= thresholdSq) {
      return true;
    }
  }
  return false;
}

/**
 * Borracha de Precisão: Divide um traço removendo apenas os pontos dentro do raio da borracha
 */
export function eraseStrokePrecision(
  stroke: StrokeElement,
  x: number,
  y: number,
  radius: number
): StrokeElement[] {
  if (!hitTestStroke(stroke, x, y, radius)) {
    return [stroke];
  }

  const thresholdSq = (radius + stroke.size * 0.5) ** 2;
  const segments: StrokePoint[][] = [];
  let currentSegment: StrokePoint[] = [];

  for (const pt of stroke.points) {
    const dx = pt.x - x;
    const dy = pt.y - y;
    const insideEraser = dx * dx + dy * dy <= thresholdSq;

    if (insideEraser) {
      if (currentSegment.length >= 2) {
        segments.push(currentSegment);
      }
      currentSegment = [];
    } else {
      currentSegment.push(pt);
    }
  }

  if (currentSegment.length >= 2) {
    segments.push(currentSegment);
  }

  return segments.map((pts) => ({
    ...stroke,
    id: createId('strk'),
    points: pts,
    bbox: computeBoundingBox(pts, stroke.size),
  }));
}

/**
 * Algoritmo Ray-Casting para verificar se um ponto (x, y) está dentro do polígono do Laço (Lasso)
 */
export function isPointInPolygon(
  x: number,
  y: number,
  polygon: { x: number; y: number }[]
): boolean {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.00001) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Reconhecimento inteligente de Forma ("Hold to Snap Shape" do GoodNotes):
 * Analisa os pontos desenhados à mão livre e retorna uma Linha, Elipse ou Retângulo perfeito
 */
export function recognizeQuickShape(
  points: StrokePoint[],
  strokeColor: string,
  strokeWidth: number,
  withFill: boolean
): ShapeElement | null {
  if (points.length < 6) return null;

  const first = points[0];
  const last = points[points.length - 1];
  const directDist = Math.hypot(last.x - first.x, last.y - first.y);

  let pathLength = 0;
  for (let i = 1; i < points.length; i++) {
    pathLength += Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    );
  }

  if (pathLength < 30) return null;

  // 1. Se a distância direta for quase igual ao comprimento total -> Linha Reta
  if (directDist / pathLength > 0.86) {
    return {
      id: createId('shp'),
      shapeType: 'line',
      x1: first.x,
      y1: first.y,
      x2: last.x,
      y2: last.y,
      strokeColor,
      fillColor: null,
      strokeWidth,
      opacity: 1,
      rotation: 0,
    };
  }

  // 2. Se o ponto final fecha próximo ao ponto inicial -> Elipse ou Retângulo
  const bbox = computeBoundingBox(points, 0);
  const w = bbox.maxX - bbox.minX;
  const h = bbox.maxY - bbox.minY;
  if (w < 20 || h < 20) return null;

  const cx = bbox.minX + w / 2;
  const cy = bbox.minY + h / 2;
  const rx = w / 2;
  const ry = h / 2;

  // Mede o erro médio em relação a uma elipse ideal inscrita na bbox
  let ellipseError = 0;
  for (const p of points) {
    const norm = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
    ellipseError += Math.abs(norm - 1);
  }
  ellipseError /= points.length;

  const shapeType = ellipseError < 0.22 ? 'ellipse' : 'rectangle';

  return {
    id: createId('shp'),
    shapeType,
    x1: bbox.minX,
    y1: bbox.minY,
    x2: bbox.maxX,
    y2: bbox.maxY,
    strokeColor,
    fillColor: withFill ? `${strokeColor}1F` : null,
    strokeWidth,
    opacity: 1,
    rotation: 0,
  };
}
