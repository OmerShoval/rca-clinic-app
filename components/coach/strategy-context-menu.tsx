"use client";

import { useEffect, useRef } from "react";

interface Props {
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onClose: () => void;
}

export function StrategyContextMenu({ x, y, nodeId, edgeId, onDelete, onDuplicate, onClose }: Props) {
  const id = nodeId ?? edgeId ?? "";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl py-1 shadow-2xl"
      style={{ left: x, top: y, background: "var(--depth)", border: "1px solid var(--glass-edge)", minWidth: 150 }}
    >
      {onDuplicate && (
        <button
          onClick={() => onDuplicate(id)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-70 transition-opacity"
        >
          <span className="text-ink-faint text-sm">⧉</span>
          <span className="font-display text-[11px] tracking-wide text-ink">Duplicate</span>
        </button>
      )}
      <button
        onClick={() => onDelete(id)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-70 transition-opacity"
      >
        <span className="text-coral text-sm">✕</span>
        <span className="font-display text-[11px] tracking-wide text-coral">Delete</span>
      </button>
    </div>
  );
}
