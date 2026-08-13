import { useState } from "react";
import Editor from "./Editor.jsx";
import Preview from "./Preview.jsx";

const TABS = [
  { id: "editor", label: "Editor" },
  { id: "preview", label: "Preview" },
];

export default function SplitPane({ body, onChange }) {
  const [activeTab, setActiveTab] = useState("editor");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex border-b border-slate-200 md:hidden dark:border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          className={`min-h-0 flex-1 overflow-y-auto md:block ${
            activeTab === "editor" ? "block" : "hidden"
          }`}
        >
          <Editor value={body} onChange={onChange} />
        </div>

        <div className="hidden w-px shrink-0 bg-slate-200 md:block dark:bg-slate-800" />

        <div
          className={`min-h-0 flex-1 overflow-y-auto md:block ${
            activeTab === "preview" ? "block" : "hidden"
          }`}
        >
          <Preview body={body} />
        </div>
      </div>
    </div>
  );
}
