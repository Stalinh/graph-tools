import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Lock } from "lucide-react";
import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { useI18n } from "../../i18n";
import type { GraphNode } from "../../types";

interface ImageFlowNodeData {
  [key: string]: unknown;
  isSelected: boolean;
  node: GraphNode;
  imageBlob?: Blob;
  onNodeMouseDown?: (event: MouseEvent, nodeId: string) => void;
}

export function ImageGraphNode({ data }: NodeProps<Node<ImageFlowNodeData>>) {
  const { isZh } = useI18n();
  const { node, imageBlob } = data;
  const [url, setUrl] = useState<string | null>(null);
  const [imageWidth, setImageWidth] = useState<number | null>(null);
  const hasCaption = Boolean(node.title.trim());
  const imageNodeStyle =
    imageWidth !== null
      ? ({
          "--image-node-media-width": `${imageWidth}px`,
        } as CSSProperties)
      : undefined;

  useEffect(() => {
    setImageWidth(null);
    if (!imageBlob || typeof URL.createObjectURL !== "function") {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageBlob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageBlob]);

  return (
    <>
      <Handle
        id="citation-target"
        className="graph-node__handle graph-node__handle--target nodrag nopan"
        position={Position.Left}
        type="target"
        isConnectableStart={false}
        title={isZh ? "拖拽引用连接到这里" : "Drop a citation link here"}
      />
      <Handle
        id="citation-source"
        className="graph-node__handle graph-node__handle--source nodrag nopan"
        position={Position.Right}
        type="source"
        isConnectableEnd={false}
        title={isZh ? "拖拽创建引用" : "Drag to create a citation link"}
      />
      <div
        className="graph-node__label graph-node__label--image"
        data-card-color={node.color || undefined}
        style={imageNodeStyle}
        onMouseDown={(event) => data.onNodeMouseDown?.(event, node.id)}
      >
        {node.locked ? (
          <span
            className="graph-node__lock-badge"
            aria-label={isZh ? "已锁定节点" : "Locked node"}
            title={isZh ? "已锁定节点" : "Locked node"}
          >
            <Lock aria-hidden="true" size={12} />
          </span>
        ) : null}
        <div className="graph-node__image-frame">
          {url ? (
            <img
              src={url}
              alt={node.title || (isZh ? "图片" : "Image")}
              className="graph-node__image"
              draggable={false}
              onLoad={(event) => {
                const { naturalWidth } = event.currentTarget;
                setImageWidth(naturalWidth > 0 ? naturalWidth : null);
              }}
            />
          ) : (
            <div className="graph-node__image-placeholder">{isZh ? "暂无图片" : "No image"}</div>
          )}
        </div>
        {hasCaption ? (
          <div className="graph-node__image-caption">
            <div className="graph-node__image-title">{node.title}</div>
          </div>
        ) : null}
      </div>
    </>
  );
}
