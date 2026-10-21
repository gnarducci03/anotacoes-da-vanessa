'use client';

import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureSeedData } from '@/lib/db';
import { NotebookRecord } from '@/types/note';
import { LibraryView } from '@/components/library/LibraryView';
import { DocumentWorkspace } from '@/components/editor/DocumentWorkspace';
import { SearchModal } from '@/components/common/SearchModal';
import { ShortcutsModal } from '@/components/common/ShortcutsModal';
import { importPdfAsNotebook } from '@/lib/pdf-service';
import {
  exportAllDataAsBackup,
  importBackupFromFile,
} from '@/lib/backup-service';

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [requestedPageIndex, setRequestedPageIndex] = useState<number>(0);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  useEffect(() => {
    ensureSeedData();
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Atalho global Cmd/Ctrl + K para Busca
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const folders = useLiveQuery(() => db.folders.toArray(), [], []);
  const notebooks = useLiveQuery(() => db.notebooks.toArray(), [], []);
  const pages = useLiveQuery(() => db.pages.toArray(), [], []);

  const handleOpenNotebook = (
    notebook: NotebookRecord,
    initialPageIndex = 0
  ) => {
    setOpenTabIds((prev) =>
      prev.includes(notebook.id) ? prev : [...prev, notebook.id]
    );
    setActiveNotebookId(notebook.id);
    setRequestedPageIndex(initialPageIndex);
  };

  const handleCloseTab = (notebookId: string) => {
    setOpenTabIds((prev) => {
      const next = prev.filter((id) => id !== notebookId);
      if (activeNotebookId === notebookId) {
        setActiveNotebookId(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  };

  const handleImportPdfFile = async (file: File, folderId: string | null) => {
    showToast('Importando páginas do PDF...');
    try {
      const createdNb = await importPdfAsNotebook(file, folderId);
      showToast(`PDF "${createdNb.title}" importado com sucesso!`);
      handleOpenNotebook(createdNb, 0);
    } catch {
      showToast('Não foi possível importar o arquivo PDF.');
    }
  };

  const handleExportBackup = async () => {
    await exportAllDataAsBackup();
    showToast('Backup (.inknote) exportado!');
  };

  const handleImportBackup = async (file: File) => {
    try {
      const count = await importBackupFromFile(file);
      showToast(`Backup restaurado (${count} cadernos)!`);
    } catch {
      showToast('Erro ao ler arquivo de backup.');
    }
  };

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId);
  const openTabs = openTabIds
    .map((id) => notebooks.find((n) => n.id === id))
    .filter((n): n is NotebookRecord => Boolean(n && !n.isTrashed));

  const activeNotebookPages = pages.filter(
    (p) => p.notebookId === activeNotebookId
  );

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {activeNotebook ? (
        <DocumentWorkspace
          openTabs={openTabs.length > 0 ? openTabs : [activeNotebook]}
          activeNotebook={activeNotebook}
          pages={activeNotebookPages}
          initialPageIndex={requestedPageIndex}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          onSelectTab={(nb) => {
            setActiveNotebookId(nb.id);
            setRequestedPageIndex(nb.lastOpenedPageIndex || 0);
          }}
          onCloseTab={handleCloseTab}
          onBackToLibrary={() => setActiveNotebookId(null)}
        />
      ) : (
        <LibraryView
          folders={folders}
          notebooks={notebooks}
          pages={pages}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((d) => !d)}
          onOpenNotebook={handleOpenNotebook}
          onImportPdfFile={handleImportPdfFile}
          onExportBackup={handleExportBackup}
          onImportBackupFile={handleImportBackup}
          onOpenSearchModal={() => setSearchModalOpen(true)}
          onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
        />
      )}

      {/* Modal de Busca Global */}
      <SearchModal
        isOpen={searchModalOpen}
        folders={folders}
        notebooks={notebooks}
        pages={pages}
        onClose={() => setSearchModalOpen(false)}
        onOpenNotebookPage={(nb, pageIndex) =>
          handleOpenNotebook(nb, pageIndex)
        }
      />

      {/* Modal de Gestos e Atalhos */}
      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Toast Flutuante estilo iPadOS */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-primary text-surface text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-top-3">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
