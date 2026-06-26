"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ContextNode } from "./strategy-nodes/context-node";
import { GoalNode } from "./strategy-nodes/goal-node";
import { FactorNode } from "./strategy-nodes/factor-node";
import { StepNode } from "./strategy-nodes/step-node";
import { MediaNode } from "./strategy-nodes/media-node";
import { SectionNode } from "./strategy-nodes/section-node";
import { StrategyToolbar, NodeType } from "./strategy-toolbar";
import { StrategyContextMenu } from "./strategy-context-menu";
import { uploadFileDirect } from "@/lib/upload-client";

const nodeTypes = {
  context: ContextNode,
  goal: GoalNode,
  factor: FactorNode,
  step: StepNode,
  media: MediaNode,
  section: SectionNode,
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function makeNode(type: NodeType, position: { x: number; y: number }, extraData?: Record<string, unknown>): Node {
  return {
    id: `${type}-${uid()}`,
    type,
    position,
    data: {
      label: "",
      ...(extraData ?? {}),
    },
    ...(type === "section" ? { style: { width: 300, height: 180 } } : {}),
  };
}

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

interface StrategyCanvasProps {
  studentId: string;
  studentSlug: string;
  studentName: string;
}

function StrategyCanvas({ studentId, studentSlug, studentName }: StrategyCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId?: string; edgeId?: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Map of step node ID → count of "I felt it" threads from student
  const [feltItCounts, setFeltItCounts] = useState<Record<string, number>>({});

  // Undo/redo stacks — snapshots before each change
  const historyRef = useRef<Snapshot[]>([]);
  const futureRef = useRef<Snapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  function pushHistory(currentNodes: Node[], currentEdges: Edge[]) {
    historyRef.current = [...historyRef.current.slice(-49), { nodes: currentNodes, edges: currentEdges }];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function undo() {
    const snap = historyRef.current.pop();
    if (!snap) return;
    futureRef.current = [{ nodes, edges }, ...futureRef.current.slice(0, 49)];
    setNodes(snap.nodes);
    setEdges(snap.edges);
    scheduleSave(snap.nodes, snap.edges);
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(true);
  }

  function redo() {
    const snap = futureRef.current.shift();
    if (!snap) return;
    historyRef.current = [...historyRef.current.slice(-49), { nodes, edges }];
    setNodes(snap.nodes);
    setEdges(snap.edges);
    scheduleSave(snap.nodes, snap.edges);
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
  }

  // Load strategy and felt-it counts on mount
  useEffect(() => {
    fetch(`/api/coach/students/${studentId}/strategy`)
      .then((r) => r.json())
      .then(({ nodes: n, edges: e }) => {
        setNodes((n as Node[]) ?? []);
        setEdges((e as Edge[]) ?? []);
        setLoaded(true);
      });

    fetch(`/api/coach/students/${studentId}/threads`)
      .then((r) => r.json())
      .then((threads: { step_ref?: string | null }[]) => {
        if (!Array.isArray(threads)) return;
        const counts: Record<string, number> = {};
        for (const t of threads) {
          if (t.step_ref) counts[t.step_ref] = (counts[t.step_ref] ?? 0) + 1;
        }
        setFeltItCounts(counts);
      })
      .catch(() => {});
  }, [studentId]);

  // Auto-save with debounce
  const scheduleSave = useCallback((n: Node[], e: Edge[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch(`/api/coach/students/${studentId}/strategy`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: n, edges: e }),
      });
      setSaving(false);
    }, 600);
  }, [studentId]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      // Only push to history for meaningful changes (position/remove), not selection
      const meaningful = changes.some((c) => c.type === "position" || c.type === "remove" || c.type === "dimensions");
      if (meaningful) pushHistory(nds, edges);
      const updated = applyNodeChanges(changes, nds);
      scheduleSave(updated, edges);
      return updated;
    });
  }, [edges, scheduleSave]); // eslint-disable-line react-hooks/exhaustive-deps

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => {
      pushHistory(nodes, eds);
      const updated = applyEdgeChanges(changes, eds);
      scheduleSave(nodes, updated);
      return updated;
    });
  }, [nodes, scheduleSave]); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => {
      pushHistory(nodes, eds);
      const updated = addEdge({ ...connection, animated: true, style: { stroke: "rgba(224,182,79,0.6)", strokeWidth: 1.5, strokeDasharray: "5,3" } }, eds);
      scheduleSave(nodes, updated);
      return updated;
    });
  }, [nodes, scheduleSave]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update node data (label, url, caption, done, why, etc.)
  const updateNodeData = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      );
      scheduleSave(updated, edges);
      return updated;
    });
  }, [edges, scheduleSave]);

  // Upload a file directly to Supabase (presigned URL — bypasses Vercel payload limit)
  const uploadNodeMedia = useCallback(async (file: File): Promise<string> => {
    return uploadFileDirect({ file, studentSlug, kind: "node" });
  }, [studentSlug]);

  // Get the viewport center in flow coordinates
  function getViewportCenter() {
    const rect = containerRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    return screenToFlowPosition({ x: cx, y: cy });
  }

  // Compute per-goal step numbers (stepId → number under its goal)
  const stepNumbers: Record<string, number> = {};
  for (const goalNode of nodes.filter((n) => n.type === "goal")) {
    const connectedSteps = edges
      .filter((e) => e.source === goalNode.id)
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n) => n?.type === "step");
    connectedSteps.forEach((s, i) => { if (s) stepNumbers[s.id] = i + 1; });
  }
  // Steps not connected to any goal get their stored number or position in all steps
  const unconnectedStepIdx = nodes.filter((n) => n.type === "step" && stepNumbers[n.id] === undefined);
  unconnectedStepIdx.forEach((s, i) => { stepNumbers[s.id] = i + 1; });

  // Inject callbacks into each node's data
  const nodesWithCallbacks = nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      // Override step number with per-goal computed number
      ...(n.type === "step" ? {
        number: stepNumbers[n.id] ?? (n.data.number as number ?? 1),
        feltItCount: feltItCounts[n.id] ?? 0,
      } : {}),
      studentId,
      studentSlug,
      studentName,
      onLabelChange: (label: string) => updateNodeData(n.id, { label }),
      onUrlChange: (url: string) => updateNodeData(n.id, { url }),
      onCaptionChange: (caption: string) => updateNodeData(n.id, { caption }),
      onMediaUpload: uploadNodeMedia,
      onWhyChange: (why: string) => updateNodeData(n.id, { why }),
      onWhyVisibleChange: (whyVisible: boolean) => updateNodeData(n.id, { whyVisible }),
      onDoneChange: (done: boolean) => updateNodeData(n.id, { done, doneAt: done ? new Date().toISOString() : undefined }),
      // Add Step from Goal
      ...(n.type === "goal" ? {
        onAddStep: () => {
          const connectedStepCount = edges.filter(
            (e) => e.source === n.id && nodes.find((nd) => nd.id === e.target)?.type === "step"
          ).length;
          const stepNode = makeNode("step", {
            x: n.position.x + 280,
            y: n.position.y + connectedStepCount * 80,
          });
          const edge: Edge = {
            id: `e-${n.id}-${stepNode.id}`,
            source: n.id,
            target: stepNode.id,
            animated: true,
            style: { stroke: "rgba(224,182,79,0.6)", strokeWidth: 1.5, strokeDasharray: "5,3" },
          };
          setNodes((nds) => {
            pushHistory(nds, edges);
            const updated = [...nds, stepNode];
            scheduleSave(updated, edges);
            return updated;
          });
          setEdges((eds) => {
            const updated = [...eds, edge];
            scheduleSave(nodes, updated);
            return updated;
          });
        },
      } : {}),
    },
  }));

  // Double-click canvas → show node picker at cursor
  const [pickerPos, setPickerPos] = useState<{ x: number; y: number; flowPos: { x: number; y: number } } | null>(null);

  function onPaneDoubleClick(e: React.MouseEvent) {
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setPickerPos({ x: e.clientX, y: e.clientY, flowPos });
  }

  function addNodeAtPicker(type: NodeType) {
    if (!pickerPos) return;
    const node = makeNode(type, pickerPos.flowPos);
    setNodes((nds) => {
      pushHistory(nds, edges);
      const updated = [...nds, node];
      scheduleSave(updated, edges);
      return updated;
    });
    setPickerPos(null);
  }

  // Keyboard shortcuts (G/F/S/M/C) + Cmd+Z / Cmd+Shift+Z
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const map: Record<string, NodeType> = { g: "goal", f: "factor", s: "step", m: "media", c: "context", n: "section" };
      const type = map[e.key.toLowerCase()];
      if (!type) return;
      e.preventDefault();
      const position = getViewportCenter();
      const node = makeNode(type, { x: position.x + (Math.random() - 0.5) * 60, y: position.y + (Math.random() - 0.5) * 60 });
      setNodes((nds) => {
        pushHistory(nds, edges);
        const updated = [...nds, node];
        scheduleSave(updated, edges);
        return updated;
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nodes, edges, scheduleSave]); // eslint-disable-line react-hooks/exhaustive-deps

  // Right-click context menu
  function onNodeContextMenu(e: React.MouseEvent, node: Node) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }

  function onEdgeContextMenu(e: React.MouseEvent, edge: Edge) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, edgeId: edge.id });
  }

  function onPaneClick() {
    setContextMenu(null);
    setPickerPos(null);
  }

  function deleteNode(id: string) {
    setNodes((nds) => {
      pushHistory(nds, edges);
      const updated = nds.filter((n) => n.id !== id);
      scheduleSave(updated, edges);
      return updated;
    });
    setEdges((eds) => {
      const updated = eds.filter((e) => e.source !== id && e.target !== id);
      scheduleSave(nodes, updated);
      return updated;
    });
    setContextMenu(null);
  }

  function deleteEdge(id: string) {
    setEdges((eds) => {
      pushHistory(nodes, eds);
      const updated = eds.filter((e) => e.id !== id);
      scheduleSave(nodes, updated);
      return updated;
    });
    setContextMenu(null);
  }

  function duplicateNode(id: string) {
    const original = nodes.find((n) => n.id === id);
    if (!original) return;
    const copy = { ...original, id: `${original.type}-${uid()}`, position: { x: original.position.x + 40, y: original.position.y + 40 }, selected: false };
    setNodes((nds) => {
      pushHistory(nds, edges);
      const updated = [...nds, copy];
      scheduleSave(updated, edges);
      return updated;
    });
    setContextMenu(null);
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 rounded-full border-2 border-teal border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ minHeight: 500 }}>
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        onPaneContextMenu={(e) => e.preventDefault()}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onDoubleClick={onPaneDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        proOptions={{ hideAttribution: true }}
        style={{ background: "var(--abyss)" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.06)" />
        <Controls
          style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}
          showInteractive={false}
        />
        <MiniMap
          style={{ background: "var(--depth)", border: "1px solid var(--glass-edge)" }}
          nodeColor={(n) => {
            const colors: Record<string, string> = { context: "#8b5cf6", goal: "#3b82f6", factor: "#2fd6c0", step: "#e0b64f", media: "#6b7280", section: "#374151" };
            return colors[n.type ?? ""] ?? "#555";
          }}
        />
      </ReactFlow>

      {/* Toolbar */}
      <StrategyToolbar
        onAdd={(type) => {
          const position = getViewportCenter();
          const node = makeNode(type, { x: position.x + (Math.random() - 0.5) * 60, y: position.y + (Math.random() - 0.5) * 60 });
          setNodes((nds) => {
            pushHistory(nds, edges);
            const updated = [...nds, node];
            scheduleSave(updated, edges);
            return updated;
          });
        }}
        saving={saving}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
      />

      {/* Double-click node type picker */}
      {pickerPos && (
        <NodeTypePicker
          x={pickerPos.x}
          y={pickerPos.y}
          onPick={addNodeAtPicker}
          onClose={() => setPickerPos(null)}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <StrategyContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          edgeId={contextMenu.edgeId}
          onDelete={(id) => contextMenu.nodeId ? deleteNode(id) : deleteEdge(id)}
          onDuplicate={contextMenu.nodeId ? (id) => duplicateNode(id) : undefined}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

// Node type picker (shown on double-click)
const NODE_TYPES: { type: NodeType; label: string; color: string }[] = [
  { type: "context", label: "Context", color: "rgba(139,92,246,0.8)" },
  { type: "goal", label: "Goal", color: "rgba(59,130,246,0.8)" },
  { type: "factor", label: "Factor", color: "rgba(47,214,192,0.8)" },
  { type: "step", label: "Step", color: "rgba(224,182,79,0.9)" },
  { type: "media", label: "Media", color: "rgba(156,163,175,0.8)" },
  { type: "section", label: "Section", color: "rgba(255,255,255,0.25)" },
];

function NodeTypePicker({ x, y, onPick, onClose }: { x: number; y: number; onPick: (type: NodeType) => void; onClose: () => void }) {
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed z-50 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl"
      style={{ left: x, top: y, transform: "translate(-50%, -50%)", background: "var(--depth)", border: "1px solid var(--glass-edge)", minWidth: 160 }}
    >
      <p className="font-display text-[8px] tracking-[0.2em] text-ink-faint px-2 pt-1">ADD NODE</p>
      {NODE_TYPES.map(({ type, label, color }) => (
        <button
          key={type}
          onClick={() => onPick(type)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-left hover:opacity-80 transition-opacity"
          style={{ background: "var(--glass)" }}
        >
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="font-display text-[11px] tracking-wide text-ink">{label}</span>
        </button>
      ))}
    </div>
  );
}

export function StrategyBuilder({ studentId, studentSlug, studentName }: { studentId: string; studentSlug: string; studentName: string }) {
  return (
    <ReactFlowProvider>
      <div style={{ height: "calc(100vh - 200px)", minHeight: 480 }}>
        <StrategyCanvas studentId={studentId} studentSlug={studentSlug} studentName={studentName} />
      </div>
    </ReactFlowProvider>
  );
}
