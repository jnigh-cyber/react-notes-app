/**
 * End-to-end verification. Bundles the real app through Vite (so vite.config.js
 * applies and there is exactly one React copy), runs it in jsdom against real
 * localStorage, and drives it with real DOM events.
 *
 * Run with: npm run verify
 *
 * Caveat: jsdom does not do layout or apply CSS, so this verifies behavior and
 * DOM structure, not visual appearance. Responsive checks assert the state that
 * drives the Tailwind classes, not the rendered breakpoint.
 */
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { build } from "vite";
import { JSDOM } from "jsdom";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const NOTES_KEY = "react-notes-app.notes.v1";
const THEME_KEY = "react-notes-app.theme";

const results = [];
let failed = 0;
function check(label, fn) {
  try {
    fn();
    results.push(`PASS  ${label}`);
  } catch (error) {
    results.push(`FAIL  ${label}\n        ${error.message}`);
    failed += 1;
    process.exitCode = 1;
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function eq(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
  }
}

// --- bundle -------------------------------------------------------------
// Built as a single IIFE so the app runs from one <script> with exactly one
// React copy. vite.config.js is auto-loaded, so this is the real pipeline.
const output = await build({
  root: ROOT,
  logLevel: "error",
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": "({})",
  },
  build: {
    write: false,
    minify: false,
    lib: {
      entry: `${ROOT}/src/main.jsx`,
      formats: ["iife"],
      name: "NotesApp",
      fileName: () => "app.js",
    },
  },
});

const chunks = (Array.isArray(output) ? output : [output]).flatMap((o) =>
  Array.isArray(o?.output) ? o.output : []
);
const entry = chunks.find((c) => c.type === "chunk" && c.isEntry);
if (!entry) throw new Error("could not find the built entry chunk");
const code = entry.code;

// --- boot ---------------------------------------------------------------
function boot(preloadedState = null) {
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body><div id="root"></div></body></html>`,
    { url: "http://localhost:5173", runScripts: "dangerously", pretendToBeVisual: true }
  );
  const win = dom.window;

  // Any `process` reference the bundler left behind would be undefined in a
  // browser-like context; shim it so the app boots.
  win.process = { env: { NODE_ENV: "production" } };

  // jsdom has no matchMedia; useTheme guards for it, but stub it so the
  // system-preference branch is exercised rather than skipped.
  win.matchMedia = (query) => ({
    matches: query.includes("dark") ? Boolean(win.__prefersDark) : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  });

  if (preloadedState) {
    for (const [key, value] of Object.entries(preloadedState)) {
      win.localStorage.setItem(key, value);
    }
  }

  return { dom, win };
}

// React 19 renders concurrently, so a 0ms tick can land before the first
// commit. 25ms clears it in the common case.
const tick = (ms = 25) => new Promise((r) => setTimeout(r, ms));

/**
 * Poll until `predicate` holds. Fixed sleeps are flaky here: jsdom runs
 * injected scripts through an async resource queue and React commits
 * concurrently, so under load a fixed wait can land before the first paint.
 */
async function waitFor(predicate, { timeout = 5000, interval = 5 } = {}) {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (predicate()) return true;
    if (Date.now() > deadline) return false;
    await new Promise((r) => setTimeout(r, interval));
  }
}

async function run(win) {
  const script = win.document.createElement("script");
  script.textContent = code;
  win.document.body.appendChild(script);

  const rendered = await waitFor(
    () => win.document.getElementById("root")?.childElementCount > 0
  );
  if (!rendered) throw new Error("app never rendered into #root");
  await tick();
}

// --- DOM helpers --------------------------------------------------------
const q = (win, sel) => win.document.querySelector(sel);
const qa = (win, sel) => [...win.document.querySelectorAll(sel)];
const byTest = (win, id) => q(win, `[data-testid="${id}"]`);
const allByTest = (win, id) => qa(win, `[data-testid="${id}"]`);

function click(win, el) {
  assert(el, "tried to click a missing element");
  el.dispatchEvent(new win.MouseEvent("click", { bubbles: true, cancelable: true }));
}

function typeInto(win, el, text) {
  assert(el, "tried to type into a missing element");
  const proto =
    el.tagName === "TEXTAREA" ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, text);
  el.dispatchEvent(new win.Event("input", { bubbles: true }));
}

const titles = (win) => allByTest(win, "note-title").map((el) => el.textContent);

// ========================================================================
// Session 1: create, edit, preview, persistence
// ========================================================================
{
  const { win } = boot();
  await run(win);
  await tick();

  check("1. boots to the empty state", () => {
    assert(byTest(win, "empty-state"), "no empty state rendered");
    assert(
      byTest(win, "empty-state").textContent.includes("No notes yet"),
      "empty state should say 'No notes yet'"
    );
    eq(byTest(win, "note-count").textContent, "0 notes", "note count");
  });

  click(win, byTest(win, "new-note"));
  await tick();

  check("2. New note creates, selects, and opens an editor", () => {
    eq(allByTest(win, "note-item").length, 1, "note count in sidebar");
    assert(byTest(win, "editor"), "editor not rendered");
    eq(byTest(win, "editor").value, "", "new note body should be empty");
    eq(byTest(win, "note-item").dataset.selected, "true", "new note should be selected");
    eq(titles(win)[0], "Untitled", "empty note title");
  });

  typeInto(win, byTest(win, "editor"), "# Groceries\n\nmilk and eggs");
  await tick();

  check("3. sidebar title derives from the body live", () => {
    eq(titles(win)[0], "Groceries", "derived title");
  });

  check("4. preview renders markdown immediately (not debounced)", () => {
    const html = byTest(win, "preview").innerHTML;
    assert(html.includes("<h1"), `expected an <h1> in preview, got: ${html.slice(0, 120)}`);
    assert(html.includes("Groceries"), "heading text missing from preview");
    assert(html.includes("milk and eggs"), "paragraph text missing from preview");
  });

  check("5. nothing written to localStorage before the debounce elapses", () => {
    const raw = JSON.parse(win.localStorage.getItem(NOTES_KEY) ?? "[]");
    assert(
      raw[0]?.body !== "# Groceries\n\nmilk and eggs",
      "body hit localStorage before the 500ms debounce"
    );
  });

  await tick(700);

  check("6. persisted after the 500ms debounce", () => {
    const raw = JSON.parse(win.localStorage.getItem(NOTES_KEY));
    eq(raw.length, 1, "stored note count");
    eq(raw[0].body, "# Groceries\n\nmilk and eggs", "stored body");
    assert(!("title" in raw[0]), "note must not carry a stored title field");
    assert(typeof raw[0].createdAt === "number", "createdAt should be a number");
  });

  // --- GFM ---
  typeInto(
    win,
    byTest(win, "editor"),
    "# GFM\n\n| Item | Qty |\n| --- | --- |\n| Tea | 2 |\n\n- [ ] todo\n- [x] done\n\n~~struck~~"
  );
  await tick();

  check("7. remark-gfm renders tables", () => {
    const html = byTest(win, "preview").innerHTML;
    assert(html.includes("<table"), "no <table> in preview");
    assert(html.includes("<td") || html.includes("<th"), "table has no cells");
  });

  check("8. remark-gfm renders task list checkboxes", () => {
    const html = byTest(win, "preview").innerHTML;
    assert(html.includes('type="checkbox"'), "no checkbox in preview");
  });

  check("9. remark-gfm renders strikethrough", () => {
    const html = byTest(win, "preview").innerHTML;
    assert(html.includes("<del"), "no <del> in preview");
  });

  // --- second note + sorting ---
  click(win, byTest(win, "new-note"));
  await tick(10);
  typeInto(win, byTest(win, "editor"), "# Recipes");
  await tick();

  check("10. newest note sorts to the top of the sidebar", () => {
    eq(titles(win)[0], "Recipes", "top note");
    eq(allByTest(win, "note-item").length, 2, "sidebar note count");
    eq(byTest(win, "note-count").textContent, "2 notes", "header count");
  });

  // --- search ---
  // Note 1's body was replaced with the GFM sample above, so the two notes
  // are now "GFM" and "Recipes".
  typeInto(win, byTest(win, "search"), "recip");
  await tick();

  check("11a. search filters by title", () => {
    eq(allByTest(win, "note-item").length, 1, "filtered count");
    eq(titles(win)[0], "Recipes", "matched title");
  });

  typeInto(win, byTest(win, "search"), "TEA");
  await tick();

  check("11b. search matches body text, case-insensitively", () => {
    eq(allByTest(win, "note-item").length, 1, "filtered count");
    eq(titles(win)[0], "GFM", "matched note (body contains 'Tea')");
  });

  typeInto(win, byTest(win, "search"), "zzzzz");
  await tick();

  check("12. search miss shows the empty-result message", () => {
    eq(allByTest(win, "note-item").length, 0, "should show no items");
    assert(
      byTest(win, "list-empty")?.textContent.includes("No notes match your search"),
      "missing 'no match' copy"
    );
  });

  typeInto(win, byTest(win, "search"), "");
  await tick();

  check("13. clearing search restores every note", () => {
    eq(allByTest(win, "note-item").length, 2, "restored count");
  });

  // --- delete cancel ---
  click(win, allByTest(win, "delete-start")[0]);
  await tick();

  check("14. delete asks for inline confirmation", () => {
    assert(byTest(win, "delete-confirm"), "no confirm button");
    assert(byTest(win, "delete-cancel"), "no cancel button");
  });

  click(win, byTest(win, "delete-cancel"));
  await tick();

  check("15. cancelling a delete removes nothing", () => {
    eq(allByTest(win, "note-item").length, 2, "count after cancel");
    assert(!byTest(win, "delete-confirm"), "confirm button should be gone");
  });

  // --- delete selected ---
  const selectedTitleBefore = titles(win)[0];
  click(win, allByTest(win, "delete-start")[0]);
  await tick();
  click(win, byTest(win, "delete-confirm"), 0);
  await tick();

  check("16. confirming deletes the note", () => {
    eq(allByTest(win, "note-item").length, 1, "count after delete");
    assert(titles(win)[0] !== selectedTitleBefore, "the wrong note was deleted");
  });

  check("17. selection falls back to the surviving note", () => {
    eq(byTest(win, "note-item").dataset.selected, "true", "survivor should be selected");
    assert(byTest(win, "editor"), "editor should still be rendered");
  });

  // --- delete all ---
  click(win, byTest(win, "delete-start"));
  await tick();
  click(win, byTest(win, "delete-confirm"));
  await tick();

  check("18. deleting the last note returns to the empty state", () => {
    eq(allByTest(win, "note-item").length, 0, "no items left");
    assert(byTest(win, "empty-state"), "empty state not shown");
    assert(!byTest(win, "editor"), "editor should be gone");
    assert(byTest(win, "list-empty").textContent.includes("No notes yet"), "sidebar copy");
  });

  await tick(700);
  check("19. the emptied state persists", () => {
    eq(win.localStorage.getItem(NOTES_KEY), "[]", "stored notes");
  });
}

// ========================================================================
// Session 2: reload / rehydration
// ========================================================================
{
  const stored = JSON.stringify([
    { id: "old", body: "# Older note", createdAt: 1, updatedAt: 1000 },
    { id: "new", body: "# Newer note", createdAt: 2, updatedAt: 2000 },
  ]);
  const { win } = boot({ [NOTES_KEY]: stored });
  await run(win);
  await tick();

  check("20. rehydrates notes from localStorage on load", () => {
    eq(allByTest(win, "note-item").length, 2, "restored count");
    eq(byTest(win, "note-count").textContent, "2 notes", "header count");
  });

  check("21. restored notes are ordered newest-first", () => {
    eq(titles(win)[0], "Newer note", "first");
    eq(titles(win)[1], "Older note", "second");
  });

  check("22. the most recent note is auto-selected and open", () => {
    eq(allByTest(win, "note-item")[0].dataset.selected, "true", "selection");
    eq(byTest(win, "editor").value, "# Newer note", "editor content");
  });

  click(win, allByTest(win, "note-item")[1]);
  await tick();

  check("23. clicking a note opens it", () => {
    eq(byTest(win, "editor").value, "# Older note", "editor content after select");
    eq(allByTest(win, "note-item")[1].dataset.selected, "true", "selection moved");
  });
}

// ========================================================================
// Session 3: corrupt storage
// ========================================================================
{
  const { win } = boot({ [NOTES_KEY]: "{{{ not json at all" });
  await run(win);
  await tick();

  check("24. corrupt stored JSON boots to an empty app, not a crash", () => {
    assert(byTest(win, "empty-state"), "app failed to render with corrupt storage");
    eq(allByTest(win, "note-item").length, 0, "should be no notes");
  });
}

// ========================================================================
// Session 4: theme
// ========================================================================
{
  const { win } = boot();
  await run(win);
  // Theme is written to storage by an effect, so wait for it to land.
  await waitFor(() => win.localStorage.getItem(THEME_KEY) !== null);

  const html = win.document.documentElement;

  check("25. defaults to light when the OS has no dark preference", () => {
    assert(!html.classList.contains("dark"), "should not start dark");
    eq(win.localStorage.getItem(THEME_KEY), "light", "persisted theme");
  });

  click(win, byTest(win, "theme-toggle"));
  await waitFor(() => html.classList.contains("dark"));

  check("26. toggling adds the .dark class to <html>", () => {
    assert(html.classList.contains("dark"), ".dark class not applied");
    eq(win.localStorage.getItem(THEME_KEY), "dark", "persisted theme");
  });

  click(win, byTest(win, "theme-toggle"));
  await waitFor(() => !html.classList.contains("dark"));

  check("27. toggling back removes it", () => {
    assert(!html.classList.contains("dark"), ".dark class not removed");
    eq(win.localStorage.getItem(THEME_KEY), "light", "persisted theme");
  });
}

{
  const { win } = boot({ [THEME_KEY]: "dark" });
  await run(win);
  // The .dark class is applied by an effect, which lands after the first
  // commit; wait for it rather than assuming a fixed delay covers it.
  await waitFor(() => win.document.documentElement.classList.contains("dark"));

  check("28. a stored dark theme survives a reload", () => {
    assert(win.document.documentElement.classList.contains("dark"), "theme did not persist");
  });
}

{
  const { win } = boot();
  win.__prefersDark = true;
  await run(win);
  await waitFor(() => win.document.documentElement.classList.contains("dark"));

  check("29. with nothing stored, follows the OS dark preference", () => {
    assert(
      win.document.documentElement.classList.contains("dark"),
      "should have followed prefers-color-scheme: dark"
    );
  });
}

// ========================================================================
// Session 5: mobile drawer + editor/preview tabs
// ========================================================================
{
  const { win } = boot();
  await run(win);
  await tick();
  click(win, byTest(win, "new-note"));
  await tick();
  typeInto(win, byTest(win, "editor"), "# Mobile");
  await tick();

  check("30. drawer starts closed", () => {
    eq(byTest(win, "sidebar").dataset.open, "false", "sidebar open state");
    assert(!byTest(win, "drawer-backdrop"), "backdrop should not be present");
  });

  click(win, byTest(win, "open-drawer"));
  await tick();

  check("31. hamburger opens the drawer with a backdrop", () => {
    eq(byTest(win, "sidebar").dataset.open, "true", "sidebar open state");
    assert(byTest(win, "drawer-backdrop"), "backdrop missing");
  });

  click(win, byTest(win, "drawer-backdrop"));
  await tick();

  check("32. tapping the backdrop closes the drawer", () => {
    eq(byTest(win, "sidebar").dataset.open, "false", "sidebar should be closed");
  });

  click(win, byTest(win, "open-drawer"));
  await tick();
  click(win, byTest(win, "note-item"));
  await tick();

  check("33. selecting a note closes the drawer", () => {
    eq(byTest(win, "sidebar").dataset.open, "false", "drawer should close on select");
  });

  click(win, byTest(win, "open-drawer"));
  await tick();
  click(win, byTest(win, "new-note"));
  await tick();

  check("34. creating a note closes the drawer", () => {
    eq(byTest(win, "sidebar").dataset.open, "false", "drawer should close on add");
  });

  // tabs
  check("35. editor tab is active by default", () => {
    const editorPane = byTest(win, "editor").parentElement;
    const previewPane = byTest(win, "preview").parentElement;
    assert(editorPane.className.includes("block"), "editor pane should be shown");
    assert(previewPane.className.includes("hidden"), "preview pane should be hidden on mobile");
  });

  click(win, byTest(win, "tab-preview"));
  await tick();

  check("36. switching to the preview tab swaps the visible pane", () => {
    const editorPane = byTest(win, "editor").parentElement;
    const previewPane = byTest(win, "preview").parentElement;
    assert(editorPane.className.includes("hidden"), "editor pane should hide");
    assert(previewPane.className.includes("block"), "preview pane should show");
  });

  click(win, byTest(win, "tab-editor"));
  await tick();

  check("37. switching back returns to the editor", () => {
    assert(byTest(win, "editor").parentElement.className.includes("block"), "editor should show");
  });

  // switching notes resets the tab (the key={id} remount)
  click(win, byTest(win, "tab-preview"));
  await tick();
  click(win, byTest(win, "open-drawer"));
  await tick();
  click(win, allByTest(win, "note-item")[1]);
  await tick();

  check("38. opening a different note resets the tab to Editor", () => {
    assert(
      byTest(win, "editor").parentElement.className.includes("block"),
      "tab should reset to editor when switching notes"
    );
  });
}

// ------------------------------------------------------------------------
console.log(results.join("\n"));
const passed = results.filter((r) => r.startsWith("PASS")).length;
console.log(`\n${passed}/${results.length} passed, ${failed} failed`);
