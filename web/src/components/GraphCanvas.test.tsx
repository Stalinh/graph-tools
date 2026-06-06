/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { GraphCanvasProps } from './GraphCanvas/GraphCanvas.types';
import { GraphCanvas } from './GraphCanvas';

type MockReactFlowProps = Record<string, unknown> & {
  children?: ReactNode;
};

const reactFlowProps: MockReactFlowProps[] = [];

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual<typeof import('@xyflow/react')>('@xyflow/react');

  return {
    ...actual,
    Background: () => null,
    Panel: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    ReactFlow: (props: MockReactFlowProps) => {
      reactFlowProps.push(props);
      return (
        <div className="react-flow__pane" data-testid="mock-react-flow">
          {props.children}
        </div>
      );
    },
    useNodesInitialized: () => true,
    useReactFlow: () => ({
      fitView: vi.fn().mockResolvedValue(true),
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      screenToFlowPosition: ({ x, y }: { x: number; y: number }) => ({ x, y }),
    }),
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
  };
});

function createGraphCanvasProps(overrides: Partial<GraphCanvasProps> = {}): GraphCanvasProps {
  return {
    graph: { nodes: [], edges: [] },
    contextMenu: null,
    images: new Map(),
    searchQuery: '',
    selectedEdgeId: null,
    selectedNodeId: null,
    selectedNodeIds: [],
    onCloseContextMenu: vi.fn(),
    onContextMenuRequest: vi.fn(),
    onCreateCitation: vi.fn(),
    onCreateNode: vi.fn(),
    onDeleteNode: vi.fn(),
    onEditNode: vi.fn(),
    onQuickEditSubmit: vi.fn(),
    onToggleNodeLock: vi.fn(),
    onEdgeSelect: vi.fn(),
    onSelectNode: vi.fn(),
    onSelectNodeIds: vi.fn(),
    ...overrides,
  };
}

describe('GraphCanvas', () => {
  it('enables direct marquee selection while keeping middle-button panning', () => {
    reactFlowProps.length = 0;

    render(<GraphCanvas {...createGraphCanvasProps()} />);

    expect(reactFlowProps.at(-1)).toMatchObject({
      panOnDrag: [1],
      selectionOnDrag: true,
    });
  });
});
