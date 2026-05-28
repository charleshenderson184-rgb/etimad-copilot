"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

interface CalendarItem {
  id: string;
  title: string;
  deadline: Date;
  href: string;
  tender_status: string;
}

export function DeadlineCalendar({ items }: { items: CalendarItem[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const monthName = cursor.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      if (
        item.deadline.getFullYear() === year &&
        item.deadline.getMonth() === month
      ) {
        const key = String(item.deadline.getDate());
        const arr = map.get(key) ?? [];
        arr.push(item);
        map.set(key, arr);
      }
    }
    return map;
  }, [items, year, month]);

  const upcoming = useMemo(() => {
    return items
      .filter((i) => i.deadline >= today)
      .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
      .slice(0, 5);
  }, [items, today]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-0.5">
            Deadlines
          </p>
          <h3 className="font-bold text-stone-900 dark:text-stone-100">
            {monthName}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="w-7 h-7 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 transition-colors"
            aria-label="Previous month"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={() =>
              setCursor(
                new Date(today.getFullYear(), today.getMonth(), 1)
              )
            }
            className="text-xs px-2 py-1 rounded-md text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="w-7 h-7 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400 transition-colors"
            aria-label="Next month"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-[10px] font-semibold uppercase text-stone-400 dark:text-stone-500 text-center py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="aspect-square" />;
          }
          const dateObj = new Date(year, month, day);
          dateObj.setHours(0, 0, 0, 0);
          const isToday = dateObj.getTime() === today.getTime();
          const isPast = dateObj < today;
          const itemsOnDay = byDate.get(String(day)) ?? [];
          const hasItems = itemsOnDay.length > 0;

          return (
            <div
              key={i}
              className={`
                aspect-square rounded-md text-xs flex flex-col items-center justify-center relative
                ${isToday ? "bg-emerald-600 text-white font-bold" : ""}
                ${
                  !isToday && hasItems
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200 font-semibold"
                    : ""
                }
                ${
                  !isToday && !hasItems && isPast
                    ? "text-stone-300 dark:text-stone-600"
                    : ""
                }
                ${
                  !isToday && !hasItems && !isPast
                    ? "text-stone-600 dark:text-stone-400"
                    : ""
                }
              `}
              title={itemsOnDay.map((i) => i.title).join(", ")}
            >
              <span>{day}</span>
              {hasItems && !isToday && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
            </div>
          );
        })}
      </div>

      {upcoming.length > 0 && (
        <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
            Upcoming
          </p>
          <div className="space-y-2">
            {upcoming.map((item) => {
              const daysLeft = Math.ceil(
                (item.deadline.getTime() - today.getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block group"
                >
                  <div className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                        {item.deadline.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        daysLeft <= 3
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          : daysLeft <= 7
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                      }`}
                    >
                      {daysLeft === 0 ? "Today" : `${daysLeft}d`}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
