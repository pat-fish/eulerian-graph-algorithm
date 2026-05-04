"use client";

import { FormEvent, useMemo, useState } from "react";

const defaultGraph = 
`[[1, 2, 3, 4],
[0, 2, 3, 4],
[0, 1, 3, 4],
[0, 1, 2, 4],
[0, 1, 2, 3]]`;

function formatResponseBody(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

type CircuitResponse = {
  circuit?: unknown;
};

function getGraphVisualization(graph: number[][]) {
  const width = 720;
  const height = 340;
  const centerX = width / 2;
  const centerY = height / 2;
  const nodeCount = graph.length;
  const nodeRadius = 16;
  const orbitRadius = Math.max(86, Math.min(width, height) * 0.3);

  const nodes = graph.map((neighbors, index) => {
    if (nodeCount === 1) {
      return { index, x: centerX, y: centerY, neighbors };
    }

    const angle = (-Math.PI / 2) + (index * (Math.PI * 2)) / nodeCount;
    return {
      index,
      x: centerX + Math.cos(angle) * orbitRadius,
      y: centerY + Math.sin(angle) * orbitRadius,
      neighbors,
    };
  });

  const pairCounts = new Map<string, number>();
  const edges = graph.flatMap((neighbors, from) =>
    neighbors.flatMap((to) => {
      if (to < 0 || to >= nodeCount) {
        return [];
      }

      const pairKey = `${from}:${to}`;
      const occurrence = pairCounts.get(pairKey) ?? 0;
      pairCounts.set(pairKey, occurrence + 1);

      return [{ from, to, occurrence }];
    }),
  );

  return { width, height, nodeRadius, nodes, edges };
}

function getCurveOffset(from: number, to: number, occurrence: number) {
  const base = from < to ? 1 : -1;
  const spread = 24 + occurrence * 12;
  return base * spread;
}

export default function Home() {
  const [graphJson, setGraphJson] = useState(defaultGraph);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responseData, setResponseData] = useState<{ circuit: number[]; raw: string } | null>(null);

  const parsedGraph = useMemo(() => {
    try {
      const parsed = JSON.parse(graphJson) as unknown;
      if (
        Array.isArray(parsed) &&
        parsed.every(
          (row) => Array.isArray(row) && row.every((value) => Number.isInteger(value)),
        )
      ) {
        return parsed as number[][];
      }
      return null;
    } catch {
      return null;
    }
  }, [graphJson]);

  const graphVisualization = useMemo(() => {
    if (!parsedGraph) {
      return null;
    }

    return getGraphVisualization(parsedGraph);
  }, [parsedGraph]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    let parsedGraph: unknown;

    try {
      parsedGraph = JSON.parse(graphJson);
    } catch {
      setError("Enter valid JSON before sending the request.");
      setLoading(false);
      return;
    }

    if (
      !Array.isArray(parsedGraph) ||
      !parsedGraph.every(
        (row) => Array.isArray(row) && row.every((value) => Number.isInteger(value)),
      )
    ) {
      setError("The graph must be a 2D array of integers, like [[1, 2], [0]].");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:18080/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsedGraph),
      });

      const bodyText = await response.text();
      if (!response.ok) {
        throw new Error(bodyText || `Request failed with status ${response.status}`);
      }

      let body: CircuitResponse;

      try {
        body = JSON.parse(bodyText) as CircuitResponse;
      } catch {
        throw new Error("The backend did not return valid JSON.");
      }

      if (!Array.isArray(body.circuit) || !body.circuit.every((value) => Number.isInteger(value))) {
        throw new Error("Unexpected response shape. Expected { circuit: number[] }.");
      }

      setResponseData({
        circuit: body.circuit,
        raw: formatResponseBody(JSON.stringify(body)),
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach the API endpoint.",
      );
      setResponseData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_32%),linear-gradient(180deg,#07111f_0%,#0f172a_45%,#111827_100%)] text-slate-100">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-size-[40px_40px] opacity-30" />
      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
        <section className="grid flex-1 min-h-0 gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-col rounded-3xl border border-white/10 bg-slate-950/50 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-5"
          >

            <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">Graph JSON</h2>
                  <p className="text-xs text-slate-400">Edit the adjacency list, then submit it.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGraphJson(defaultGraph);
                    setError(null);
                  }}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/5"
                >
                  Reset sample
                </button>
              </div>

              <textarea
                value={graphJson}
                onChange={(event) => setGraphJson(event.target.value)}
                spellCheck={false}
                className="min-h-0 flex-1 rounded-3xl border border-white/10 bg-slate-900/80 px-3 py-3 font-mono text-xs leading-5 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />

              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="uppercase tracking-[0.22em] text-slate-500">Validation</div>
                  <p className="mt-1">
                    {parsedGraph
                      ? "The current payload is valid and ready to send."
                      : "Fix the JSON structure before submitting."}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Sending..." : "Get Eulerian Circuit"}
                </button>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {error}
                </div>
              ) : null}
            </div>
          </form>

          <aside className="flex min-h-0 flex-col gap-4">
            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-slate-950/50 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">Response</h2>
                  <p className="text-xs text-slate-400">API result after each request.</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-300">
                  Output
                </span>
              </div>

              <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-3xl border border-white/10 bg-slate-900/90 p-3 font-mono text-xs leading-5 text-emerald-200">
                {responseData ? (
                  <div className="flex flex-col gap-3 text-slate-100">
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                      <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-200/80">
                        Eulerian circuit
                      </div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {responseData.circuit.join(" → ")}
                      </div>
                    </div>

                    <div className="grid gap-2 text-[11px] text-slate-300 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                        <div className="uppercase tracking-[0.22em] text-slate-500">Length</div>
                        <div className="mt-1 text-base font-semibold text-white">
                          {responseData.circuit.length - 1}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                        <div className="uppercase tracking-[0.22em] text-slate-500">Shape</div>
                        <div className="mt-1 text-base font-semibold text-white">
                          {responseData.circuit.length ? "circuit" : "empty"}
                        </div>
                      </div>
                    </div>

                    <details className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                      <summary className="cursor-pointer select-none text-[11px] uppercase tracking-[0.22em] text-slate-400">
                        Raw JSON
                      </summary>
                      <pre className="mt-3 whitespace-pre-wrap break-words text-[11px] leading-5 text-slate-300">
                        {responseData.raw}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-slate-400">
                    No successful response yet.
                  </div>
                )}
              </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-linear-to-br from-cyan-400/10 via-white/5 to-emerald-400/10 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">Constructed graph</h2>
                  <p className="text-xs text-slate-400">
                    A live directed graph preview that updates as you edit the JSON.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-slate-300">
                  Preview
                </span>
              </div>

              <div className="mt-3 min-h-0 flex-1 rounded-3xl border border-white/10 bg-slate-950/65 p-3">
                {graphVisualization ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80">
                    <svg
                      viewBox={`0 0 ${graphVisualization.width} ${graphVisualization.height}`}
                      className="h-full min-h-56 w-full"
                      role="img"
                      aria-label="Directed graph visualization"
                    >
                      <defs>
                        <marker
                          id="arrowhead"
                          markerWidth="10"
                          markerHeight="10"
                          refX="8"
                          refY="5"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path d="M 0 0 L 10 5 L 0 10 z" fill="#7dd3fc" />
                        </marker>
                        <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55" />
                          <stop offset="100%" stopColor="#34d399" stopOpacity="0.75" />
                        </linearGradient>
                      </defs>

                      <rect x="0" y="0" width={graphVisualization.width} height={graphVisualization.height} fill="transparent" />

                      {graphVisualization.edges.map((edge, index) => {
                        const fromNode = graphVisualization.nodes[edge.from];
                        const toNode = graphVisualization.nodes[edge.to];
                        const dx = toNode.x - fromNode.x;
                        const dy = toNode.y - fromNode.y;
                        const distance = Math.max(Math.hypot(dx, dy), 1);
                        const startX = fromNode.x + (dx / distance) * graphVisualization.nodeRadius;
                        const startY = fromNode.y + (dy / distance) * graphVisualization.nodeRadius;
                        const endX = toNode.x - (dx / distance) * graphVisualization.nodeRadius;
                        const endY = toNode.y - (dy / distance) * graphVisualization.nodeRadius;

                        if (edge.from === edge.to) {
                          const loopRadius = 26 + edge.occurrence * 6;
                          const loopTop = fromNode.y - 36 - edge.occurrence * 4;
                          return (
                            <path
                              key={`${edge.from}-${edge.to}-${edge.occurrence}-${index}`}
                              d={`M ${fromNode.x} ${fromNode.y - graphVisualization.nodeRadius} C ${fromNode.x + loopRadius} ${loopTop}, ${fromNode.x + loopRadius} ${loopTop - 18}, ${fromNode.x} ${fromNode.y - graphVisualization.nodeRadius}`}
                              fill="none"
                              stroke="url(#edgeGradient)"
                              strokeWidth="2.5"
                              markerEnd="url(#arrowhead)"
                              opacity="0.9"
                            />
                          );
                        }

                        const normalX = (fromNode.x + toNode.x) / 2;
                        const normalY = (fromNode.y + toNode.y) / 2;
                        const offset = getCurveOffset(edge.from, edge.to, edge.occurrence);
                        const perpendicularX = (-dy / distance) * offset;
                        const perpendicularY = (dx / distance) * offset;
                        const controlX = normalX + perpendicularX;
                        const controlY = normalY + perpendicularY;

                        return (
                          <path
                            key={`${edge.from}-${edge.to}-${edge.occurrence}-${index}`}
                            d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
                            fill="none"
                            stroke="url(#edgeGradient)"
                            strokeWidth="2.5"
                            markerEnd="url(#arrowhead)"
                            opacity="0.9"
                          />
                        );
                      })}

                      {graphVisualization.nodes.map((node) => (
                        <g key={node.index}>
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={graphVisualization.nodeRadius + 2}
                            fill="rgba(15, 23, 42, 0.92)"
                            stroke="rgba(125, 211, 252, 0.35)"
                            strokeWidth="2"
                          />
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={graphVisualization.nodeRadius}
                            fill="rgba(8, 15, 31, 0.98)"
                            stroke="rgba(56, 189, 248, 0.9)"
                            strokeWidth="2"
                          />
                          <text
                            x={node.x}
                            y={node.y + 5}
                            textAnchor="middle"
                            className="fill-slate-100 text-[12px] font-semibold"
                          >
                            {node.index}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    The current JSON is not valid enough to render a graph preview.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
