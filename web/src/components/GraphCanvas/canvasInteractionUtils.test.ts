/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { describe, expect, it, vi } from 'vitest';
import type { Node, NodeChange } from '@xyflow/react';
import type { GraphNode, NodeSize } from '../../types';
import {
  getScreenRect,
  containsRect,
  intersectsRect,
  getAutoPanDelta,
  combineScreenRects,
  createAlignmentGuides,
  normalizeGroupCollisionChanges,
} from './canvasInteractionUtils';

describe('canvasInteractionUtils', () => {
  describe('Geometric Rect Calculations', () => {
    it('getScreenRect should return correct rect boundaries for two points', () => {
      const start = { x: 10, y: 50 };
      const end = { x: 40, y: 20 };
      const rect = getScreenRect(start, end);
      expect(rect).toEqual({
        left: 10,
        right: 40,
        top: 20,
        bottom: 50,
      });
    });

    it('containsRect should check if container completely wraps target rect', () => {
      const container = { left: 0, right: 100, top: 0, bottom: 100 };
      expect(containsRect(container, { left: 10, right: 90, top: 10, bottom: 90 })).toBe(true);
      expect(containsRect(container, { left: -10, right: 90, top: 10, bottom: 90 })).toBe(false);
      expect(containsRect(container, { left: 10, right: 110, top: 10, bottom: 90 })).toBe(false);
    });

    it('intersectsRect should check if two rects overlap', () => {
      const a = { left: 10, right: 50, top: 10, bottom: 50 };
      const b = { left: 40, right: 80, top: 40, bottom: 80 };
      const c = { left: 60, right: 80, top: 10, bottom: 30 };
      expect(intersectsRect(a, b)).toBe(true);
      expect(intersectsRect(a, c)).toBe(false);
    });

    it('getAutoPanDelta should calculate step based on thresholds', () => {
      // pointer, min, max, threshold, step
      expect(getAutoPanDelta(5, 0, 100, 10, 2)).toBe(-2);
      expect(getAutoPanDelta(95, 0, 100, 10, 2)).toBe(2);
      expect(getAutoPanDelta(50, 0, 100, 10, 2)).toBe(0);
    });
  });

  describe('combineScreenRects', () => {
    it('combines multiple HTMLElement bounding boxes into a single bounding rect', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('div');
      el1.getBoundingClientRect = () => ({
        left: 10,
        right: 50,
        top: 10,
        bottom: 50,
        width: 40,
        height: 40,
        x: 10,
        y: 10,
        toJSON: () => {},
      });
      el2.getBoundingClientRect = () => ({
        left: 30,
        right: 90,
        top: 40,
        bottom: 120,
        width: 60,
        height: 80,
        x: 30,
        y: 40,
        toJSON: () => {},
      });

      const combined = combineScreenRects([el1, el2]);
      expect(combined).toEqual({
        left: 10,
        right: 90,
        top: 10,
        bottom: 120,
      });
    });
  });

  describe('createAlignmentGuides', () => {
    it('returns empty when no alignment node type match or no elements are dragged', () => {
      const container = document.createElement('div');
      const nodeTypeById = new Map<string, GraphNode['type']>();
      const guides = createAlignmentGuides(container, [], nodeTypeById);
      expect(guides).toEqual([]);
    });

    it('skips card alignment guides without measuring other cards', () => {
      const container = document.createElement('div');
      container.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        right: 1000,
        top: 0,
        bottom: 1000,
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => {},
      }));

      const draggedCard = document.createElement('div');
      draggedCard.className = 'react-flow__node';
      draggedCard.setAttribute('data-id', 'card-1');
      draggedCard.getBoundingClientRect = vi.fn(() => ({
        left: 102,
        right: 202,
        top: 202,
        bottom: 302,
        width: 100,
        height: 100,
        x: 102,
        y: 202,
        toJSON: () => {},
      }));
      container.appendChild(draggedCard);

      const targetCard = document.createElement('div');
      targetCard.className = 'react-flow__node';
      targetCard.setAttribute('data-id', 'card-2');
      targetCard.getBoundingClientRect = vi.fn(() => ({
        left: 100,
        right: 200,
        top: 400,
        bottom: 500,
        width: 100,
        height: 100,
        x: 100,
        y: 400,
        toJSON: () => {},
      }));
      container.appendChild(targetCard);

      const nodeTypeById = new Map<string, GraphNode['type']>([
        ['card-1', 'card'],
        ['card-2', 'card'],
      ]);

      expect(createAlignmentGuides(container, ['card-1'], nodeTypeById)).toEqual([]);
      expect(targetCard.getBoundingClientRect).not.toHaveBeenCalled();
    });

    it('generates group alignment guides when coordinates are within threshold', () => {
      const container = document.createElement('div');
      container.getBoundingClientRect = () => ({
        left: 0,
        right: 1000,
        top: 0,
        bottom: 1000,
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      // Mock DOM structure
      // Node 1 (Dragged)
      const el1 = document.createElement('div');
      el1.className = 'react-flow__node';
      el1.setAttribute('data-id', 'group-1');
      el1.getBoundingClientRect = () => ({
        left: 102, // Close to 100
        right: 202,
        top: 202, // Close to 200
        bottom: 302,
        width: 100,
        height: 100,
        x: 102,
        y: 202,
        toJSON: () => {},
      });
      container.appendChild(el1);

      // Node 2 (Static target for alignment)
      const el2 = document.createElement('div');
      el2.className = 'react-flow__node';
      el2.setAttribute('data-id', 'group-2');
      el2.getBoundingClientRect = () => ({
        left: 100,
        right: 200,
        top: 400,
        bottom: 500,
        width: 100,
        height: 100,
        x: 100,
        y: 400,
        toJSON: () => {},
      });
      container.appendChild(el2);

      const nodeTypeById = new Map<string, GraphNode['type']>([
        ['group-1', 'group'],
        ['group-2', 'group'],
      ]);

      const guides = createAlignmentGuides(container, ['group-1'], nodeTypeById);

      // Check alignment guides were generated
      expect(guides.length).toBeGreaterThan(0);

      // Verify vertical guide aligning node-1 left with node-2 left
      const verticalGuide = guides.find((g) => g.orientation === 'vertical');
      expect(verticalGuide).toBeDefined();
      expect(verticalGuide?.offset).toBe(100); // 100px from container left
      expect(verticalGuide?.start).toBe(202); // Dragged top
      expect(verticalGuide?.end).toBe(500); // Target bottom
    });
  });

  describe('normalizeGroupCollisionChanges & resolveGroupDragPosition', () => {
    const graphNodes: GraphNode[] = [
      { id: 'group-1', type: 'group', title: 'Group 1', tags: [] },
      { id: 'group-2', type: 'group', title: 'Group 2', tags: [] },
    ];

    const currentCanvasNodes: Node[] = [
      {
        id: 'group-1',
        type: 'group',
        position: { x: 20, y: 20 },
        data: {},
        measured: { width: 100, height: 100 },
      },
      {
        id: 'group-2',
        type: 'group',
        position: { x: 160, y: 20 },
        data: {},
        measured: { width: 100, height: 100 },
      },
    ];

    const nodeSizes: Record<string, NodeSize> = {
      'group-1': { width: 100, height: 100 },
      'group-2': { width: 100, height: 100 },
    };

    it('allows moving group nodes without collision', () => {
      const changes: NodeChange[] = [
        {
          id: 'group-1',
          type: 'position',
          position: { x: 40, y: 20 },
        },
      ];

      const resolved = normalizeGroupCollisionChanges(
        changes,
        graphNodes,
        currentCanvasNodes,
        nodeSizes
      );
      expect(resolved[0]).toMatchObject({
        type: 'position',
        position: { x: 40, y: 20 },
      });
    });

    it('collides group node and restricts position to edge when moving right', () => {
      const changes: NodeChange[] = [
        {
          id: 'group-1',
          type: 'position',
          position: { x: 120, y: 20 }, // Trying to overlap with group-2 at x: 160
        },
      ];

      const resolved = normalizeGroupCollisionChanges(
        changes,
        graphNodes,
        currentCanvasNodes,
        nodeSizes
      );
      expect(resolved[0]).toMatchObject({
        type: 'position',
        position: { x: 60, y: 20 }, // Stopped exactly at group-2.left (160) - group-1.width (100) = 60
      });
    });

    it('collides group node and restricts position to edge when moving left', () => {
      const changes: NodeChange[] = [
        {
          id: 'group-2',
          type: 'position',
          position: { x: 40, y: 20 }, // Trying to overlap with group-1 at x: 20 (right side is 120)
        },
      ];

      const resolved = normalizeGroupCollisionChanges(
        changes,
        graphNodes,
        currentCanvasNodes,
        nodeSizes
      );
      expect(resolved[0]).toMatchObject({
        type: 'position',
        position: { x: 120, y: 20 }, // Stopped exactly at group-1.right (120)
      });
    });

    it('falls back to starting position if position is still blocked completely', () => {
      // Create a scenario where a static group overlaps with the dragged group's start position partially
      // but is placed such that moving group-1 to x: 80 makes it overlap with group-2 (at x: 60) without triggering grid edge snap.
      const localCanvasNodes: Node[] = [
        {
          id: 'group-1',
          type: 'group',
          position: { x: 20, y: 20 },
          data: {},
          measured: { width: 100, height: 100 },
        },
        {
          id: 'group-2',
          type: 'group',
          position: { x: 60, y: 20 },
          data: {},
          measured: { width: 100, height: 100 },
        },
      ];

      const changes: NodeChange[] = [
        {
          id: 'group-1',
          type: 'position',
          position: { x: 80, y: 20 },
        },
      ];

      const resolved = normalizeGroupCollisionChanges(
        changes,
        graphNodes,
        localCanvasNodes,
        nodeSizes
      );
      expect(resolved[0]).toMatchObject({
        type: 'position',
        position: { x: 20, y: 20 }, // Fallback to starting position
      });
    });
  });
});
