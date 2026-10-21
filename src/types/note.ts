export type PaperColor = 'cream' | 'white' | 'dark';

export type PaperTemplateId =
  | 'blank'
  | 'ruled-narrow'
  | 'ruled-wide'
  | 'cornell'
  | 'squared'
  | 'dotted'
  | 'checklist'
  | 'two-column'
  | 'weekly-planner'
  | 'music';

export type CoverStyleId =
  | 'classic-kraft'
  | 'leather-onyx'
  | 'leather-navy'
  | 'leather-forest'
  | 'leather-burgundy'
  | 'pastel-sage'
  | 'pastel-lavender'
  | 'pastel-peach'
  | 'pastel-sky'
  | 'academic-grid'
  | 'minimal-slate'
  | 'none';

export type PageSizeId = 'goodnotes' | 'a4' | 'a5' | 'letter';
export type PageOrientation = 'portrait' | 'landscape';

export type ActiveToolId =
  | 'pen'
  | 'highlighter'
  | 'eraser'
  | 'shape'
  | 'lasso'
  | 'text'
  | 'image'
  | 'laser'
  | 'readonly';

export type PenTipType = 'fountain' | 'ball' | 'brush';
export type EraserMode = 'stroke' | 'precision';
export type ShapeKind = 'line' | 'arrow' | 'rectangle' | 'ellipse' | 'triangle';

export interface FolderRecord {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  isFavorite: boolean;
  isTrashed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NotebookRecord {
  id: string;
  title: string;
  folderId: string | null;
  coverStyle: CoverStyleId;
  coverColor: string;
  defaultTemplate: PaperTemplateId;
  defaultPaperColor: PaperColor;
  pageSize: PageSizeId;
  orientation: PageOrientation;
  isFavorite: boolean;
  isTrashed: boolean;
  pdfAssetId?: string | null;
  lastOpenedPageIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  tiltX?: number;
  tiltY?: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface StrokeElement {
  id: string;
  tool: 'pen' | 'highlighter';
  penType: PenTipType;
  color: string;
  size: number;
  opacity: number;
  points: StrokePoint[];
  bbox: BoundingBox;
}

export interface ShapeElement {
  id: string;
  shapeType: ShapeKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  points?: { x: number; y: number }[];
  strokeColor: string;
  fillColor?: string | null;
  strokeWidth: number;
  opacity: number;
  rotation: number;
}

export interface TextBoxElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontFamily: 'sans' | 'serif' | 'mono' | 'handwritten';
  fontSize: number;
  color: string;
  backgroundColor: string;
  borderColor: string;
  textAlign: 'left' | 'center' | 'right';
  bold: boolean;
  italic: boolean;
  rotation: number;
}

export interface ImageElement {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label?: string;
}

export interface PageRecord {
  id: string;
  notebookId: string;
  pageNumber: number;
  template: PaperTemplateId;
  paperColor: PaperColor;
  orientation: PageOrientation;
  rotation: 0 | 90 | 180 | 270;
  isFavorite: boolean;
  outlineTitle?: string;
  pdfPageIndex?: number | null;
  pdfTextContent?: string;
  customWidth?: number;
  customHeight?: number;
  strokes: StrokeElement[];
  shapes: ShapeElement[];
  textBoxes: TextBoxElement[];
  images: ImageElement[];
  updatedAt: number;
}

export interface AssetBlobRecord {
  id: string;
  mimeType: string;
  name: string;
  data: ArrayBuffer;
  pageCount?: number;
  createdAt: number;
}
