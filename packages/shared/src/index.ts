export type EntityType = "card" | "image" | "group";
export type EdgeType = "citation";
export type EdgeDirection = "unidirectional" | "bidirectional";
export type EdgeStyle = "solid" | "sketch" | "note-dash";

export interface ReferenceItem {
  id: string;
  title: string;
}

export interface BacklinkItem {
  id: string;
  title: string;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  label?: string;
  weight: number;
  direction?: EdgeDirection;
  style?: EdgeStyle;
  color?: string;
}

export interface GraphNode {
  id: string;
  type: EntityType;
  title: string;
  parentId?: string; // Reference to parent group node
  locked?: boolean;
  opacity?: number;
  tags: string[];
  color?: string;
  createdAt?: string;
  updatedAt?: string;
  contentHtml?: string;
  references?: ReferenceItem[];
  customFields?: Array<{
    id: string;
    value: string;
    field: string;
  }>;
  imagePath?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CustomField {
  id: string;
  entityId: string;
  name: string;
  value: string;
  fieldType?: string;
  sortOrder: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface WorkspaceState {
  version: 1;
  savedAt: string;
  graph: GraphData;
  nodePositions: Record<string, { x: number; y: number }>;
  nodeSizes?: Record<string, { width: number; height: number }>;
  viewport: ViewportState | null;
  selectedNodeId: string | null;
}

export interface CardRecord {
  id: string;
  type: "card";
  title: string;
  tags: string[];
  color?: string;
  createdAt: string;
  updatedAt: string;
  document: {
    contentJson: unknown;
    plainText: string;
  };
  customFields: CustomField[];
}
