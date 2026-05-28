"use client";

import { useEffect, useState } from "react";
import {
  CommentResponse,
  createComment,
  deleteComment,
  listComments,
  listTeamMembers,
  TeamMemberResponse,
} from "@/lib/api";

interface CommentsPanelProps {
  targetType: "rfp" | "proposal" | "requirement";
  targetId: string;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

/** Highlight @mentions in plain-text body. */
function renderBody(body: string) {
  const parts = body.split(/(@[A-Za-z0-9._%+\-]+(?:@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})?)/g);
  return parts.map((p, i) =>
    p.startsWith("@") ? (
      <span
        key={i}
        className="font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 rounded"
      >
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function CommentsPanel({ targetType, targetId }: CommentsPanelProps) {
  const [comments, setComments] = useState<CommentResponse[] | null>(null);
  const [members, setMembers] = useState<TeamMemberResponse[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionPicker, setMentionPicker] = useState<{
    query: string;
    start: number;
  } | null>(null);

  const refresh = async () => {
    const data = await listComments(targetType, targetId);
    setComments(data);
  };

  useEffect(() => {
    refresh();
    listTeamMembers().then(setMembers).catch(() => setMembers([]));
  }, [targetType, targetId]);

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    // Detect active @mention: last @ followed by a word, not yet terminated by whitespace
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const m = before.match(/@([A-Za-z0-9._\-]*)$/);
    if (m) {
      setMentionPicker({ query: m[1].toLowerCase(), start: cursor - m[0].length });
    } else {
      setMentionPicker(null);
    }
  };

  const insertMention = (email: string) => {
    if (!mentionPicker) return;
    const before = body.slice(0, mentionPicker.start);
    const after = body.slice(mentionPicker.start).replace(/^@[A-Za-z0-9._\-]*/, "");
    const next = `${before}@${email} ${after.trimStart()}`;
    setBody(next);
    setMentionPicker(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await createComment(targetType, targetId, body.trim());
      setBody("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteComment(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const mentionMatches = mentionPicker
    ? members
        .filter((m) => {
          if (!mentionPicker.query) return true;
          const q = mentionPicker.query;
          return (
            m.email.toLowerCase().includes(q) ||
            (m.name && m.name.toLowerCase().includes(q))
          );
        })
        .slice(0, 5)
    : [];

  return (
    <section className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
          Discussion
        </h3>
        <span className="text-xs text-stone-500">
          {comments === null ? "…" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {comments === null ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-8 w-8 rounded-full bg-stone-200 dark:bg-stone-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-stone-200 dark:bg-stone-800 rounded" />
                <div className="h-3 w-full bg-stone-100 dark:bg-stone-900 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-stone-500 italic mb-4">
          No comments yet. Start the discussion — use @ to mention a teammate.
        </p>
      ) : (
        <ul className="space-y-4 mb-5">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold">
                {(c.author_name || c.author_email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-stone-950 dark:text-stone-50">
                    {c.author_name || c.author_email}
                  </span>
                  <span className="text-xs text-stone-500">{timeAgo(c.created_at)}</span>
                  {c.mentioned_user_ids.length > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      · notified {c.mentioned_user_ids.length}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="ml-auto text-xs text-stone-400 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap mt-0.5">
                  {renderBody(c.body)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="relative">
        <textarea
          value={body}
          onChange={handleBodyChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              submit(e as unknown as React.FormEvent);
            }
            if (e.key === "Escape") setMentionPicker(null);
          }}
          rows={3}
          placeholder="Add a comment. Use @email to mention a teammate."
          className="w-full rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
        {mentionPicker && mentionMatches.length > 0 && (
          <div className="absolute left-3 bottom-full mb-1 w-64 max-w-full rounded-xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 shadow-lg z-10 overflow-hidden">
            {mentionMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => insertMention(m.email)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-[10px] font-semibold">
                  {(m.name || m.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-stone-950 dark:text-stone-50 truncate">
                    {m.name || m.email}
                  </div>
                  <div className="text-xs text-stone-500 truncate">{m.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-stone-500">⌘+Enter to post</span>
          <button
            type="submit"
            disabled={posting || !body.trim()}
            className="rounded-lg bg-stone-900 dark:bg-emerald-600 text-white text-sm font-medium px-4 py-2 hover:bg-stone-800 dark:hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? "Posting…" : "Post comment"}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}
      </form>
    </section>
  );
}
