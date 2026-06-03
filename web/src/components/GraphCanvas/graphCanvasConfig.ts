import type { EdgeTypes, NodeTypes } from '@xyflow/react';
import type { NodeSize } from '../../types';
import { CitationEdge } from './CitationEdge';
import { GroupNode } from './GroupNode';
import { ImageGraphNode } from './ImageGraphNode';
import { ResizableGraphNode } from './ResizableGraphNode';

export const EDGE_TYPES: EdgeTypes = {
  citation: CitationEdge as EdgeTypes[string],
};

export const EMPTY_NODE_SIZES: Record<string, NodeSize> = {};

export const NODE_TYPES: NodeTypes = {
  cardNode: ResizableGraphNode as NodeTypes[string],
  imageNode: ImageGraphNode as NodeTypes[string],
  groupNode: GroupNode as NodeTypes[string],
};
