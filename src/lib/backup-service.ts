import { db } from './db';
import { FolderRecord, NotebookRecord, PageRecord } from '@/types/note';

export interface InkNoteBackupFile {
  version: 1;
  exportedAt: number;
  app: 'InkPad Studio';
  folders: FolderRecord[];
  notebooks: NotebookRecord[];
  pages: PageRecord[];
}

export async function exportAllDataAsBackup(): Promise<void> {
  const [folders, notebooks, pages] = await Promise.all([
    db.folders.toArray(),
    db.notebooks.toArray(),
    db.pages.toArray(),
  ]);

  const payload: InkNoteBackupFile = {
    version: 1,
    exportedAt: Date.now(),
    app: 'InkPad Studio',
    folders,
    notebooks,
    pages,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `inkpad-backup-${dateStr}.inknote`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function importBackupFromFile(file: File): Promise<number> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<InkNoteBackupFile>;

  if (!Array.isArray(parsed.notebooks) || !Array.isArray(parsed.pages)) {
    throw new Error('Arquivo de backup inválido.');
  }

  await db.transaction('rw', db.folders, db.notebooks, db.pages, async () => {
    if (Array.isArray(parsed.folders)) {
      await db.folders.bulkPut(parsed.folders);
    }
    await db.notebooks.bulkPut(parsed.notebooks!);
    await db.pages.bulkPut(parsed.pages!);
  });

  return parsed.notebooks.length;
}
