"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { useUploadManager } from "@/lib/upload-manager";
import type { UploadItem } from "@/lib/upload-manager";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadPanel() {
  const { items, activeCount, cancel, dismiss } = useUploadManager();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function openPanel() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  if (items.length === 0) return null;

  const allDone = items.every((i) => i.status !== "uploading");

  return (
    <>
      {/* Inline trigger button — renders in the sidebar header flex row */}
      <button
        ref={triggerRef}
        type="button"
        onClick={openPanel}
        className="relative px-3 py-2 rounded-xl font-display text-[10px] tracking-widest transition-colors"
        style={
          activeCount > 0
            ? {
                border: "1px solid rgba(224,182,79,0.4)",
                color: "var(--gold)",
                background: "var(--gold-soft)",
              }
            : {
                border: "1px solid var(--glass-edge)",
                color: "var(--ink-faint)",
                background: "transparent",
              }
        }
      >
        {activeCount > 0 ? "↑" : "✓"}
        {activeCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center font-display text-[8px]"
            style={{ background: "var(--coral)", color: "#fff" }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {/* Portal panel — floats above the layout, positioned by trigger coords */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={panelRef}
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: "fixed",
                  top: panelPos.top,
                  left: panelPos.left,
                  width: 296,
                  zIndex: 100,
                  background: "var(--depth)",
                  border: "1px solid var(--glass-edge)",
                  borderRadius: 16,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div className="flex items-center justify-between px-1">
                  <p className="font-display text-[9px] tracking-[0.2em] text-gold">
                    UPLOADS
                  </p>
                  {allDone && (
                    <button
                      type="button"
                      onClick={() => {
                        items.forEach((i) => dismiss(i.id));
                        setOpen(false);
                      }}
                      className="font-display text-[8px] tracking-widest text-ink-faint hover:text-coral"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((item) => (
                    <UploadRow
                      key={item.id}
                      item={item}
                      onCancel={cancel}
                      onDismiss={dismiss}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function UploadRow({
  item,
  onCancel,
  onDismiss,
}: {
  item: UploadItem;
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    if (!item.resultUrl) return;
    navigator.clipboard.writeText(item.resultUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2"
      style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
    >
      {/* Name row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-display text-[10px] tracking-wide text-ink truncate">
            {item.fileName}
          </p>
          <p className="font-display text-[8px] tracking-widest text-ink-faint">
            {item.studentName} · {formatBytes(item.fileSize)}
          </p>
        </div>
        {item.status === "uploading" ? (
          <button
            type="button"
            onClick={() => onCancel(item.id)}
            className="font-display text-[8px] tracking-widest text-coral flex-shrink-0"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            className="font-display text-[8px] tracking-widest text-ink-faint hover:text-coral flex-shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      {/* Progress bar */}
      {item.status === "uploading" && (
        <>
          <div
            className="w-full h-1 rounded-full overflow-hidden"
            style={{ background: "var(--abyss)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--gold)" }}
              animate={{ width: `${item.progress}%` }}
              transition={{ ease: "linear", duration: 0.3 }}
            />
          </div>
          <p className="font-display text-[8px] tracking-widest text-gold">
            {item.progress}%
          </p>
        </>
      )}

      {/* Done */}
      {item.status === "done" && (
        <div className="flex items-center justify-between">
          <p className="font-display text-[9px] tracking-widest text-teal">✓ Done</p>
          {item.resultUrl && (
            <button
              type="button"
              onClick={copyUrl}
              className="font-display text-[8px] tracking-widest transition-colors"
              style={{ color: copied ? "var(--teal)" : "var(--ink-faint)" }}
            >
              {copied ? "Copied!" : "Copy URL"}
            </button>
          )}
        </div>
      )}

      {/* Failed */}
      {item.status === "failed" && (
        <p
          className="font-display text-[8px] tracking-widest truncate"
          style={{ color: "var(--coral)" }}
        >
          Error: {item.error ?? "Upload failed"}
        </p>
      )}
    </div>
  );
}
