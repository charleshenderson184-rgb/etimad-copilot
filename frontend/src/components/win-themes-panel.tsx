"use client";

import { useEffect, useState } from "react";
import {
  createTheme,
  deleteTheme,
  listThemes,
  ThemeType,
  WinTheme,
} from "@/lib/api";
import { useToast } from "@/lib/toast";

const TYPE_META: Record<
  ThemeType,
  { label: string; labelAr: string; help: string; icon: React.ReactNode; tint: string; ring: string }
> = {
  win_theme: {
    label: "Win Themes",
    labelAr: "محاور الفوز",
    help: "Reasons the buyer should choose you. Woven through every section. Aim for 3–5.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
    tint: "from-emerald-500/15 to-emerald-700/5",
    ring: "ring-emerald-300/40 dark:ring-emerald-800/50",
  },
  discriminator: {
    label: "Discriminators",
    labelAr: "نقاط التميز",
    help: "What makes you uniquely qualified vs likely competitors. Provable, specific, measurable.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    ),
    tint: "from-blue-500/15 to-blue-700/5",
    ring: "ring-blue-300/40 dark:ring-blue-800/50",
  },
  ghost: {
    label: "Ghost Themes",
    labelAr: "نقاط ضعف المنافسين",
    help: "Your strengths positioned as gaps competitors can't fill — without naming them. Subtle.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    ),
    tint: "from-purple-500/15 to-purple-700/5",
    ring: "ring-purple-300/40 dark:ring-purple-800/50",
  },
};

export function WinThemesPanel({ proposalId }: { proposalId: string }) {
  const { show } = useToast();
  const [themes, setThemes] = useState<WinTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<ThemeType | null>(null);

  useEffect(() => {
    listThemes(proposalId)
      .then(setThemes)
      .finally(() => setLoading(false));
  }, [proposalId]);

  const byType = (type: ThemeType) => themes.filter((t) => t.theme_type === type);

  const handleAdd = async (
    type: ThemeType,
    title: string,
    description: string,
    evidence: string
  ) => {
    if (!title.trim()) return;
    try {
      const theme = await createTheme(proposalId, {
        theme_type: type,
        title: title.trim(),
        description: description.trim() || undefined,
        evidence: evidence.trim() || undefined,
        order_index: byType(type).length,
      });
      setThemes((prev) => [...prev, theme]);
      setAdding(null);
      show({ variant: "success", message: `${TYPE_META[type].label.slice(0, -1)} added.` });
    } catch (err) {
      show({
        variant: "error",
        message: err instanceof Error ? err.message : "Failed to add",
      });
    }
  };

  const handleDelete = async (theme: WinTheme) => {
    if (!confirm(`Delete "${theme.title}"?`)) return;
    try {
      await deleteTheme(proposalId, theme.id);
      setThemes((prev) => prev.filter((t) => t.id !== theme.id));
    } catch (err) {
      show({
        variant: "error",
        message: err instanceof Error ? err.message : "Delete failed",
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-44 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 mb-1">
          Persuasive spine
        </p>
        <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
          Win themes &amp; discriminators
        </h3>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-xl">
          Define why you win before drafting. These themes will be woven through every
          section of the generated proposal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["win_theme", "discriminator", "ghost"] as ThemeType[]).map((type) => {
          const meta = TYPE_META[type];
          const items = byType(type);
          return (
            <div
              key={type}
              className={`relative p-5 rounded-2xl bg-gradient-to-br ${meta.tint} bg-white dark:bg-stone-900 ring-1 ${meta.ring}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-stone-700 dark:text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {meta.icon}
                  </svg>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                    {meta.label}
                  </h4>
                </div>
                <span className="text-[10px] font-bold tabular-nums text-stone-400 dark:text-stone-500">
                  {items.length}
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed mb-3" dir="auto">
                {meta.help}
              </p>
              <p className="text-[10px] text-stone-400 dark:text-stone-500 mb-3" dir="rtl">
                {meta.labelAr}
              </p>

              <ul className="space-y-2 mb-3">
                {items.map((item, idx) => (
                  <li
                    key={item.id}
                    className="group relative p-3 rounded-lg bg-white dark:bg-stone-800 ring-1 ring-stone-100 dark:ring-stone-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 mt-0.5 flex-shrink-0">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                            {item.title}
                          </p>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-1.5 ml-6 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        {item.evidence && (
                          <div className="mt-2 ml-6 px-2 py-1 rounded text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                            <span className="font-semibold">Evidence:</span> {item.evidence}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(item)}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition-all flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {adding === type ? (
                <ThemeAddForm
                  onSubmit={(t, d, e) => handleAdd(type, t, d, e)}
                  onCancel={() => setAdding(null)}
                />
              ) : (
                <button
                  onClick={() => setAdding(type)}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 bg-white/60 dark:bg-stone-800/40 hover:bg-white dark:hover:bg-stone-800 ring-1 ring-stone-200/60 dark:ring-stone-700/60 hover:ring-stone-300 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  Add {type === "win_theme" ? "win theme" : type === "discriminator" ? "discriminator" : "ghost theme"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThemeAddForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (title: string, description: string, evidence: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");

  return (
    <div className="space-y-2 p-3 rounded-lg bg-white dark:bg-stone-800 ring-1 ring-emerald-200 dark:ring-emerald-800/60">
      <input
        type="text"
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (one line)"
        className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800 resize-none"
      />
      <input
        type="text"
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        placeholder="Evidence / proof point (optional)"
        className="w-full px-2.5 py-1.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-800"
      />
      <div className="flex gap-1.5">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 rounded text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(title, description, evidence)}
          disabled={!title.trim()}
          className="flex-1 py-1.5 rounded text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
