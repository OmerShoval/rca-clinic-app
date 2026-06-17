"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

export interface NodeData {
  label: string;
  number?: number;
  url?: string;
  caption?: string;
  onLabelChange?: (label: string) => void;
  onUrlChange?: (url: string) => void;
  onCaptionChange?: (caption: string) => void;
}

export function EditableLabel({
  value,
  onChange,
  placeholder,
  className,
  style,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    if (draft.trim() !== value) onChange(draft.trim() || value);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "Enter" && !multiline) { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setDraft(value); setEditing(false); }
  }

  if (!editing) {
    return (
      <span
        onDoubleClick={() => { setDraft(value); setEditing(true); }}
        className={`cursor-text select-none block ${className ?? ""}`}
        style={style}
        title="Double-click to edit"
      >
        {value || <span className="opacity-40">{placeholder}</span>}
      </span>
    );
  }

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        placeholder={placeholder}
        rows={3}
        className={`bg-transparent outline-none resize-none w-full ${className ?? ""}`}
        style={style}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKey}
      placeholder={placeholder}
      className={`bg-transparent outline-none w-full ${className ?? ""}`}
      style={style}
    />
  );
}

export const handleStyle = {
  width: 10,
  height: 10,
  background: "rgba(224,182,79,0.7)",
  border: "1px solid rgba(224,182,79,0.4)",
  borderRadius: "50%",
};
