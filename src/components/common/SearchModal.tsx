'use client';

import React, { useMemo, useState } from 'react';
import { FolderRecord, NotebookRecord, PageRecord } from '@/types/note';
import { Search, BookOpen, FileText, Folder, X } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  folders: FolderRecord[];
  notebooks: NotebookRecord[];
  pages: PageRecord[];
  onClose: () => void;
  onOpenNotebookPage: (notebook: NotebookRecord, pageIndex: number) => void;
}

export function SearchModal({
  isOpen,
  folders,
  notebooks,
  pages,
  onClose,
  onOpenNotebookPage,
}: SearchModalProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        matchedNotebooks: [] as NotebookRecord[],
        matchedFolders: [] as FolderRecord[],
        matchedPages: [] as {
          notebook: NotebookRecord;
          page: PageRecord;
          snippet: string;
        }[],
      };
    }

    const activeNotebooks = notebooks.filter((n) => !n.isTrashed);
    const matchedNotebooks = activeNotebooks.filter((n) =>
      n.title.toLowerCase().includes(q)
    );
    const matchedFolders = folders.filter(
      (f) => !f.isTrashed && f.name.toLowerCase().includes(q)
    );

    const matchedPages: {
      notebook: NotebookRecord;
      page: PageRecord;
      snippet: string;
    }[] = [];

    for (const pg of pages) {
      const parent = activeNotebooks.find((n) => n.id === pg.notebookId);
      if (!parent) continue;

      const textHit = pg.textBoxes.find((tb) =>
        tb.text.toLowerCase().includes(q)
      );
      const pdfHit =
        pg.pdfTextContent && pg.pdfTextContent.toLowerCase().includes(q)
          ? pg.pdfTextContent
          : null;
      const outlineHit =
        pg.outlineTitle && pg.outlineTitle.toLowerCase().includes(q)
          ? pg.outlineTitle
          : null;

      if (textHit || pdfHit || outlineHit) {
        matchedPages.push({
          notebook: parent,
          page: pg,
          snippet:
            outlineHit ||
            textHit?.text ||
            (pdfHit ? pdfHit.slice(0, 120) + '...' : ''),
        });
      }
    }

    return { matchedNotebooks, matchedFolders, matchedPages };
  }, [query, folders, notebooks, pages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-16 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl bg-surface border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 bg-elevated border-b border-[var(--border-subtle)] flex items-center gap-3">
          <Search className="w-5 h-5 text-accent" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em títulos de cadernos, notas de texto, sumários e PDFs..."
            className="flex-1 bg-transparent text-sm text-primary focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-dock text-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {!query.trim() ? (
            <div className="py-12 text-center text-secondary">
              Digite qualquer termo para pesquisar em todos os seus cadernos,
              caixas de texto e conteúdo de PDFs importados.
            </div>
          ) : (
            <>
              {results.matchedNotebooks.length > 0 && (
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-secondary text-[10px] mb-2">
                    Cadernos ({results.matchedNotebooks.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.matchedNotebooks.map((nb) => (
                      <button
                        key={nb.id}
                        onClick={() => {
                          onOpenNotebookPage(nb, nb.lastOpenedPageIndex || 0);
                          onClose();
                        }}
                        className="w-full p-3 rounded-xl bg-app hover:bg-dock flex items-center gap-3 text-left transition-colors"
                      >
                        <BookOpen className="w-4 h-4 text-accent" />
                        <span className="font-semibold text-primary">
                          {nb.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.matchedPages.length > 0 && (
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-secondary text-[10px] mb-2">
                    Páginas, Textos & PDF ({results.matchedPages.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.matchedPages.map(({ notebook, page, snippet }) => (
                      <button
                        key={page.id}
                        onClick={() => {
                          onOpenNotebookPage(notebook, page.pageNumber);
                          onClose();
                        }}
                        className="w-full p-3 rounded-xl bg-app hover:bg-dock flex items-start gap-3 text-left transition-colors"
                      >
                        <FileText className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-primary">
                            {notebook.title} — Página {page.pageNumber + 1}
                          </p>
                          <p className="text-secondary line-clamp-2 mt-0.5">
                            {snippet}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.matchedFolders.length > 0 && (
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-secondary text-[10px] mb-2">
                    Pastas ({results.matchedFolders.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.matchedFolders.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-xl bg-app flex items-center gap-3"
                      >
                        <Folder className="w-4 h-4 text-[#5AC8FA]" />
                        <span className="font-medium text-primary">
                          {f.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.matchedNotebooks.length === 0 &&
                results.matchedPages.length === 0 &&
                results.matchedFolders.length === 0 && (
                  <div className="py-12 text-center text-secondary">
                    Nenhum resultado encontrado para &ldquo;{query}&rdquo;.
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
