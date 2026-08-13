import NoteListItem from "./NoteListItem.jsx";
import SearchBar from "./SearchBar.jsx";

export default function Sidebar({
  notes,
  selectedId,
  query,
  onQueryChange,
  onSelect,
  onDelete,
  onAdd,
  isOpen,
  onClose,
}) {
  return (
    <>
      {isOpen ? (
        <div
          onClick={onClose}
          data-testid="drawer-backdrop"
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          aria-hidden="true"
        />
      ) : null}

      <aside
        data-testid="sidebar"
        data-open={isOpen ? "true" : "false"}
        className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="space-y-3 border-b border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={onAdd}
            data-testid="new-note"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New note
          </button>
          <SearchBar value={query} onChange={onQueryChange} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {notes.length === 0 ? (
            <p
              data-testid="list-empty"
              className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-600"
            >
              {query ? "No notes match your search." : "No notes yet."}
            </p>
          ) : (
            <ul className="space-y-1">
              {notes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  isSelected={note.id === selectedId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
