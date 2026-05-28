"use client";

import { useEffect, useState } from "react";
import { ActivityEvent, listActivity } from "@/lib/api";

interface ActivityFeedProps {
  /** When set, scopes the feed to a single entity (e.g., one RFP). */
  entityType?: string;
  entityId?: string;
  limit?: number;
  title?: string;
  /** Compact removes outer card chrome — for embedding. */
  compact?: boolean;
}

/** Maps action codes to human label + dot color. */
function describe(event: ActivityEvent): { verb: string; color: string; icon: string } {
  const a = event.action;
  if (a === "rfp.uploaded") return { verb: "uploaded RFP", color: "bg-blue-500", icon: "↑" };
  if (a.startsWith("rfp.status_changed.won")) return { verb: "marked won", color: "bg-emerald-500", icon: "★" };
  if (a.startsWith("rfp.status_changed.lost")) return { verb: "marked lost", color: "bg-rose-500", icon: "·" };
  if (a.startsWith("rfp.status_changed.submitted")) return { verb: "submitted", color: "bg-violet-500", icon: "→" };
  if (a.startsWith("rfp.status_changed.in_progress")) return { verb: "moved to in progress", color: "bg-amber-500", icon: "·" };
  if (a.startsWith("rfp.status_changed.")) return { verb: `changed status`, color: "bg-stone-400", icon: "·" };
  if (a === "proposal.generated") return { verb: "generated proposal for", color: "bg-teal-500", icon: "✎" };
  if (a === "member.invited") return { verb: "invited", color: "bg-indigo-500", icon: "✉" };
  if (a === "member.invite_revoked") return { verb: "revoked invite for", color: "bg-stone-400", icon: "×" };
  if (a === "member.joined") return { verb: "joined the team", color: "bg-emerald-500", icon: "+" };
  if (a === "member.role_changed") return { verb: "updated role for", color: "bg-amber-500", icon: "·" };
  if (a === "member.removed") return { verb: "removed", color: "bg-rose-500", icon: "−" };
  return { verb: a, color: "bg-stone-400", icon: "·" };
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ActivityFeed({
  entityType,
  entityId,
  limit = 20,
  title = "Recent activity",
  compact = false,
}: ActivityFeedProps) {
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listActivity({ entity_type: entityType, entity_id: entityId, limit })
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId, limit]);

  const inner = (
    <>
      {events === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-2 w-2 mt-2 rounded-full bg-stone-300 dark:bg-stone-700" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-stone-200 dark:bg-stone-800" />
                <div className="h-2 w-1/4 rounded bg-stone-100 dark:bg-stone-900" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-sm text-stone-500 italic">No activity yet.</div>
      ) : (
        <ol className="relative space-y-3">
          <span
            aria-hidden
            className="absolute left-[5px] top-2 bottom-2 w-px bg-stone-200 dark:bg-stone-800"
          />
          {events.map((e) => {
            const d = describe(e);
            const who = e.actor_name || e.actor_email || "Someone";
            return (
              <li key={e.id} className="relative flex gap-3 text-sm">
                <span
                  className={`relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full ${d.color} ring-2 ring-white dark:ring-stone-900 flex-shrink-0`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-stone-900 dark:text-stone-100">
                    <span className="font-medium">{who}</span>{" "}
                    <span className="text-stone-600 dark:text-stone-400">{d.verb}</span>
                    {e.entity_label && (
                      <span className="font-medium"> {e.entity_label}</span>
                    )}
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {timeAgo(e.created_at)}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );

  if (compact) return inner;

  return (
    <section className="rounded-2xl bg-white dark:bg-stone-900 ring-1 ring-stone-200 dark:ring-stone-800 p-5">
      <h3 className="text-sm font-semibold text-stone-950 dark:text-stone-50 mb-4">
        {title}
      </h3>
      {inner}
    </section>
  );
}
