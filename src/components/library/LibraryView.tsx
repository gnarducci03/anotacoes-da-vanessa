'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CoverStyleId,
  FolderRecord,
  NotebookRecord,
  PageOrientation,
  PageRecord,
  PageSizeId,
  PaperColor,
  PaperTemplateId,
} from '@/types/note';
import { createId, db, ensurePersistentStorage } from '@/lib/db';
import { NotebookCard } from './NotebookCard';
import { FolderCard } from './FolderCard';
import { NewNotebookModal } from './NewNotebookModal';
import { MoveItemModal } from './MoveItemModal';
import {
  Plus,
  FolderPlus,
  BookOpen,
  FileUp,
  Zap,
  Search,
  Star,
  Trash2,
  Folder,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  CheckSquare,
  Moon,
  Sun,
  Download,
  Upload,
  Keyboard,
  ShieldCheck,
  Cloud,
} from 'lucide-react';

interface LibraryViewProps {
  folders: FolderRecord[];
  notebooks: NotebookRecord[];
  pages: PageRecord[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenNotebook: (notebook: NotebookRecord, initialPageIndex?: number) => void;
  onImportPdfFile?: (file: File, folderId: string | null) => Promise<void>;
  onExportBackup?: () => Promise<void>;
  onImportBackupFile?: (file: File) => Promise<void>;
  onOpenSearchModal?: () => void;
  onOpenShortcutsModal?: () => void;
  onOpenDriveModal?: () => void;
  driveUserEmail?: string | null;
  driveSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  onRefreshData?: () => Promise<void> | void;
  onShowToast?: (msg: string) => void;
}

type NavSection = 'documents' | 'favorites' | 'trash';
type SortField = 'updatedAt' | 'title' | 'type';

export function LibraryView({
  folders,
  notebooks,
  pages,
  darkMode,
  onToggleDarkMode,
  onOpenNotebook,
  onImportPdfFile,
  onExportBackup,
  onImportBackupFile,
  onOpenSearchModal,
  onOpenShortcutsModal,
  onOpenDriveModal,
  driveUserEmail,
  driveSyncStatus = 'idle',
  onRefreshData,
  onShowToast,
}: LibraryViewProps) {
  const [navSection, setNavSection] = useState<NavSection>('documents');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortField>('updatedAt');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Menus & Modais
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [newNotebookOpen, setNewNotebookOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Modal de Renomear
  const [renameTarget, setRenameTarget] = useState<{
    kind: 'notebook' | 'folder';
    id: string;
    currentTitle: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Modal de Mover
  const [moveTarget, setMoveTarget] = useState<{
    kind: 'notebook' | 'folder';
    id: string;
    title: string;
    currentParentId: string | null;
  } | null>(null);

  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  const [storageInfo, setStorageInfo] = useState<{
    persisted: boolean;
    usageMB: string;
  }>({ persisted: false, usageMB: '0.0' });

  useEffect(() => {
    ensurePersistentStorage().then(({ persisted, usageBytes }) => {
      setStorageInfo({
        persisted,
        usageMB: (usageBytes / (1024 * 1024)).toFixed(1),
      });
    });
  }, [notebooks.length, pages.length]);

  // Mapa de contagem de páginas por caderno
  const pageCountByNotebook = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pg of pages) {
      map[pg.notebookId] = (map[pg.notebookId] || 0) + 1;
    }
    return map;
  }, [pages]);

  // Mapa de contagem de itens por pasta
  const itemCountByFolder = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of folders) {
      if (!f.isTrashed && f.parentId) {
        map[f.parentId] = (map[f.parentId] || 0) + 1;
      }
    }
    for (const nb of notebooks) {
      if (!nb.isTrashed && nb.folderId) {
        map[nb.folderId] = (map[nb.folderId] || 0) + 1;
      }
    }
    return map;
  }, [folders, notebooks]);

  // Breadcrumb da pasta atual
  const breadcrumb = useMemo(() => {
    const trail: FolderRecord[] = [];
    let pointer = currentFolderId;
    while (pointer) {
      const found = folders.find((f) => f.id === pointer);
      if (!found) break;
      trail.unshift(found);
      pointer = found.parentId;
    }
    return trail;
  }, [currentFolderId, folders]);

  // Filtragem de Pastas e Cadernos
  const { visibleFolders, visibleNotebooks, favoritePages } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (navSection === 'trash') {
      return {
        visibleFolders: folders.filter(
          (f) => f.isTrashed && (!q || f.name.toLowerCase().includes(q))
        ),
        visibleNotebooks: notebooks.filter(
          (n) => n.isTrashed && (!q || n.title.toLowerCase().includes(q))
        ),
        favoritePages: [] as PageRecord[],
      };
    }

    if (navSection === 'favorites') {
      return {
        visibleFolders: folders.filter(
          (f) => !f.isTrashed && f.isFavorite && (!q || f.name.toLowerCase().includes(q))
        ),
        visibleNotebooks: notebooks.filter(
          (n) => !n.isTrashed && n.isFavorite && (!q || n.title.toLowerCase().includes(q))
        ),
        favoritePages: pages.filter((p) => {
          const parentNb = notebooks.find((n) => n.id === p.notebookId);
          return parentNb && !parentNb.isTrashed && p.isFavorite;
        }),
      };
    }

    // Aba Documentos
    const filteredFolders = folders.filter((f) => {
      if (f.isTrashed) return false;
      if (q) return f.name.toLowerCase().includes(q);
      return f.parentId === currentFolderId;
    });

    const filteredNotebooks = notebooks.filter((n) => {
      if (n.isTrashed) return false;
      if (q) return n.title.toLowerCase().includes(q);
      return n.folderId === currentFolderId;
    });

    // Ordenação
    filteredFolders.sort((a, b) =>
      sortBy === 'title'
        ? a.name.localeCompare(b.name, 'pt-BR')
        : b.updatedAt - a.updatedAt
    );

    filteredNotebooks.sort((a, b) =>
      sortBy === 'title'
        ? a.title.localeCompare(b.title, 'pt-BR')
        : b.updatedAt - a.updatedAt
    );

    return {
      visibleFolders: filteredFolders,
      visibleNotebooks: filteredNotebooks,
      favoritePages: [] as PageRecord[],
    };
  }, [folders, notebooks, pages, navSection, currentFolderId, searchQuery, sortBy]);

  // CRUD: Criar Caderno
  const handleCreateNotebook = async (config: {
    title: string;
    coverStyle: CoverStyleId;
    coverColor: string;
    defaultTemplate: PaperTemplateId;
    defaultPaperColor: PaperColor;
    pageSize: PageSizeId;
    orientation: PageOrientation;
  }) => {
    const now = Date.now();
    const notebookId = createId('nb');
    const newNotebook: NotebookRecord = {
      id: notebookId,
      title: config.title,
      folderId: navSection === 'documents' ? currentFolderId : null,
      coverStyle: config.coverStyle,
      coverColor: config.coverColor,
      defaultTemplate: config.defaultTemplate,
      defaultPaperColor: config.defaultPaperColor,
      pageSize: config.pageSize,
      orientation: config.orientation,
      isFavorite: false,
      isTrashed: false,
      lastOpenedPageIndex: 0,
      createdAt: now,
      updatedAt: now,
    };

    const firstPage: PageRecord = {
      id: createId('pg'),
      notebookId,
      pageNumber: 0,
      template: config.defaultTemplate,
      paperColor: config.defaultPaperColor,
      orientation: config.orientation,
      rotation: 0,
      isFavorite: false,
      strokes: [],
      shapes: [],
      textBoxes: [],
      images: [],
      updatedAt: now,
    };

    await db.transaction('rw', db.notebooks, db.pages, async () => {
      await db.notebooks.add(newNotebook);
      await db.pages.add(firstPage);
    });
    await onRefreshData?.();
    onShowToast?.(`Caderno "${newNotebook.title}" criado!`);
    onOpenNotebook(newNotebook, 0);
  };

  // Criar Nota Rápida (Quick Note)
  const handleQuickNote = async () => {
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    await handleCreateNotebook({
      title: `Nota Rápida (${formatted})`,
      coverStyle: 'classic-kraft',
      coverColor: '#C59B6D',
      defaultTemplate: 'ruled-narrow',
      defaultPaperColor: 'cream',
      pageSize: 'goodnotes',
      orientation: 'portrait',
    });
  };

  // Criar Pasta
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim() || 'Nova Pasta';
    const now = Date.now();
    await db.folders.add({
      id: createId('fld'),
      name,
      parentId: navSection === 'documents' ? currentFolderId : null,
      color: '#5AC8FA',
      isFavorite: false,
      isTrashed: false,
      createdAt: now,
      updatedAt: now,
    });
    await onRefreshData?.();
    setNewFolderName('');
    setNewFolderModalOpen(false);
    onShowToast?.(`Pasta "${name}" criada!`);
  };

  // Favoritar Caderno ou Pasta
  const handleToggleNotebookFavorite = async (nb: NotebookRecord) => {
    await db.notebooks.update(nb.id, {
      isFavorite: !nb.isFavorite,
      updatedAt: Date.now(),
    });
    await onRefreshData?.();
  };

  const handleToggleFolderFavorite = async (folder: FolderRecord) => {
    await db.folders.update(folder.id, {
      isFavorite: !folder.isFavorite,
      updatedAt: Date.now(),
    });
    await onRefreshData?.();
  };

  // Confirmar Renomeação
  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const clean = renameValue.trim();
    if (!clean) return;

    if (renameTarget.kind === 'notebook') {
      await db.notebooks.update(renameTarget.id, {
        title: clean,
        updatedAt: Date.now(),
      });
    } else {
      await db.folders.update(renameTarget.id, {
        name: clean,
        updatedAt: Date.now(),
      });
    }
    await onRefreshData?.();
    setRenameTarget(null);
  };

  // Confirmar Mover
  const handleConfirmMove = async (targetFolderId: string | null) => {
    if (!moveTarget) return;
    if (moveTarget.kind === 'notebook') {
      await db.notebooks.update(moveTarget.id, {
        folderId: targetFolderId,
        updatedAt: Date.now(),
      });
    } else {
      await db.folders.update(moveTarget.id, {
        parentId: targetFolderId,
        updatedAt: Date.now(),
      });
    }
    await onRefreshData?.();
    setMoveTarget(null);
  };

  // Duplicar Caderno
  const handleDuplicateNotebook = async (nb: NotebookRecord) => {
    const now = Date.now();
    const newNotebookId = createId('nb');
    const sourcePages = await db.pages
      .where('notebookId')
      .equals(nb.id)
      .sortBy('pageNumber');

    await db.transaction('rw', db.notebooks, db.pages, async () => {
      await db.notebooks.add({
        ...nb,
        id: newNotebookId,
        title: `${nb.title} (Cópia)`,
        createdAt: now,
        updatedAt: now,
      });

      const clonedPages: PageRecord[] = sourcePages.map((pg) => ({
        ...pg,
        id: createId('pg'),
        notebookId: newNotebookId,
        updatedAt: now,
      }));
      await db.pages.bulkAdd(clonedPages);
    });
    await onRefreshData?.();
    onShowToast?.(`Caderno "${nb.title}" duplicado!`);
  };

  // Exclusão Definitiva de um Caderno
  const handleDeleteNotebookPermanently = async (nb: NotebookRecord) => {
    await db.transaction(
      'rw',
      db.notebooks,
      db.pages,
      db.assets,
      async () => {
        await db.pages.where('notebookId').equals(nb.id).delete();
        await db.notebooks.delete(nb.id);
        if (nb.pdfAssetId) {
          const othersUsingSamePdf = await db.notebooks
            .filter(
              (other) =>
                other.id !== nb.id && other.pdfAssetId === nb.pdfAssetId
            )
            .count();
          if (othersUsingSamePdf === 0) {
            await db.assets.delete(nb.pdfAssetId);
          }
        }
      }
    );
    await onRefreshData?.();
    onShowToast?.(`Caderno "${nb.title}" excluído definitivamente!`);
  };

  // Lixeira / Exclusão Definitiva (com limpeza de PDF órfão caso nenhum outro caderno o utilize)
  const handleTrashOrDeleteNotebook = async (nb: NotebookRecord) => {
    if (!nb.isTrashed) {
      await db.notebooks.update(nb.id, {
        isTrashed: true,
        updatedAt: Date.now(),
      });
      await onRefreshData?.();
      onShowToast?.(`"${nb.title}" movido para a Lixeira.`);
    } else {
      await handleDeleteNotebookPermanently(nb);
    }
  };

  const handleRestoreNotebook = async (nb: NotebookRecord) => {
    await db.notebooks.update(nb.id, {
      isTrashed: false,
      updatedAt: Date.now(),
    });
    await onRefreshData?.();
    onShowToast?.(`"${nb.title}" restaurado!`);
  };

  // Exclusão Definitiva de uma Pasta (e dos cadernos/subpastas dentro dela)
  const handleDeleteFolderPermanently = async (folder: FolderRecord) => {
    const childNotebooks = notebooks.filter((n) => n.folderId === folder.id);
    for (const nb of childNotebooks) {
      await handleDeleteNotebookPermanently(nb);
    }
    await db.folders.delete(folder.id);
    if (currentFolderId === folder.id) {
      setCurrentFolderId(folder.parentId);
    }
    await onRefreshData?.();
    onShowToast?.(`Pasta "${folder.name}" excluída definitivamente!`);
  };

  const handleTrashOrDeleteFolder = async (folder: FolderRecord) => {
    if (!folder.isTrashed) {
      const now = Date.now();
      await db.transaction('rw', db.folders, db.notebooks, async () => {
        await db.folders.update(folder.id, {
          isTrashed: true,
          updatedAt: now,
        });
        await db.notebooks
          .where('folderId')
          .equals(folder.id)
          .modify({ isTrashed: true, updatedAt: now });
      });
      if (currentFolderId === folder.id) {
        setCurrentFolderId(folder.parentId);
      }
      await onRefreshData?.();
      onShowToast?.(`Pasta "${folder.name}" movida para a Lixeira.`);
    } else {
      await handleDeleteFolderPermanently(folder);
    }
  };

  const handleRestoreFolder = async (folder: FolderRecord) => {
    const now = Date.now();
    await db.transaction('rw', db.folders, db.notebooks, async () => {
      await db.folders.update(folder.id, {
        isTrashed: false,
        updatedAt: now,
      });
      await db.notebooks
        .where('folderId')
        .equals(folder.id)
        .modify({ isTrashed: false, updatedAt: now });
    });
    await onRefreshData?.();
    onShowToast?.(`Pasta "${folder.name}" restaurada!`);
  };

  const handleEmptyTrash = async () => {
    const trashedNbs = notebooks.filter((n) => n.isTrashed);
    const trashedFlds = folders.filter((f) => f.isTrashed);
    for (const nb of trashedNbs) {
      await handleDeleteNotebookPermanently(nb);
    }
    for (const fld of trashedFlds) {
      await db.folders.delete(fld.id);
    }
    await onRefreshData?.();
    onShowToast?.('Lixeira esvaziada!');
  };

  // Seleção múltipla
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkTrash = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const nb = notebooks.find((n) => n.id === id);
      if (nb) await handleTrashOrDeleteNotebook(nb);
      const fld = folders.find((f) => f.id === id);
      if (fld) await handleTrashOrDeleteFolder(fld);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
    await onRefreshData?.();
  };

  const handleBulkDeletePermanently = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const nb = notebooks.find((n) => n.id === id);
      if (nb) await handleDeleteNotebookPermanently(nb);
      const fld = folders.find((f) => f.id === id);
      if (fld) await handleDeleteFolderPermanently(fld);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
    await onRefreshData?.();
  };

  return (
    <div className="flex h-full w-full bg-app overflow-hidden">
      {/* Sidebar esquerda estilo iPadOS GoodNotes */}
      <aside className="w-64 flex-shrink-0 border-r border-[var(--border-subtle)] bg-elevated backdrop-blur-xl flex flex-col justify-between p-4">
        <div>
          {/* Marca própria: Anotações da Vanessa */}
          <div className="flex items-center justify-between px-2 py-2 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#00B4D8] flex items-center justify-center text-white shadow-md">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-primary leading-tight">
                  Anotações da Vanessa
                </h1>
                <span className="text-[11px] font-medium text-secondary">
                  Caderno Digital
                </span>
              </div>
            </div>

            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl hover:bg-dock text-secondary hover:text-primary transition-colors"
              title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Navegação Principal */}
          <nav className="space-y-1">
            <button
              onClick={() => {
                setNavSection('documents');
                setCurrentFolderId(null);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                navSection === 'documents'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-primary hover:bg-dock'
              }`}
            >
              <span className="flex items-center gap-3">
                <Folder className="w-4 h-4" />
                Documentos
              </span>
              <span className="text-xs opacity-80">
                {notebooks.filter((n) => !n.isTrashed).length}
              </span>
            </button>

            <button
              onClick={() => onOpenSearchModal?.()}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-dock transition-all"
            >
              <span className="flex items-center gap-3">
                <Search className="w-4 h-4 text-accent" />
                Busca Global
              </span>
              <span className="text-[11px] text-secondary bg-dock px-1.5 py-0.5 rounded">
                ⌘K
              </span>
            </button>

            <button
              onClick={() => setNavSection('favorites')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                navSection === 'favorites'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-primary hover:bg-dock'
              }`}
            >
              <span className="flex items-center gap-3">
                <Star className="w-4 h-4" />
                Favoritos
              </span>
              <span className="text-xs opacity-80">
                {notebooks.filter((n) => !n.isTrashed && n.isFavorite).length}
              </span>
            </button>

            <button
              onClick={() => setNavSection('trash')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                navSection === 'trash'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-primary hover:bg-dock'
              }`}
            >
              <span className="flex items-center gap-3">
                <Trash2 className="w-4 h-4" />
                Lixeira
              </span>
              <span className="text-xs opacity-80">
                {notebooks.filter((n) => n.isTrashed).length +
                  folders.filter((f) => f.isTrashed).length}
              </span>
            </button>
          </nav>

          {/* Ações Rápidas na Sidebar */}
          <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] space-y-1.5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-secondary mb-2">
               Criação & Importação
            </p>
            <button
              onClick={() => setNewNotebookOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-primary hover:bg-dock transition-colors"
            >
              <BookOpen className="w-4 h-4 text-accent" />
              Novo Caderno...
            </button>
            <button
              onClick={handleQuickNote}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-primary hover:bg-dock transition-colors"
            >
              <Zap className="w-4 h-4 text-[#FF9500]" />
              Nota Rápida Instantânea
            </button>
            <button
              onClick={() => setNewFolderModalOpen(true)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-primary hover:bg-dock transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-[#5AC8FA]" />
              Nova Pasta...
            </button>
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-primary hover:bg-dock transition-colors"
            >
              <FileUp className="w-4 h-4 text-emerald-500" />
              Importar PDF...
            </button>
          </div>
        </div>

        {/* Rodapé da Sidebar: Google Drive, Backup & Atalhos */}
        <div className="pt-4 border-t border-[var(--border-subtle)] space-y-1">
          <button
            onClick={() => onOpenDriveModal?.()}
            className={`w-full px-3 py-2.5 mb-1.5 rounded-xl border flex items-center justify-between text-xs font-semibold transition-all ${
              driveUserEmail
                ? 'bg-accent/10 border-accent/30 text-accent'
                : 'bg-surface hover:bg-dock border-[var(--border-subtle)] text-primary'
            }`}
          >
            <span className="flex items-center gap-2 truncate">
              <Cloud className="w-4 h-4 flex-shrink-0 text-accent" />
              <span className="truncate">
                {driveSyncStatus === 'syncing'
                  ? 'Sincronizando Drive...'
                  : driveUserEmail
                  ? 'Google Drive Ativo'
                  : 'Conectar Google Drive'}
              </span>
            </span>
          </button>

          <div className="px-3 py-2 mb-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              Salvo no Tablet
            </span>
            <span className="text-secondary font-medium">
              {storageInfo.usageMB} MB
            </span>
          </div>
          <button
            onClick={() => onExportBackup?.()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-secondary hover:text-primary hover:bg-dock"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Backup (.inknote)
          </button>
          <button
            onClick={() => backupInputRef.current?.click()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-secondary hover:text-primary hover:bg-dock"
          >
            <Upload className="w-3.5 h-3.5" />
            Restaurar Backup
          </button>
          <button
            onClick={() => onOpenShortcutsModal?.()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-secondary hover:text-primary hover:bg-dock"
          >
            <Keyboard className="w-3.5 h-3.5" />
            Gestos & Atalhos
          </button>
        </div>
      </aside>

      {/* Área Principal da Biblioteca */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar da Biblioteca */}
        <header className="px-6 py-4 bg-elevated backdrop-blur-xl border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
          {/* Breadcrumb ou Título da Aba */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {navSection === 'documents' ? (
              <>
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className={`text-xl font-bold tracking-tight transition-colors ${
                    currentFolderId === null
                      ? 'text-primary'
                      : 'text-secondary hover:text-accent'
                  }`}
                >
                  Documentos
                </button>
                {breadcrumb.map((folder, idx) => (
                  <React.Fragment key={folder.id}>
                    <ChevronRight className="w-4 h-4 text-muted" />
                    <button
                      onClick={() => setCurrentFolderId(folder.id)}
                      className={`text-xl font-bold tracking-tight transition-colors ${
                        idx === breadcrumb.length - 1
                          ? 'text-primary'
                          : 'text-secondary hover:text-accent'
                      }`}
                    >
                      {folder.name}
                    </button>
                  </React.Fragment>
                ))}
              </>
            ) : navSection === 'favorites' ? (
              <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                <Star className="w-5 h-5 fill-[#FF9500] text-[#FF9500]" />
                Favoritos
              </h2>
            ) : (
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold tracking-tight text-primary flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-[#FF3B30]" />
                  Lixeira
                </h2>
                {(visibleNotebooks.length > 0 || visibleFolders.length > 0) && (
                  <button
                    type="button"
                    onClick={handleEmptyTrash}
                    className="px-3 py-1.5 rounded-full bg-[#FF3B30] hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Esvaziar Lixeira
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Controles Direitos: Busca rápida, Ordenação, Grade/Lista, Seleção */}
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar cadernos..."
                className="pl-9 pr-3 py-1.5 rounded-full bg-dock text-xs text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent w-44 sm:w-56"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="px-3 py-1.5 rounded-full bg-dock text-xs font-medium text-primary focus:outline-none"
            >
              <option value="updatedAt">Recentes</option>
              <option value="title">Nome (A–Z)</option>
            </select>

            <div className="flex items-center bg-dock p-0.5 rounded-full">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-surface text-accent shadow-sm'
                    : 'text-secondary'
                }`}
                title="Visualização em Grade"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === 'list'
                    ? 'bg-surface text-accent shadow-sm'
                    : 'text-secondary'
                }`}
                title="Visualização em Lista"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setSelectionMode((prev) => !prev);
                setSelectedIds(new Set());
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                selectionMode
                  ? 'bg-accent text-white'
                  : 'bg-dock text-primary hover:bg-dock/80'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {selectionMode ? 'Cancelar Seleção' : 'Selecionar'}
            </button>
          </div>
        </header>

        {/* Barra de ação em lote quando itens estão selecionados */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="px-6 py-2.5 bg-accent text-white flex items-center justify-between text-xs font-medium">
            <span>{selectedIds.size} item(ns) selecionado(s)</span>
            <div className="flex items-center gap-2.5">
              {navSection !== 'trash' && (
                <button
                  type="button"
                  onClick={handleBulkTrash}
                  className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Mover para Lixeira
                </button>
              )}
              <button
                type="button"
                onClick={handleBulkDeletePermanently}
                className="px-3 py-1.5 rounded-full bg-[#FF3B30] hover:bg-red-600 text-white font-semibold flex items-center gap-1 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Definitivamente
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo da Biblioteca */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-8">
              {/* Card "+ Novo..." estilo GoodNotes (apenas na aba Documentos) */}
              {navSection === 'documents' && (
                <div className="relative flex flex-col items-center">
                  <button
                    onClick={() => setPlusMenuOpen((prev) => !prev)}
                    onDoubleClick={handleQuickNote}
                    className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-accent/45 hover:border-accent bg-surface/50 hover:bg-accent/5 flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer"
                    title="Toque para criar • Duplo toque para Nota Rápida"
                  >
                    <div className="w-12 h-12 rounded-full bg-accent/10 group-hover:bg-accent group-hover:text-white text-accent flex items-center justify-center transition-colors">
                      <Plus className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-accent">Novo...</span>
                    <span className="text-[10px] text-secondary px-2 text-center">
                      Duplo toque: Nota Rápida
                    </span>
                  </button>

                  {/* Popover do botão "+ Novo..." */}
                  {plusMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setPlusMenuOpen(false)}
                      />
                      <div
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                        className="absolute top-1/2 left-4 z-40 w-56 rounded-2xl bg-surface shadow-2xl border border-[var(--border-subtle)] py-2 text-xs"
                      >
                        <button
                          onClick={() => {
                            setPlusMenuOpen(false);
                            setNewNotebookOpen(true);
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-dock text-primary font-medium"
                        >
                          <BookOpen className="w-4 h-4 text-accent" />
                          Caderno (Notebook)
                        </button>
                        <button
                          onClick={() => {
                            setPlusMenuOpen(false);
                            handleQuickNote();
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-dock text-primary font-medium"
                        >
                          <Zap className="w-4 h-4 text-[#FF9500]" />
                          Nota Rápida
                        </button>
                        <button
                          onClick={() => {
                            setPlusMenuOpen(false);
                            setNewFolderModalOpen(true);
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-dock text-primary font-medium"
                        >
                          <FolderPlus className="w-4 h-4 text-[#5AC8FA]" />
                          Pasta (Folder)
                        </button>
                        <div className="my-1 border-t border-[var(--border-subtle)]" />
                        <button
                          type="button"
                          onClick={() => {
                            pdfInputRef.current?.click();
                            setPlusMenuOpen(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-dock text-primary font-medium"
                        >
                          <FileUp className="w-4 h-4 text-emerald-500" />
                          Importar PDF...
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Pastas */}
              {visibleFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  itemCount={itemCountByFolder[folder.id] || 0}
                  viewMode="grid"
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(folder.id)}
                  onToggleSelect={toggleSelection}
                  onOpen={(fld) => setCurrentFolderId(fld.id)}
                  onToggleFavorite={handleToggleFolderFavorite}
                  onRename={(fld) => {
                    setRenameTarget({
                      kind: 'folder',
                      id: fld.id,
                      currentTitle: fld.name,
                    });
                    setRenameValue(fld.name);
                  }}
                  onMove={(fld) =>
                    setMoveTarget({
                      kind: 'folder',
                      id: fld.id,
                      title: fld.name,
                      currentParentId: fld.parentId,
                    })
                  }
                  onTrashOrDelete={handleTrashOrDeleteFolder}
                  onDeletePermanently={handleDeleteFolderPermanently}
                  onRestore={handleRestoreFolder}
                />
              ))}

              {/* Cadernos */}
              {visibleNotebooks.map((nb) => (
                <NotebookCard
                  key={nb.id}
                  notebook={nb}
                  pageCount={pageCountByNotebook[nb.id] || 1}
                  viewMode="grid"
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(nb.id)}
                  onToggleSelect={toggleSelection}
                  onOpen={(notebook) =>
                    onOpenNotebook(notebook, notebook.lastOpenedPageIndex || 0)
                  }
                  onToggleFavorite={handleToggleNotebookFavorite}
                  onRename={(notebook) => {
                    setRenameTarget({
                      kind: 'notebook',
                      id: notebook.id,
                      currentTitle: notebook.title,
                    });
                    setRenameValue(notebook.title);
                  }}
                  onMove={(notebook) =>
                    setMoveTarget({
                      kind: 'notebook',
                      id: notebook.id,
                      title: notebook.title,
                      currentParentId: notebook.folderId,
                    })
                  }
                  onDuplicate={handleDuplicateNotebook}
                  onTrashOrDelete={handleTrashOrDeleteNotebook}
                  onDeletePermanently={handleDeleteNotebookPermanently}
                  onRestore={handleRestoreNotebook}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-w-4xl">
              {visibleFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  itemCount={itemCountByFolder[folder.id] || 0}
                  viewMode="list"
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(folder.id)}
                  onToggleSelect={toggleSelection}
                  onOpen={(fld) => setCurrentFolderId(fld.id)}
                  onToggleFavorite={handleToggleFolderFavorite}
                  onRename={(fld) => {
                    setRenameTarget({
                      kind: 'folder',
                      id: fld.id,
                      currentTitle: fld.name,
                    });
                    setRenameValue(fld.name);
                  }}
                  onMove={(fld) =>
                    setMoveTarget({
                      kind: 'folder',
                      id: fld.id,
                      title: fld.name,
                      currentParentId: fld.parentId,
                    })
                  }
                  onTrashOrDelete={handleTrashOrDeleteFolder}
                  onDeletePermanently={handleDeleteFolderPermanently}
                  onRestore={handleRestoreFolder}
                />
              ))}
              {visibleNotebooks.map((nb) => (
                <NotebookCard
                  key={nb.id}
                  notebook={nb}
                  pageCount={pageCountByNotebook[nb.id] || 1}
                  viewMode="list"
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(nb.id)}
                  onToggleSelect={toggleSelection}
                  onOpen={(notebook) =>
                    onOpenNotebook(notebook, notebook.lastOpenedPageIndex || 0)
                  }
                  onToggleFavorite={handleToggleNotebookFavorite}
                  onRename={(notebook) => {
                    setRenameTarget({
                      kind: 'notebook',
                      id: notebook.id,
                      currentTitle: notebook.title,
                    });
                    setRenameValue(notebook.title);
                  }}
                  onMove={(notebook) =>
                    setMoveTarget({
                      kind: 'notebook',
                      id: notebook.id,
                      title: notebook.title,
                      currentParentId: notebook.folderId,
                    })
                  }
                  onDuplicate={handleDuplicateNotebook}
                  onTrashOrDelete={handleTrashOrDeleteNotebook}
                  onDeletePermanently={handleDeleteNotebookPermanently}
                  onRestore={handleRestoreNotebook}
                />
              ))}
            </div>
          )}

          {/* Seção de Páginas Favoritadas na aba Favoritos */}
          {navSection === 'favorites' && favoritePages.length > 0 && (
            <div className="mt-10 pt-6 border-t border-[var(--border-subtle)]">
              <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-4">
                Páginas Marcadas com Estrela ({favoritePages.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {favoritePages.map((pg) => {
                  const parent = notebooks.find((n) => n.id === pg.notebookId);
                  if (!parent) return null;
                  return (
                    <button
                      key={pg.id}
                      onClick={() => onOpenNotebook(parent, pg.pageNumber)}
                      className="p-3 rounded-2xl bg-surface border border-[var(--border-subtle)] hover:border-accent text-left transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-accent">
                          Pág. {pg.pageNumber + 1}
                        </span>
                        <Star className="w-3.5 h-3.5 fill-[#FF9500] text-[#FF9500]" />
                      </div>
                      <p className="text-xs font-medium text-primary truncate">
                        {parent.title}
                      </p>
                      {pg.outlineTitle && (
                        <p className="text-[11px] text-secondary truncate mt-0.5">
                          {pg.outlineTitle}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estado Vazio */}
          {visibleFolders.length === 0 &&
            visibleNotebooks.length === 0 &&
            navSection !== 'documents' && (
              <div className="h-64 flex flex-col items-center justify-center text-center text-secondary">
                <p className="text-sm font-medium">Nenhum item encontrado</p>
                <p className="text-xs text-muted mt-1">
                  {navSection === 'favorites'
                    ? 'Marque cadernos, pastas ou páginas com a estrela para vê-los aqui.'
                    : 'Sua lixeira está vazia.'}
                </p>
              </div>
            )}
        </div>
      </main>

      {/* Inputs ocultos de arquivo */}
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file && onImportPdfFile) {
            await onImportPdfFile(
              file,
              navSection === 'documents' ? currentFolderId : null
            );
          }
        }}
      />
      <input
        ref={backupInputRef}
        type="file"
        accept=".json,.inknote"
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file && onImportBackupFile) {
            await onImportBackupFile(file);
          }
        }}
      />

      {/* Modal: Novo Caderno */}
      <NewNotebookModal
        isOpen={newNotebookOpen}
        onClose={() => setNewNotebookOpen(false)}
        onCreate={handleCreateNotebook}
      />

      {/* Modal: Nova Pasta */}
      {newFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCreateFolder}
            className="w-full max-w-sm rounded-3xl bg-surface border border-[var(--border-subtle)] shadow-2xl p-6"
          >
            <h3 className="text-base font-semibold text-primary mb-1">
              Nova Pasta
            </h3>
            <p className="text-xs text-secondary mb-4">
              Digite um nome para organizar seus cadernos e PDFs.
            </p>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Ex: Semestre 2026.2"
              className="w-full px-3.5 py-2.5 rounded-xl bg-app border border-[var(--border-subtle)] text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent mb-5"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewFolderModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-secondary hover:bg-dock"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full text-xs font-semibold bg-accent text-white"
              >
                Criar Pasta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Renomear */}
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form
            onSubmit={handleConfirmRename}
            className="w-full max-w-sm rounded-3xl bg-surface border border-[var(--border-subtle)] shadow-2xl p-6"
          >
            <h3 className="text-base font-semibold text-primary mb-3">
              Renomear {renameTarget.kind === 'notebook' ? 'Caderno' : 'Pasta'}
            </h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-app border border-[var(--border-subtle)] text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent mb-5"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenameTarget(null)}
                className="px-4 py-2 rounded-full text-xs font-medium text-secondary hover:bg-dock"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full text-xs font-semibold bg-accent text-white"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Mover */}
      <MoveItemModal
        isOpen={Boolean(moveTarget)}
        title={moveTarget?.title || ''}
        folders={folders}
        currentParentId={moveTarget?.currentParentId ?? null}
        excludeFolderId={
          moveTarget?.kind === 'folder' ? moveTarget.id : undefined
        }
        onClose={() => setMoveTarget(null)}
        onConfirmMove={handleConfirmMove}
      />
    </div>
  );
}
