# React Notes App

A browser-local markdown note-taking app. Write in a plain textarea, see it
rendered live in the pane beside it. Everything is stored in `localStorage` —
no server, no account, no sync.

## Features

- **Create, edit, and delete notes** — deletion asks for inline confirmation
  rather than a browser dialog
- **Live markdown preview** — split view, editor left, preview right, updating
  on every keystroke
- **GitHub-flavored markdown** — tables, task lists, strikethrough, autolinks
- **Auto-save** — debounced 500 ms after you stop typing
- **Search** — filters the sidebar by title and body, case-insensitively
- **Dark / light mode** — remembers your choice, falls back to your OS setting
- **Responsive** — off-canvas sidebar and tabbed editor/preview on small screens

## Requirements

Node `^20.19.0 || >=22.12.0` (Vite 8's floor).

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run verify` | Run the end-to-end verification suite |

## Tech stack

| Concern | Choice |
| --- | --- |
| Build | Vite 8 |
| UI | React 19, functional components and hooks only |
| Styling | Tailwind v4 via `@tailwindcss/vite`, plus `@tailwindcss/typography` |
| Markdown | `react-markdown` + `remark-gfm` |
| Persistence | `localStorage` |

## Project structure

```
src/
  App.jsx                 layout and wiring only
  main.jsx                React root
  index.css               Tailwind import, dark variant, source scoping
  lib/
    notes.js              pure logic: create, derive title, search, sort, format
    storage.js            the only module that touches localStorage
  hooks/
    useNotes.js           note state, CRUD, debounced persistence
    useTheme.js           theme state, .dark class sync, persistence
    useDebouncedEffect.js generic debounced effect
  components/
    Sidebar.jsx           search + list + new note + mobile drawer shell
    NoteListItem.jsx      one row, with inline delete confirm
    SearchBar.jsx
    SplitPane.jsx         editor | preview, tab toggle on mobile
    Editor.jsx
    Preview.jsx
    ThemeToggle.jsx
    EmptyState.jsx
scripts/
  verify.mjs              end-to-end verification suite
docs/superpowers/         design spec and implementation plan
```

`useNotes` owns the entire note domain. `App` holds only UI state — the search
query and whether the mobile drawer is open — and passes everything down as
props. Components are presentational and never read from storage.

## How it works

### Notes have no title field

A note is `{ id, body, createdAt, updatedAt }`. The title in the sidebar is
**derived** from the body: the first non-empty line, with leading `#` characters
stripped, truncated to 60 characters, falling back to `"Untitled"`.

This means the sidebar can never drift out of sync with a note's content, and
there is no second field to fill in. The trade-off is that a note cannot be
titled differently from its first line.

### The preview is never debounced

Only the `localStorage` write is. React state updates on every keystroke, so the
preview and the sidebar title stay instant; a separate debounced effect
serializes the whole notes array 500 ms after the last change. Debouncing the
preview would make typing feel laggy.

Writing the entire array rather than diffing individual notes is deliberate — at
this scale the payload is a few KB, and it removes a class of partial-write bugs.

### Storage is defensive

`lib/storage.js` wraps every read and write. Corrupt JSON, a stored value that
isn't an array, notes missing required fields, a quota-exceeded write, or
`localStorage` being unavailable entirely all degrade to a safe default instead
of propagating into render. A corrupt entry boots an empty app, not a blank
screen.

Storage keys: `react-notes-app.notes.v1` and `react-notes-app.theme`.

### Dark mode

Tailwind v4 binds `dark:` to `prefers-color-scheme` by default. A manual toggle
needs the variant rebound to a class, which `src/index.css` does:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

`useTheme` then adds or removes `dark` on `<html>`.

### Tailwind source scoping

`src/index.css` excludes `docs/` and `scripts/` from Tailwind's automatic source
scanning:

```css
@source not "../docs";
@source not "../scripts";
```

The docs embed component source in code blocks and the verify script matches on
class names. Without these exclusions Tailwind generates CSS for classes the app
does not use — including ones deleted long ago.

## Verification

`npm run verify` bundles the app through Vite (so `vite.config.js` applies and
there is exactly one React copy), runs it in jsdom against real `localStorage`,
and drives it with real DOM events. 39 checks covering note CRUD, debounce
timing in both directions, GFM rendering, delete confirm and cancel, selection
fallback after deletion, rehydration across a reload, corrupt-storage boot,
theme persistence and OS fallback, and drawer and tab behavior.

**jsdom does not do layout or apply CSS**, so this verifies behavior and DOM
structure, not visual appearance. The responsive checks assert the state that
drives the Tailwind classes, not the rendered breakpoint. Check the real thing in
a browser.

## Limitations

This is a prototype.

- Notes live in one browser on one machine. Clearing site data deletes them.
- No export, folders, tags, pinning, or keyboard shortcuts.
- No note history — the browser's native textarea undo is all there is.
- `crypto.randomUUID()` needs a secure context. Fine on `localhost` and HTTPS;
  there is a timestamp-plus-random fallback for plain HTTP over a LAN address.
