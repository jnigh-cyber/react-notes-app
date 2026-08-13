# Markdown Note-Taking App — Design

**Date:** 2026-08-13
**Location:** `workspace/play-a-round/react-notes-app`
**Status:** Approved for planning

## Purpose

A browser-local markdown note-taking prototype. Notes are written in a plain
textarea and rendered live beside the editor. Everything persists to
`localStorage`; there is no server, no account, and no sync.

This is a prototype in a playground directory. It optimizes for a working,
readable app over production hardening.

## Scope

**In scope**

- Create, edit, and delete notes
- Live markdown preview in a split view (editor left, preview right)
- Auto-save to `localStorage`, debounced
- Sidebar listing all notes with title and modified date
- Search that filters the note list
- Dark/light mode toggle

**Explicitly out of scope**

No export, no folders or tags, no pinning, no markdown toolbar, no keyboard
shortcut layer, no multi-device sync, no rich-text editing, no note history or
undo beyond the browser's native textarea undo.

## Stack

| Concern | Choice |
| --- | --- |
| Build | Vite, React template, standalone `package.json` inside the project dir |
| UI | React 19, functional components and hooks only |
| Styling | Tailwind v4 via `@tailwindcss/vite` |
| Markdown | `react-markdown` + `remark-gfm` |
| Persistence | `localStorage` |

`remark-gfm` is included so tables, task lists, strikethrough, and autolinks
render — the things people actually type into markdown notes.

## Data Model

```js
{
  id: string,        // crypto.randomUUID()
  body: string,      // raw markdown, the single source of truth
  createdAt: number, // Date.now()
  updatedAt: number  // Date.now(), bumped on every body change
}
```

**There is no stored `title` field.** The title shown in the sidebar is derived
from the body: the first non-empty line, with leading `#` characters and
whitespace stripped, truncated to 60 characters. An empty or whitespace-only
body yields `"Untitled"`.

This means the sidebar can never drift out of sync with the note, and the user
never has to fill in a separate field. The cost is that a user cannot title a
note differently from its first line — acceptable for a prototype, and the
common markdown convention anyway.

### Storage keys

| Key | Value |
| --- | --- |
| `react-notes-app.notes.v1` | JSON array of note objects |
| `react-notes-app.theme` | `"dark"` or `"light"` |

The `.v1` suffix leaves room to migrate the shape later without colliding with
existing data.

## Architecture

```
react-notes-app/
  index.html
  package.json
  vite.config.js
  src/
    main.jsx
    index.css
    App.jsx
    hooks/
      useNotes.js
      useTheme.js
      useDebouncedEffect.js
    lib/
      storage.js
      notes.js
    components/
      Sidebar.jsx
      NoteListItem.jsx
      SearchBar.jsx
      SplitPane.jsx
      Editor.jsx
      Preview.jsx
      ThemeToggle.jsx
      EmptyState.jsx
```

### Units and responsibilities

**`lib/notes.js`** — pure functions, no React, no storage. `createNote()`,
`deriveTitle(body)`, `searchNotes(notes, query)`, `formatDate(timestamp)`,
`sortByUpdated(notes)`. Independently testable; this is where the only logic
worth unit-testing lives.

**`lib/storage.js`** — the only module that touches `localStorage`.
`loadNotes()`, `saveNotes(notes)`, `loadTheme()`, `saveTheme(theme)`. Every
read is wrapped: unparseable or non-array JSON returns a safe default rather
than throwing. Every write is wrapped: quota-exceeded and private-mode failures
are caught and logged, never propagated into render.

**`hooks/useDebouncedEffect.js`** — runs a callback `delay` ms after its
dependencies stop changing. Clears its timer on unmount so a pending write
can't fire against a torn-down tree.

**`hooks/useNotes.js`** — owns the entire note domain: the `notes` array, the
`selectedId`, and the mutations `addNote`, `updateNoteBody`, `deleteNote`,
`selectNote`. Initializes from `loadNotes()` via lazy `useState`. Persists
through `useDebouncedEffect` at 500 ms. Returns the notes already sorted by
`updatedAt` descending. This is the single home for persistence logic.

**`hooks/useTheme.js`** — returns `[theme, toggleTheme]`. Initial value is the
stored theme, or `prefers-color-scheme` if nothing is stored. Syncs the `dark`
class onto `document.documentElement` and writes through to storage.

**`App.jsx`** — layout and wiring only. Calls the hooks once, holds the search
query and the mobile drawer/tab UI state, and passes props down. No business
logic.

**Components** are presentational and take everything as props. None of them
read from storage or own note state.

## Data Flow

1. Keystroke in `Editor` fires `onChange`.
2. `updateNoteBody(id, body)` updates React state synchronously, bumping
   `updatedAt`.
3. React re-renders: the preview, the sidebar title, and the date all update
   immediately. **The preview is never debounced** — debouncing it would make
   typing feel laggy.
4. Separately, `useDebouncedEffect` observes the `notes` array and, 500 ms
   after the last change, serializes the whole array to
   `react-notes-app.notes.v1`.

Writing the whole array rather than diffing individual notes is deliberate: at
prototype scale the payload is a few KB, and it removes an entire class of
partial-write bugs.

## Layout and Responsive Behavior

**`md` and up (≥768px):** three columns — sidebar (fixed ~280px), editor, and
preview. Editor and preview split the remaining width evenly with a visible
divider.

**Below `md`:** the sidebar becomes an off-canvas drawer, opened by a hamburger
in the header and closed by a backdrop tap or by selecting a note. The split
view collapses to a two-tab toggle (Editor / Preview) showing one pane at a
time — side-by-side panes under 768px are unreadable.

## Dark Mode

Tailwind v4 binds `dark:` to `prefers-color-scheme` by default, so a manual
toggle requires overriding the variant in CSS:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

`useTheme` then adds or removes `dark` on `<html>`. Verified against the
Tailwind v4 documentation.

## Error Handling

| Failure | Behavior |
| --- | --- |
| Corrupt / unparseable stored JSON | `loadNotes()` returns `[]`; app boots empty rather than white-screening |
| Stored value is valid JSON but not an array | Same as above |
| `localStorage` write throws (quota, private mode) | Caught and logged; the in-memory session keeps working |
| `localStorage` entirely unavailable | Reads return defaults, writes no-op; app runs as ephemeral |
| No notes exist | `EmptyState` prompts the user to create their first note |
| No note selected | `EmptyState` in the main pane |
| Search matches nothing | Empty-result message in the sidebar, with the note count preserved |

Deleting a note asks for confirmation inline on the list item (a small
confirm/cancel pair), not via `window.confirm`. After deleting the selected
note, selection falls to the next most recently updated note, or to none if the
list is now empty.

## Search

Case-insensitive substring match against both the derived title and the body.
Filtering only — it does not reorder results by relevance and does not
highlight matches. Search state lives in `App` and never touches storage, so a
query is not persisted across reloads.

## Testing

No test harness for this prototype. Verification is by running the dev server
and exercising each feature: create, edit across a reload, delete, search,
theme toggle and its persistence, and the mobile layout at a narrow viewport.

If tests are wanted later, `lib/notes.js` is the natural target — it is pure
and has no React or storage dependencies. Adding Vitest for it would be a
small, self-contained follow-up.

## Open Risks

- **`crypto.randomUUID()` requires a secure context.** Fine on `localhost` and
  HTTPS; would fail if the dev server were exposed over plain HTTP on a LAN
  address. A `Date.now()`-plus-random fallback is a one-line mitigation if that
  ever comes up.
- **`localStorage` is per-origin and per-browser.** Notes do not follow the
  user anywhere. This is understood and accepted for a prototype.
