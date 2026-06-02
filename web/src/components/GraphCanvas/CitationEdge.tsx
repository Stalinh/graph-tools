import { useStore, useStoreApi, type Edge, type EdgeProps } from "@xyflow/react";
import { isEdgeStyle, normalizeEdgeStyle } from "../../lib/edgeStyles";
import { getNodeColorCssVar } from "../../lib/nodeColors";
import type { EdgeDirection, EdgeStyle } from "../../types";

type CitationEdgeData = Record<string, unknown> & {
  direction?: EdgeDirection;
  selected?: boolean;
  style?: EdgeStyle;
  color?: string;
};

type CitationFlowEdge = Edge<CitationEdgeData, "citation">;

interface Point {
  x: number;
  y: number;
}

interface CitationNodeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CitationNodeLike {
  measured?: {
    width?: number;
    height?: number;
  };
  width?: number;
  height?: number;
  initialWidth?: number;
  initialHeight?: number;
  style?: {
    width?: unknown;
    height?: unknown;
  };
  internals: {
    positionAbsolute: Point;
    userNode?: {
      width?: number;
      height?: number;
      initialWidth?: number;
      initialHeight?: number;
      style?: {
        width?: unknown;
        height?: unknown;
      };
    };
  };
}

interface CitationStoreLike {
  getState: () => {
    transform: [number, number, number];
  };
}

interface CitationEdgeGeometry {
  control1: Point;
  control2: Point;
  edgeAngle: number;
  endArrowTip: Point | null;
  hitPath: string;
  sourceBorder: Point;
  startArrowTip: Point | null;
  targetBorder: Point;
  targetLineEnd: Point;
  visibleSource: Point;
}

interface CitationEndpointFallback {
  source: Point;
  target: Point;
}

const ARROW_SIZE = 14;
const ARROW_NODE_GAP = 1;
const ARROW_LENGTH = ARROW_SIZE * 1.4;
const ARROW_LINE_GAP = 2;
const DEFAULT_STROKE_WIDTH = 1.8;
export function CitationEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  interactionWidth,
  style,
  data,
}: EdgeProps<CitationFlowEdge>) {
  const sourceNode = useStore((s) => s.nodeLookup.get(source));
  const targetNode = useStore((s) => s.nodeLookup.get(target));
  const store = useStoreApi();

  const edgeData = toCitationEdgeData(data);
  const direction: EdgeDirection = edgeData.direction ?? "unidirectional";
  const edgeStyle = normalizeEdgeStyle(edgeData.style);
  const isSelected = Boolean(edgeData.selected);
  const sourceBox = getCitationNodeBox(sourceNode, source, store);
  const targetBox = getCitationNodeBox(targetNode, target, store);
  const geometry =
    sourceBox && targetBox
      ? getCitationEdgeGeometry(sourceBox, targetBox, direction, {
          source: { x: sourceX, y: sourceY },
          target: { x: targetX, y: targetY },
        })
      : null;

  if (!geometry) return null;

  const { control1, control2, edgeAngle, hitPath, startArrowTip, targetLineEnd, visibleSource } =
    geometry;

  const strokeWidth =
    !isSelected && typeof style?.strokeWidth === "number"
      ? style.strokeWidth
      : DEFAULT_STROKE_WIDTH;
  const interactionStrokeWidth =
    typeof interactionWidth === "number" && interactionWidth > 0 ? interactionWidth : 40;
  const opacity = typeof style?.opacity === "number" ? style.opacity : 1;

  const edgeColor = getNodeColorCssVar(edgeData.color, true);

  const endArrowPath = geometry.endArrowTip
    ? createArrowheadPath(geometry.endArrowTip.x, geometry.endArrowTip.y, edgeAngle, ARROW_SIZE)
    : null;
  const startArrowPath =
    startArrowTip !== null
      ? createArrowheadPath(startArrowTip.x, startArrowTip.y, edgeAngle + Math.PI, ARROW_SIZE)
      : null;
  const visiblePath =
    `M${visibleSource.x},${visibleSource.y} C${control1.x},${control1.y} ` +
    `${control2.x},${control2.y} ${targetLineEnd.x},${targetLineEnd.y}`;
  const sketchPaths = getSketchPaths(id, visiblePath);
  const strokeDasharray = edgeStyle === "note-dash" ? "15 7 3 6" : undefined;

  return (
    <>
      <g
        className={
          `react-flow__edge graph-edge graph-edge--citation graph-edge--style-${edgeStyle}` +
          `${direction === "bidirectional" ? " graph-edge--bidirectional" : ""}`
        }
        opacity={opacity}
      >
        <path
          d={visiblePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={Math.max(strokeWidth * 4, 10)}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="edge-selected-halo"
          style={{ pointerEvents: "none" }}
        />
        <path
          d={visiblePath}
          fill="none"
          stroke={edgeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="edge-visible-path"
          strokeDasharray={strokeDasharray}
          style={{ pointerEvents: "none" }}
        />
        {edgeStyle === "sketch" ? (
          <>
            {sketchPaths.map((path, index) => (
              <path
                key={`${id}-sketch-${index}`}
                d={path}
                fill="none"
                stroke={edgeColor}
                strokeWidth={Math.max(strokeWidth - 0.6 - index * 0.15, 0.95)}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={index === 0 ? 0.46 : 0.28}
                className="edge-visible-path edge-visible-path--secondary"
                style={{ pointerEvents: "none" }}
              />
            ))}
          </>
        ) : null}
        {endArrowPath ? (
          <path
            d={endArrowPath}
            fill="none"
            stroke={edgeColor}
            strokeWidth={Math.max(strokeWidth, 1.5)}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="edge-arrowhead"
            style={{ pointerEvents: "none" }}
          />
        ) : null}
        {startArrowPath ? (
          <path
            d={startArrowPath}
            fill="none"
            stroke={edgeColor}
            strokeWidth={Math.max(strokeWidth, 1.5)}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="edge-arrowhead"
            style={{ pointerEvents: "none" }}
          />
        ) : null}
        <path
          d={hitPath}
          fill="none"
          stroke="transparent"
          strokeWidth={interactionStrokeWidth}
          className="react-flow__edge-interaction"
          style={{ pointerEvents: "all" }}
        />
      </g>
    </>
  );
}

function getCitationNodeBox(
  node: CitationNodeLike | undefined,
  nodeId: string,
  store: CitationStoreLike
): CitationNodeBox | null {
  if (!node) return null;

  const width = getNodeDimension(node, "width");
  const height = getNodeDimension(node, "height");
  if (width !== null && height !== null) {
    return {
      x: node.internals.positionAbsolute.x,
      y: node.internals.positionAbsolute.y,
      width,
      height,
    };
  }

  const zoom = store.getState().transform[2];
  const domSize = getDomNodeSize(nodeId, zoom);
  if (!domSize) return null;

  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    width: domSize.width,
    height: domSize.height,
  };
}

function toCitationEdgeData(value: unknown): CitationEdgeData {
  if (!value || typeof value !== "object") return {};

  const candidate = value as Partial<CitationEdgeData>;

  return {
    color: typeof candidate.color === "string" ? candidate.color : undefined,
    direction:
      candidate.direction === "bidirectional" || candidate.direction === "unidirectional"
        ? candidate.direction
        : undefined,
    selected: typeof candidate.selected === "boolean" ? candidate.selected : undefined,
    style: isEdgeStyle(candidate.style) ? candidate.style : undefined,
  };
}

function getNodeDimension(node: CitationNodeLike, axis: "width" | "height") {
  const initialAxis = axis === "width" ? "initialWidth" : "initialHeight";
  const userNode = node.internals.userNode;

  return (
    toPositiveNumber(node.measured?.[axis]) ??
    toPositiveNumber(node[axis]) ??
    toPositiveNumber(node[initialAxis]) ??
    toPositiveNumber(node.style?.[axis]) ??
    toPositiveNumber(userNode?.[axis]) ??
    toPositiveNumber(userNode?.[initialAxis]) ??
    toPositiveNumber(userNode?.style?.[axis])
  );
}

function getDomNodeSize(nodeId: string, zoom: number) {
  if (typeof document === "undefined") return null;

  const element = document.querySelector<HTMLElement>(
    `.react-flow__node[data-id="${escapeCssAttributeValue(nodeId)}"]`
  );
  const rect = element?.getBoundingClientRect();
  const scale = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;

  if (!rect || rect.width <= 0 || rect.height <= 0) return null;

  return {
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

function escapeCssAttributeValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function toPositiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export function getCitationEdgeGeometry(
  sourceBox: CitationNodeBox,
  targetBox: CitationNodeBox,
  direction: EdgeDirection,
  endpointFallback?: CitationEndpointFallback
): CitationEdgeGeometry | null {
  const sw = sourceBox.width;
  const sh = sourceBox.height;
  const tw = targetBox.width;
  const th = targetBox.height;

  if (!sw || !sh || !tw || !th) return null;

  const sx = sourceBox.x + sw / 2;
  const sy = sourceBox.y + sh / 2;
  const tx = targetBox.x + tw / 2;
  const ty = targetBox.y + th / 2;

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 1) return null;

  let sourceBorder = getNodeBorderPoint(sx, sy, sw / 2, sh / 2, tx, ty);
  let targetBorder = getNodeBorderPoint(tx, ty, tw / 2, th / 2, sx, sy);

  let borderDx = targetBorder.x - sourceBorder.x;
  let borderDy = targetBorder.y - sourceBorder.y;
  let borderDist = Math.sqrt(borderDx * borderDx + borderDy * borderDy);
  let directionDx = borderDx;
  let directionDy = borderDy;
  let directionDist = borderDist;

  if (borderDist < 1 && endpointFallback) {
    const fallbackDx = endpointFallback.target.x - endpointFallback.source.x;
    const fallbackDy = endpointFallback.target.y - endpointFallback.source.y;
    const fallbackDist = Math.sqrt(fallbackDx * fallbackDx + fallbackDy * fallbackDy);

    if (fallbackDist >= 1) {
      sourceBorder = endpointFallback.source;
      targetBorder = endpointFallback.target;
      borderDx = fallbackDx;
      borderDy = fallbackDy;
      borderDist = fallbackDist;
      directionDx = dx;
      directionDy = dy;
      directionDist = dist;
    }
  }

  if (borderDist < 1) return null;
  if (directionDist < 1) return null;

  const ndx = directionDx / directionDist;
  const ndy = directionDy / directionDist;
  const nx = -ndy;
  const ny = ndx;
  const edgeAngle = Math.atan2(ndy, ndx);

  const sourceLineStart = offsetPoint(sourceBorder.x, sourceBorder.y, edgeAngle, ARROW_NODE_GAP);
  const isUnidirectional = direction === "unidirectional";
  const isBidirectional = direction === "bidirectional";

  const endArrowTip =
    isUnidirectional || isBidirectional
      ? offsetPoint(targetBorder.x, targetBorder.y, edgeAngle + Math.PI, ARROW_NODE_GAP)
      : null;
  const targetLineEnd = endArrowTip
    ? offsetPoint(endArrowTip.x, endArrowTip.y, edgeAngle + Math.PI, ARROW_LENGTH + ARROW_LINE_GAP)
    : offsetPoint(targetBorder.x, targetBorder.y, edgeAngle + Math.PI, ARROW_NODE_GAP);

  const startArrowTip = isBidirectional
    ? offsetPoint(sourceBorder.x, sourceBorder.y, edgeAngle, ARROW_NODE_GAP)
    : null;
  const visibleSource = startArrowTip
    ? offsetPoint(startArrowTip.x, startArrowTip.y, edgeAngle, ARROW_LENGTH + ARROW_LINE_GAP)
    : sourceLineStart;

  const ctrlDist = Math.min(borderDist * 0.4, 80);
  const sideOffset = Math.min(borderDist * 0.08, 24);

  const cx1 = visibleSource.x + ndx * ctrlDist + nx * sideOffset;
  const cy1 = visibleSource.y + ndy * ctrlDist + ny * sideOffset;
  const cx2 = targetLineEnd.x - ndx * ctrlDist + nx * sideOffset;
  const cy2 = targetLineEnd.y - ndy * ctrlDist + ny * sideOffset;

  const midAngle = Math.atan2(cy2 - cy1, cx2 - cx1);
  const wobble = 3;
  const wobbleAngle = midAngle + Math.PI / 2;
  const wx = Math.cos(wobbleAngle) * wobble;
  const wy = Math.sin(wobbleAngle) * wobble;
  const control1 = { x: cx1 + wx, y: cy1 + wy };
  const control2 = { x: cx2 - wx, y: cy2 - wy };
  const hitPath =
    `M${sourceBorder.x},${sourceBorder.y} C${control1.x},${control1.y} ` +
    `${control2.x},${control2.y} ${targetBorder.x},${targetBorder.y}`;

  return {
    control1,
    control2,
    edgeAngle,
    endArrowTip,
    hitPath,
    sourceBorder,
    startArrowTip,
    targetBorder,
    targetLineEnd,
    visibleSource,
  };
}

function offsetPoint(x: number, y: number, angle: number, distance: number) {
  return {
    x: x + Math.cos(angle) * distance,
    y: y + Math.sin(angle) * distance,
  };
}

function getSketchPaths(edgeId: string, visiblePath: string) {
  const primary = getStableEdgeJitter(edgeId, 0);
  const secondary = getStableEdgeJitter(edgeId, 1);

  return [primary, secondary].map((jitter) =>
    visiblePath.replaceAll(/-?\d+(?:\.\d+)?/g, (token, index) => {
      const value = Number.parseFloat(token);
      if (!Number.isFinite(value)) {
        return token;
      }
      const offset = index % 2 === 0 ? jitter.x : jitter.y;
      return `${Number((value + offset).toFixed(3))}`;
    })
  );
}

function getStableEdgeJitter(edgeId: string, variant: number) {
  let hash = 0;
  for (let index = 0; index < edgeId.length; index += 1) {
    hash = (hash * 33 + edgeId.charCodeAt(index) + variant * 17) | 0;
  }

  return {
    x: (((hash & 0xff) / 255) * 4 - 2) * (variant === 0 ? 0.95 : 1.35),
    y: ((((hash >> 8) & 0xff) / 255) * 4 - 2) * (variant === 0 ? 0.85 : 1.2),
  };
}

export function getNodeBorderPoint(
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
  towardX: number,
  towardY: number
): { x: number; y: number } {
  const dx = towardX - centerX;
  const dy = towardY - centerY;

  if (dx === 0 && dy === 0) return { x: centerX, y: centerY };

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  const scale = absDx * halfHeight > absDy * halfWidth ? halfWidth / absDx : halfHeight / absDy;

  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
  };
}

export function createArrowheadPath(
  tipX: number,
  tipY: number,
  angle: number,
  size: number
): string {
  const length = size * 1.4;
  const halfWidth = size * 0.55;

  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  const baseX = tipX - length * dirX;
  const baseY = tipY - length * dirY;

  const leftX = baseX + halfWidth * perpX;
  const leftY = baseY + halfWidth * perpY;
  const rightX = baseX - halfWidth * perpX;
  const rightY = baseY - halfWidth * perpY;

  const bulge = size * 0.12;
  const leftMidX = (tipX + leftX) / 2 + perpX * bulge;
  const leftMidY = (tipY + leftY) / 2 + perpY * bulge;
  const rightMidX = (tipX + rightX) / 2 - perpX * bulge;
  const rightMidY = (tipY + rightY) / 2 - perpY * bulge;

  return `M${leftX},${leftY} Q${leftMidX},${leftMidY} ${tipX},${tipY} Q${rightMidX},${rightMidY} ${rightX},${rightY}`;
}
