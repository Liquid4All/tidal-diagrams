import dagre from "@dagrejs/dagre";
import type { CardData, TidalEdgeT, TidalNode } from "./doc";
import type { Direction } from "./types";

const GROUP_HEADER = 41;
const GROUP_PAD = 28;

// Geist Mono at 14px is ~8.4px/char; Inter slightly narrower.
const MONO_CHAR = 8.45;
const SANS_CHAR = 7.2;

export type SizeOf = (node: TidalNode) => { width: number; height: number };

/** Char-count estimate, used at import before the DOM has measured anything. */
export function estimateSize(node: TidalNode): { width: number; height: number } {
  const data = node.data as CardData & { label?: string };
  if (node.type === "tidalCylinder") {
    return { width: 188, height: 170 };
  }
  if (node.type === "tidalPill") {
    return { width: (data.label ?? "").length * SANS_CHAR + 36, height: 37 };
  }
  if (node.type === "tidalGroup") {
    return { width: 360, height: 240 };
  }
  const header = data.header;
  const rows = data.rows ?? [];
  const widths = [
    header ? (header.title.length + (header.suffix?.length ?? 0)) * SANS_CHAR + 44 : 0,
    data.label ? Math.min(data.label.length, 28) * MONO_CHAR + 36 : 0,
    ...rows.map((r) => Math.max(r.label.length * SANS_CHAR, r.value.length * MONO_CHAR) + 36),
  ];
  const labelLines = data.label ? Math.ceil(data.label.length / 28) : 0;
  const height =
    (header ? 46 : 0) + rows.length * 68 + (data.label ? 14 + labelLines * 22 + 10 : 0);
  return {
    width: Math.max(...widths, header || rows.length ? 210 : 200),
    height: Math.max(height, 46),
  };
}

/** Prefer live measured dimensions, fall back to estimates. */
export const measuredOrEstimate: SizeOf = (node) =>
  node.measured?.width && node.measured?.height
    ? { width: node.measured.width, height: node.measured.height }
    : estimateSize(node);

/**
 * Dagre auto-layout. Returns a new node array with updated positions
 * (parent-relative) and group dimensions; never mutates inputs.
 */
export function tidyLayout(
  nodes: TidalNode[],
  edges: TidalEdgeT[],
  direction: Direction,
  sizeOf: SizeOf,
): TidalNode[] {
  const g = new dagre.graphlib.Graph({ compound: true, multigraph: true });
  g.setGraph({ rankdir: direction, nodesep: 48, ranksep: 72, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  const groups = nodes.filter((n) => n.type === "tidalGroup");
  const plain = nodes.filter((n) => n.type !== "tidalGroup");

  for (const group of groups) {
    g.setNode(group.id, { width: 0, height: 0 });
    if (group.parentId) g.setParent(group.id, group.parentId);
  }
  for (const node of plain) {
    g.setNode(node.id, sizeOf(node));
    if (node.parentId) g.setParent(node.id, node.parentId);
  }
  const ids = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue;
    const label = edge.data?.label;
    g.setEdge(
      edge.source,
      edge.target,
      label ? { width: Math.min(label.length, 22) * SANS_CHAR + 36, height: 45, labelpos: "c" } : {},
      edge.id,
    );
  }

  dagre.layout(g);

  const groupRects = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const group of groups) {
    const n = g.node(group.id);
    if (!n) continue;
    groupRects.set(group.id, {
      x: n.x - n.width / 2 - GROUP_PAD,
      y: n.y - n.height / 2 - GROUP_PAD - GROUP_HEADER,
      width: n.width + GROUP_PAD * 2,
      height: n.height + GROUP_PAD * 2 + GROUP_HEADER,
    });
  }

  return nodes.map((node) => {
    const parentRect = node.parentId ? groupRects.get(node.parentId) : undefined;
    if (node.type === "tidalGroup") {
      const rect = groupRects.get(node.id);
      if (!rect) return node;
      return {
        ...node,
        position: { x: rect.x - (parentRect?.x ?? 0), y: rect.y - (parentRect?.y ?? 0) },
        style: { ...node.style, width: rect.width, height: rect.height },
      };
    }
    const n = g.node(node.id);
    if (!n) return node;
    return {
      ...node,
      position: {
        x: n.x - n.width / 2 - (parentRect?.x ?? 0),
        y: n.y - n.height / 2 - (parentRect?.y ?? 0),
      },
    };
  });
}
