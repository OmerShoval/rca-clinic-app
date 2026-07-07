"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Props {
  studentSlug: string;
  initialUrl: string | null;
  onSave: (url: string) => void;
}

export function VoiceRecorder({ studentSlug, initialUrl, onSave }: Props) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSavedUrl(initialUrl);
  }, [initialUrl]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: getSupportedMime() });
      mediaRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mr.start(250);
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      setError("Microphone access denied");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function uploadRecording() {
    if (!audioUrl) return;
    setUploading(true);
    setError(null);
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const fd = new FormData();
      fd.append("file", blob, "note.webm");
      fd.append("studentSlug", studentSlug);

      const res = await fetch("/api/coach/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setSavedUrl(json.url);
      setAudioUrl(null);
      onSave(json.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function discardRecording() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-3">
      <p className="font-display text-[10px] tracking-widest text-ink-faint">Personal Voice Note</p>

      {/* Existing saved recording */}
      {savedUrl && !audioUrl && (
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}>
          <audio src={savedUrl} controls className="flex-1 h-8 min-w-0" style={{ filter: "invert(1) hue-rotate(180deg)" }} />
          <button
            onClick={() => setSavedUrl(null)}
            className="font-display text-[10px] tracking-widest text-coral hover:opacity-70 flex-shrink-0 min-h-11 px-1"
          >
            Replace
          </button>
        </div>
      )}

      {/* Recording controls */}
      {!audioUrl && (
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {recording ? (
              <motion.button
                key="stop"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={stopRecording}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 min-h-11 font-display text-[11px] tracking-widest text-coral"
                style={{ background: "var(--coral-soft)", border: "1px solid rgba(255,107,94,0.3)" }}
              >
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-coral"
                />
                Stop — {fmt(elapsed)}
              </motion.button>
            ) : (
              <motion.button
                key="record"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={startRecording}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 min-h-11 font-display text-[11px] tracking-widest text-teal"
                style={{ background: "var(--teal-soft)", border: "1px solid rgba(47,214,192,0.3)" }}
              >
                <div className="w-2 h-2 rounded-full bg-teal" />
                {savedUrl ? "Re-record" : "Record Note"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Recorded preview + upload */}
      <AnimatePresence>
        {audioUrl && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex flex-col gap-2 rounded-xl p-3"
            style={{ background: "var(--glass)", border: "1px solid var(--glass-edge)" }}
          >
            <audio src={audioUrl} controls className="w-full h-8" style={{ filter: "invert(1) hue-rotate(180deg)" }} />
            <div className="flex gap-2">
              <button
                onClick={uploadRecording}
                disabled={uploading}
                className="flex-1 rounded-lg py-2 min-h-11 font-display text-[11px] tracking-widest text-gold transition-opacity disabled:opacity-50"
                style={{ background: "var(--gold-soft)", border: "1px solid rgba(224,182,79,0.3)" }}
              >
                {uploading ? "Uploading…" : "Save Note"}
              </button>
              <button
                onClick={discardRecording}
                disabled={uploading}
                className="rounded-lg px-3 py-2 min-h-11 font-display text-[11px] tracking-widest text-ink-faint"
                style={{ border: "1px solid var(--glass-edge)" }}
              >
                Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-coral text-xs">{error}</p>}
    </div>
  );
}

function getSupportedMime(): string {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}
