import { db } from './db';
import { FolderRecord, NotebookRecord, PageRecord } from '@/types/note';

export interface SerializedAssetRecord {
  id: string;
  mimeType: string;
  name: string;
  base64Data: string;
  pageCount?: number;
  createdAt: number;
}

export interface InkNoteBackupFile {
  version: 2;
  exportedAt: number;
  app: 'InkPad Studio';
  folders: FolderRecord[];
  notebooks: NotebookRecord[];
  pages: PageRecord[];
  assets?: SerializedAssetRecord[];
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Exporta TODOS os dados (pastas, cadernos, páginas, traços E arquivos PDF originais)
 * em um único arquivo .inknote
 */
export async function exportAllDataAsBackup(): Promise<void> {
  const [folders, notebooks, pages, rawAssets] = await Promise.all([
    db.folders.toArray(),
    db.notebooks.toArray(),
    db.pages.toArray(),
    db.assets.toArray(),
  ]);

  const serializedAssets: SerializedAssetRecord[] = rawAssets.map((a) => ({
    id: a.id,
    mimeType: a.mimeType,
    name: a.name,
    base64Data: arrayBufferToBase64(a.data),
    pageCount: a.pageCount,
    createdAt: a.createdAt,
  }));

  const payload: InkNoteBackupFile = {
    version: 2,
    exportedAt: Date.now(),
    app: 'InkPad Studio',
    folders,
    notebooks,
    pages,
    assets: serializedAssets,
  };

  const json = JSON.stringify(payload);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `inkpad-backup-${dateStr}.inknote`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Restaura pastas, cadernos, páginas e PDFs originais a partir de um arquivo .inknote
 */
export async function importBackupFromFile(file: File): Promise<number> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<InkNoteBackupFile>;

  if (!Array.isArray(parsed.notebooks) || !Array.isArray(parsed.pages)) {
    throw new Error('Arquivo de backup inválido.');
  }

  await db.transaction(
    'rw',
    db.folders,
    db.notebooks,
    db.pages,
    db.assets,
    async () => {
      if (Array.isArray(parsed.folders)) {
        await db.folders.bulkPut(parsed.folders);
      }
      if (Array.isArray(parsed.assets)) {
        for (const item of parsed.assets) {
          await db.assets.put({
            id: item.id,
            mimeType: item.mimeType,
            name: item.name,
            data: base64ToArrayBuffer(item.base64Data),
            pageCount: item.pageCount,
            createdAt: item.createdAt,
          });
        }
      }
      await db.notebooks.bulkPut(parsed.notebooks!);
      await db.pages.bulkPut(parsed.pages!);
    }
  );

  return parsed.notebooks.length;
}
