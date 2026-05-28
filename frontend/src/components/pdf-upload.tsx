"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadRFP } from "@/lib/api";

export function PdfUpload() {
  const router = useRouter();
  const labelRef = useRef<HTMLLabelElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Please upload a PDF file — يرجى رفع ملف PDF فقط");
        return;
      }

      setError(null);
      setIsUploading(true);

      try {
        const rfp = await uploadRFP(file);
        router.push(`/rfp/${rfp.id}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed — فشل الرفع"
        );
      } finally {
        setIsUploading(false);
      }
    },
    [router]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Track cursor for the radial light effect
  const handleMouseMove = (e: React.MouseEvent<HTMLLabelElement>) => {
    const el = labelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <label
        ref={labelRef}
        onDrop={handleDrop}
        onMouseMove={handleMouseMove}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`
          relative group flex flex-col items-center justify-center w-full
          h-80 rounded-3xl cursor-pointer
          transition-all duration-500 ease-out
          ${
            isDragging
              ? "bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-600 ring-offset-4 ring-offset-stone-50 dark:ring-offset-stone-950 scale-[1.01]"
              : "glass-strong hover:shadow-elev-3 ring-1 ring-stone-200/60 dark:ring-stone-800/60 hover:ring-emerald-300 dark:hover:ring-emerald-700"
          }
          ${isUploading ? "pointer-events-none opacity-70" : ""}
          shadow-elev-2 hover:-translate-y-1
          overflow-hidden
        `}
        style={{
          backgroundImage: isDragging
            ? "none"
            : `radial-gradient(500px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(16, 185, 129, 0.08), transparent 40%)`,
        }}
      >
        {/* Animated decorative dashed border inside */}
        <div className="absolute inset-3 rounded-2xl border-2 border-dashed border-stone-200 group-hover:border-emerald-300 transition-colors pointer-events-none" />

        {/* Subtle glow rings on drag */}
        {isDragging && (
          <>
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-700 opacity-20 blur-xl animate-pulse pointer-events-none" />
            <div className="absolute inset-0 rounded-3xl ring-4 ring-emerald-500/30 animate-pulse pointer-events-none" />
          </>
        )}

        {isUploading ? (
          <div className="text-center z-10">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
              <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full bg-emerald-50 animate-pulse" />
            </div>
            <p className="text-base font-medium text-stone-900">
              Uploading your tender...
            </p>
            <p className="text-sm text-stone-500 mt-1" dir="rtl">
              جاري الرفع...
            </p>
          </div>
        ) : (
          <div className="text-center px-8 z-10">
            <div className="relative inline-flex items-center justify-center w-16 h-16 mb-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 ring-1 ring-emerald-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500">
              <svg
                className="w-7 h-7 text-emerald-700 transition-transform duration-500 group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
              {/* Animated ring */}
              <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/0 group-hover:ring-emerald-400/40 group-hover:scale-125 transition-all duration-500" />
            </div>
            <p className="text-lg font-semibold text-stone-900 mb-1">
              Drop your RFP here
            </p>
            <p className="text-sm text-stone-500 mb-3" dir="rtl">
              اسحب ملف المنافسة هنا
            </p>
            <p className="text-sm text-stone-400">
              or{" "}
              <span className="text-emerald-700 font-medium underline-offset-2 group-hover:underline">
                browse files
              </span>
            </p>
            <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-xs text-stone-500 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors">
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                  clipRule="evenodd"
                />
              </svg>
              PDF · Max 50MB
            </div>
          </div>
        )}
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center animate-fade-in">
          <div className="font-medium">{error}</div>
        </div>
      )}
    </div>
  );
}
