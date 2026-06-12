export type NodeShape = "card" | "cylinder" | "pill";

export interface SpecNode {
  id: string;
  /** Primary label. For two-line nodes this is the title. */
  label: string;
  /** Optional secondary line(s), rendered in mono below the title. */
  subtitle?: string;
  shape: NodeShape;
  /** Containing subgraph id, if any. */
  parent?: string;
}

export interface SpecEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  dotted: boolean;
  arrow: boolean;
}

export interface SpecGroup {
  id: string;
  label: string;
  parent?: string;
}

export type Direction = "LR" | "TB" | "RL" | "BT";

export interface DiagramSpec {
  direction: Direction;
  nodes: SpecNode[];
  edges: SpecEdge[];
  groups: SpecGroup[];
}
