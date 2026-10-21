'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { db, ensureSeedData } from '@/lib/db';
import { FolderRecord, NotebookRecord, PageRecord } from '@/types/note';
import { LibraryView } from '@/components/library/LibraryView';
import { DocumentWorkspace } from '@/components/editor/DocumentWorkspace';
import { SearchModal } from '@/components/common/SearchModal';
import { ShortcutsModal } from '@/components/common/ShortcutsModal';
import { GoogleDriveModal } from '@/components/common/GoogleDriveModal';
import { importPdfAsNotebook } from '@/lib/pdf-service';
import {
  exportAllDataAsBackup,
  importBackupFromFile,
} from '@/lib/backup-service';
import {
  getSavedGoogleUser,
  hasValidAccessToken,
  syncLocalToGoogleDrive,
} from '@/lib/google-drive-sync';

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [requestedPageIndex, setRequestedPageIndex] = useState<number>(0);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Estado de sincronização automática com o Google Drive da Vanessa
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [driveUserEmail, setDriveUserEmail] = useState<string | null>(null);
  const [driveSyncStatus, setDriveSyncStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error'
  >('idle');
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3400);
  }, []);

  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [notebooks, setNotebooks] = useState<NotebookRecord[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);

  const refreshData = useCallback(async () => {
    const [f, n, p] = await Promise.all([
      db.folders.toArray(),
      db.notebooks.toArray(),
      db.pages.toArray(),
    ]);
    setFolders(f);
    setNotebooks(n);
    setPages(p);
  }, []);

  useEffect(() => {
    ensureSeedData().then(() => {
      refreshData();
    });
    const savedUser = getSavedGoogleUser();
    if (savedUser?.email) {
      setDriveUserEmail(savedUser.email);
    }
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {});
    }
  }, [refreshData]);

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

  // Auto-Sync com debounce de 15 segundos sempre que cadernos/pastas mudam e a sessão do Google Drive está ativa
  useEffect(() => {
    if (!autoSyncEnabled || !hasValidAccessToken()) {
      return;
    }
    if (autoSyncTimerRef.current) {
      clearTimeout(autoSyncTimerRef.current);
    }
    autoSyncTimerRef.current = setTimeout(async () => {
      try {
        setDriveSyncStatus('syncing');
        await syncLocalToGoogleDrive();
        setDriveSyncStatus('synced');
      } catch {
        setDriveSyncStatus('error');
      }
    }, 15000);

    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, [folders, notebooks, pages, autoSyncEnabled]);

  const handleOpenNotebook = useCallback(
    (notebook: NotebookRecord, initialPageIndex = 0) => {
      setNotebooks((prev) =>
        prev.some((n) => n.id === notebook.id) ? prev : [...prev, notebook]
      );
      setOpenTabIds((prev) =>
        prev.includes(notebook.id) ? prev : [...prev, notebook.id]
      );
      setActiveNotebookId(notebook.id);
      setRequestedPageIndex(initialPageIndex);
    },
    []
  );

  const handleCloseTab = (notebookId: string) => {
    setOpenTabIds((prev) => {
      const next = prev.filter((id) => id !== notebookId);
      if (activeNotebookId === notebookId) {
        setActiveNotebookId(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  };

  const handleTrashActiveNotebook = async (nb: NotebookRecord) => {
    await db.notebooks.update(nb.id, {
      isTrashed: true,
      updatedAt: Date.now(),
    });
    await refreshData();
    handleCloseTab(nb.id);
    setActiveNotebookId(null);
    showToast(`Caderno "${nb.title}" movido para a Lixeira!`);
  };

  const handleImportPdfFile = async (file: File, folderId: string | null) => {
    showToast('Importando páginas do PDF...');
    try {
      const createdNb = await importPdfAsNotebook(file, folderId);
      await refreshData();
      showToast(`PDF "${createdNb.title}" importado com sucesso!`);
      handleOpenNotebook(createdNb, 0);
    } catch (err) {
      console.error('Erro ao importar PDF:', err);
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
      await refreshData();
      showToast(`Backup restaurado (${count} cadernos)!`);
    } catch {
      showToast('Erro ao ler arquivo de backup.');
    }
  };

  const activeNotebook = notebooks.find(
    (n) => n.id === activeNotebookId && !n.isTrashed
  );
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
          onBackToLibrary={() => {
            refreshData();
            setActiveNotebookId(null);
          }}
          onDeleteNotebook={handleTrashActiveNotebook}
          onRefreshData={refreshData}
          onShowToast={showToast}
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
          onOpenDriveModal={() => setDriveModalOpen(true)}
          driveUserEmail={driveUserEmail}
          driveSyncStatus={driveSyncStatus}
          onRefreshData={refreshData}
          onShowToast={showToast}
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

      {/* Modal da Conta Google & Google Drive Sync */}
      <GoogleDriveModal
        isOpen={driveModalOpen}
        onClose={() => {
          setDriveModalOpen(false);
          setDriveUserEmail(getSavedGoogleUser()?.email || null);
        }}
        onSyncCompleted={(msg) => {
          refreshData();
          setDriveUserEmail(getSavedGoogleUser()?.email || null);
          setDriveSyncStatus('synced');
          showToast(msg);
        }}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={setAutoSyncEnabled}
      />

      {/* Toast Flutuante */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-primary text-surface text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-top-3">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
