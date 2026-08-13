import { useState } from "react";
import { deriveTitle, formatDate } from "../lib/notes.js";

export default function NoteListItem({ note, isSelected, onSelect, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  const title = deriveTitle(note.body);
  const preview = note.body
    .split("\n")
    .slice(1)
    .find((line) => line.trim().length > 0);

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(note.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(note.id);
          }
        }}
        data-testid="note-item"
        data-selected={isSelected ? "true" : "false"}
        className={`group cursor-pointer rounded-lg px-3 py-2.5 transition ${
          isSelected
            ? "bg-blue-50 dark:bg-blue-950/50"
            : "hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3
            data-testid="note-title"
            className={`truncate text-sm font-medium ${
              isSelected
                ? "text-blue-700 dark:text-blue-300"
                : "text-slate-900 dark:text-slate-100"
            }`}
          >
            {title}
          </h3>

          {confirming ? (
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                data-testid="delete-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(note.id);
                }}
                className="rounded px-1.5 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
              >
                Delete
              </button>
              <button
                type="button"
                data-testid="delete-cancel"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirming(false);
                }}
                className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label={`Delete ${title}`}
              data-testid="delete-start"
              onClick={(event) => {
                event.stopPropagation();
                setConfirming(true);
              }}
              className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-red-400"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
            </button>
          )}
        </div>

        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          <span>{formatDate(note.updatedAt)}</span>
          {preview ? <span className="ml-2">{preview}</span> : null}
        </p>
      </div>
    </li>
  );
}
