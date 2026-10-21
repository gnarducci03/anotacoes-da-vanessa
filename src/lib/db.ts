import Dexie, { type EntityTable } from 'dexie';
import {
  AssetBlobRecord,
  FolderRecord,
  NotebookRecord,
  PageRecord,
} from '@/types/note';

class InkPadDatabase extends Dexie {
  folders!: EntityTable<FolderRecord, 'id'>;
  notebooks!: EntityTable<NotebookRecord, 'id'>;
  pages!: EntityTable<PageRecord, 'id'>;
  assets!: EntityTable<AssetBlobRecord, 'id'>;

  constructor() {
    super('InkPadNotesDB');
    this.version(1).stores({
      folders: 'id, parentId, name, isFavorite, isTrashed, updatedAt',
      notebooks: 'id, folderId, title, isFavorite, isTrashed, updatedAt',
      pages: 'id, notebookId, pageNumber, isFavorite, updatedAt',
      assets: 'id, createdAt',
    });
  }
}

export const db = new InkPadDatabase();

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Solicita ao navegador armazenamento persistente (evita que iPadOS/Android apaguem o IndexedDB)
 * e retorna informações de uso e status de proteção.
 */
export async function ensurePersistentStorage(): Promise<{
  persisted: boolean;
  usageBytes: number;
  quotaBytes: number;
}> {
  if (typeof window === 'undefined' || !navigator.storage) {
    return { persisted: false, usageBytes: 0, quotaBytes: 0 };
  }

  let persisted = false;
  try {
    if (navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
    }
    if (!persisted && navigator.storage.persist) {
      persisted = await navigator.storage.persist();
    }
  } catch {
    persisted = false;
  }

  let usageBytes = 0;
  let quotaBytes = 0;
  try {
    if (navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      usageBytes = est.usage || 0;
      quotaBytes = est.quota || 0;
    }
  } catch {
    // ignore
  }

  return { persisted, usageBytes, quotaBytes };
}

/**
 * Inicializa dados de exemplo APENAS no primeiro uso da vida do dispositivo
 */
export async function ensureSeedData(): Promise<void> {
  if (typeof window === 'undefined') return;
  await ensurePersistentStorage();

  const alreadySeeded = window.localStorage.getItem('inkpad_seeded_v1');
  const count = await db.notebooks.count();
  if (count > 0 || alreadySeeded === 'true') {
    window.localStorage.setItem('inkpad_seeded_v1', 'true');
    return;
  }
  window.localStorage.setItem('inkpad_seeded_v1', 'true');

  const now = Date.now();
  const folderEstudosId = createId('fld');
  const folderProjetosId = createId('fld');

  await db.folders.bulkAdd([
    {
      id: folderEstudosId,
      name: 'Faculdade & Estudos',
      parentId: null,
      color: '#5AC8FA',
      isFavorite: true,
      isTrashed: false,
      createdAt: now - 86400000 * 5,
      updatedAt: now - 3600000 * 4,
    },
    {
      id: folderProjetosId,
      name: 'Projetos & Ideias',
      parentId: null,
      color: '#5AC8FA',
      isFavorite: false,
      isTrashed: false,
      createdAt: now - 86400000 * 3,
      updatedAt: now - 3600000 * 12,
    },
  ]);

  const nbBemVindoId = createId('nb');
  const nbCalculoId = createId('nb');
  const nbPlannerId = createId('nb');

  await db.notebooks.bulkAdd([
    {
      id: nbBemVindoId,
      title: 'Guia de Boas-Vindas & Testes',
      folderId: null,
      coverStyle: 'classic-kraft',
      coverColor: '#C59B6D',
      defaultTemplate: 'cornell',
      defaultPaperColor: 'cream',
      pageSize: 'goodnotes',
      orientation: 'portrait',
      isFavorite: true,
      isTrashed: false,
      lastOpenedPageIndex: 0,
      createdAt: now - 86400000 * 2,
      updatedAt: now - 120000,
    },
    {
      id: nbCalculoId,
      title: 'Cálculo Diferencial & Integral',
      folderId: folderEstudosId,
      coverStyle: 'leather-navy',
      coverColor: '#1E3A5F',
      defaultTemplate: 'squared',
      defaultPaperColor: 'cream',
      pageSize: 'goodnotes',
      orientation: 'portrait',
      isFavorite: true,
      isTrashed: false,
      lastOpenedPageIndex: 0,
      createdAt: now - 86400000,
      updatedAt: now - 3600000,
    },
    {
      id: nbPlannerId,
      title: 'Planejamento Semanal 2026',
      folderId: null,
      coverStyle: 'pastel-sage',
      coverColor: '#B8D0C5',
      defaultTemplate: 'weekly-planner',
      defaultPaperColor: 'white',
      pageSize: 'goodnotes',
      orientation: 'portrait',
      isFavorite: false,
      isTrashed: false,
      lastOpenedPageIndex: 0,
      createdAt: now - 43200000,
      updatedAt: now - 7200000,
    },
  ]);

  await db.pages.bulkAdd([
    {
      id: createId('pg'),
      notebookId: nbBemVindoId,
      pageNumber: 0,
      template: 'cornell',
      paperColor: 'cream',
      orientation: 'portrait',
      rotation: 0,
      isFavorite: true,
      outlineTitle: 'Introdução ao InkPad Studio',
      strokes: [],
      shapes: [
        {
          id: createId('shp'),
          shapeType: 'rectangle',
          x1: 245,
          y1: 112,
          x2: 710,
          y2: 230,
          strokeColor: '#007AFF',
          fillColor: 'rgba(0, 122, 255, 0.08)',
          strokeWidth: 2,
          opacity: 1,
          rotation: 0,
        },
      ],
      textBoxes: [
        {
          id: createId('txt'),
          x: 262,
          y: 124,
          width: 430,
          height: 92,
          text: 'Bem-vindo ao seu Caderno Digital!\n• Use a Caneta Tinteiro, Esferográfica ou Pincel.\n• Segure no fim do traço para criar Formas perfeitas.\n• Importe e anote qualquer PDF.',
          fontFamily: 'sans',
          fontSize: 16,
          color: '#1E293B',
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textAlign: 'left',
          bold: false,
          italic: false,
          rotation: 0,
        },
      ],
      images: [],
      updatedAt: now,
    },
    {
      id: createId('pg'),
      notebookId: nbBemVindoId,
      pageNumber: 1,
      template: 'ruled-narrow',
      paperColor: 'cream',
      orientation: 'portrait',
      rotation: 0,
      isFavorite: false,
      outlineTitle: 'Anotações Pautadas',
      strokes: [],
      shapes: [],
      textBoxes: [],
      images: [],
      updatedAt: now,
    },
    {
      id: createId('pg'),
      notebookId: nbCalculoId,
      pageNumber: 0,
      template: 'squared',
      paperColor: 'cream',
      orientation: 'portrait',
      rotation: 0,
      isFavorite: false,
      outlineTitle: 'Aula 01 - Limites e Derivadas',
      strokes: [],
      shapes: [],
      textBoxes: [],
      images: [],
      updatedAt: now,
    },
    {
      id: createId('pg'),
      notebookId: nbPlannerId,
      pageNumber: 0,
      template: 'weekly-planner',
      paperColor: 'white',
      orientation: 'portrait',
      rotation: 0,
      isFavorite: false,
      outlineTitle: 'Semana 01',
      strokes: [],
      shapes: [],
      textBoxes: [],
      images: [],
      updatedAt: now,
    },
  ]);
}
