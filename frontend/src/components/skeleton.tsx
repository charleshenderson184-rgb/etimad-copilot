"use client";

/** Branded shimmer skeleton. Use to mock the actual content shape during load. */
export function Skeleton({
  className = "",
  rounded = "rounded-md",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-stone-100 dark:bg-stone-800 ${rounded} ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-stone-700/60 to-transparent" />
    </div>
  );
}

/** Tender card skeleton — mimics the layout of a real card in /dashboard or /discover. */
export function TenderCardSkeleton() {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="w-10 h-10 flex-shrink-0" rounded="rounded-xl" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="w-20 h-7" rounded="rounded-md" />
      </div>
    </div>
  );
}

/** Discover-style tender row with circular match badge. */
export function DiscoverCardSkeleton() {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 p-5">
      <div className="flex items-start gap-5">
        <Skeleton className="w-16 h-16 flex-shrink-0" rounded="rounded-full" />
        <div className="flex-1 space-y-2.5">
          <div className="flex gap-1.5">
            <Skeleton className="h-4 w-16" rounded="rounded-md" />
            <Skeleton className="h-4 w-20" rounded="rounded-md" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="w-20 h-8" rounded="rounded-lg" />
      </div>
    </div>
  );
}

/** Stat tile skeleton (matches bento-grid stat layout). */
export function StatTileSkeleton({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <div
      className={`bg-white dark:bg-stone-900 rounded-3xl ring-1 ring-stone-200 dark:ring-stone-800 p-6 ${
        size === "lg" ? "min-h-[180px]" : "min-h-[120px]"
      }`}
    >
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className={size === "lg" ? "h-12 w-24 mb-2" : "h-9 w-16 mb-2"} />
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

/** Form field skeleton. */
export function FieldSkeleton() {
  return (
    <div>
      <Skeleton className="h-3 w-24 mb-2" />
      <Skeleton className="h-10 w-full" rounded="rounded-lg" />
    </div>
  );
}

/** Markdown article skeleton — for proposal viewer body. */
export function ArticleSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="h-4" />
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
