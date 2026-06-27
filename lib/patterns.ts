import type { StrategyData, StrategyNode } from "@/components/student/strategy-view";

export interface PatternSubStep {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string;
  videoUrl?: string;
}

export interface PatternStep {
  id: string;
  title: string;
  note: string;
  videoUrl: string | null;
  status: "done" | "active" | "locked";
  number: number;
  substeps: PatternSubStep[];
}

export interface PatternPath {
  id: string;
  title: string;
  steps: PatternStep[];
  doneCount: number;
  totalCount: number;
}

export function buildPaths(strategy: StrategyData | null): PatternPath[] {
  if (!strategy || !strategy.nodes?.length) return [];

  const { nodes, edges } = strategy;

  const outEdges: Record<string, string[]> = {};
  for (const e of edges) {
    (outEdges[e.source] ??= []).push(e.target);
  }
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return nodes
    .filter((n) => n.type === "goal")
    .map((goal) => {
      const stepNodes = (outEdges[goal.id] ?? [])
        .map((tid) => byId[tid])
        .filter((n): n is StrategyNode => n?.type === "step")
        .sort((a, b) => (a.data.number ?? 0) - (b.data.number ?? 0));

      let foundActive = false;
      const steps: PatternStep[] = stepNodes.map((s, i) => {
        const isDone = !!s.data.done;
        let status: "done" | "active" | "locked";
        if (isDone) {
          status = "done";
        } else if (!foundActive) {
          foundActive = true;
          status = "active";
        } else {
          status = "locked";
        }
        const rawSubsteps = (s.data as { substeps?: PatternSubStep[] }).substeps ?? [];
        return {
          id: s.id,
          title: s.data.label ?? "",
          note: s.data.why ?? "",
          videoUrl: s.data.url ?? null,
          status,
          number: s.data.number ?? i + 1,
          substeps: rawSubsteps,
        };
      });

      return {
        id: goal.id,
        title: goal.data.label ?? "Path",
        steps,
        doneCount: steps.filter((s) => s.status === "done").length,
        totalCount: steps.length,
      };
    });
}
