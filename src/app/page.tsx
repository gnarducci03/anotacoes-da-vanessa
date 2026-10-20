'use client';

import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ensureSeedData } from '@/lib/db';
import { NotebookRecord } from '@/types/note';
import { LibraryView } from '@/components/library/LibraryView';

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeNotebook, setActiveNotebook] = useState<NotebookRecord | null>(null);

  useEffect(() => {
    ensureSeedData();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const folders = useLiveQuery(() => db.folders.toArray(), [], []);
  const notebooks = useLiveQuery(() => db.notebooks.toArray(), [], []);
  const pages = useLiveQuery(() => db.pages.toArray(), [], []);

  if (activeNotebook) {
    return (
      <div className="flex flex-col h-screen w-screen bg-app items-center justify-center p-6">
        <p className="text-base font-semibold text-primary mb-2">
          Caderno aberto: {activeNotebook.title}
        </p>
        <button
          onClick={() => setActiveNotebook(null)}
          className="px-4 py-2 rounded-full bg-accent text-white text-xs font-semibold"
        >
          Voltar para Biblioteca
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <LibraryView
        folders={folders}
        notebooks={notebooks}
        pages={pages}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onOpenNotebook={(nb) => setActiveNotebook(nb)}
      />
    </div>
  );
}
