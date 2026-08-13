import { useMemo, useState } from "react";
import EmptyState from "./components/EmptyState.jsx";
import Sidebar from "./components/Sidebar.jsx";
import SplitPane from "./components/SplitPane.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import { useNotes } from "./hooks/useNotes.js";
import { useTheme } from "./hooks/useTheme.js";
import { searchNotes } from "./lib/notes.js";

export default function App() {
  const {
    notes,
    selectedNote,
    selectedId,
    addNote,
    updateNoteBody,
    deleteNote,
    selectNote,
  } = useNotes();

  const [theme, toggleTheme] = useTheme();
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const visibleNotes = useMemo(() => searchNotes(notes, query), [notes, query]);

  const handleSelect = (id) => {
    selectNote(id);
    setDrawerOpen(false);
  };

  const handleAdd = () => {
    addNote();
    setQuery("");
    setDrawerOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open note list"
          data-testid="open-drawer"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h1 className="flex-1 truncate text-sm font-semibold tracking-tight">
          Notes
        </h1>

        <span
          data-testid="note-count"
          className="hidden text-xs text-slate-400 sm:inline dark:text-slate-600"
        >
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>

        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          notes={visibleNotes}
          selectedId={selectedId}
          query={query}
          onQueryChange={setQuery}
          onSelect={handleSelect}
          onDelete={deleteNote}
          onAdd={handleAdd}
          isOpen={isDrawerOpen}
          onClose={() => setDrawerOpen(false)}
        />

        <main className="flex min-h-0 flex-1 flex-col">
          {selectedNote ? (
            <SplitPane
              key={selectedNote.id}
              body={selectedNote.body}
              onChange={(body) => updateNoteBody(selectedNote.id, body)}
            />
          ) : (
            <EmptyState
              title={notes.length === 0 ? "No notes yet" : "No note selected"}
              message={
                notes.length === 0
                  ? "Create your first note to start writing."
                  : "Pick a note from the list to open it."
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
