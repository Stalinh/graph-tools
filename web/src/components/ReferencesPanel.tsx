import { useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useI18n } from "../i18n";
import type { BacklinkItem, GraphNode } from "../types";

interface ReferencesPanelProps {
  node: GraphNode;
  allNodes: GraphNode[];
  backlinks?: BacklinkItem[];
  onReferenceSelect?: (nodeId: string) => void;
  onCreateCitation?: (targetId: string) => void;
  onDeleteCitation?: (targetId: string) => void;
  onReorderReferences?: (newOrder: string[]) => void;
}

export function ReferencesPanel({
  node,
  allNodes,
  backlinks = [],
  onReferenceSelect,
  onCreateCitation,
  onDeleteCitation,
  onReorderReferences,
}: ReferencesPanelProps) {
  const { isZh } = useI18n();
  return (
    <div className="references-section">
      <ReferencesSection
        isZh={isZh}
        node={node}
        allNodes={allNodes}
        backlinks={backlinks}
        onReferenceSelect={onReferenceSelect}
        onDeleteCitation={onDeleteCitation}
        onReorderReferences={onReorderReferences}
        onCreateCitation={onCreateCitation}
      />
    </div>
  );
}

function ReferencesSection({
  isZh,
  node,
  allNodes,
  backlinks,
  onReferenceSelect,
  onDeleteCitation,
  onReorderReferences,
  onCreateCitation,
}: {
  isZh: boolean;
  node: GraphNode;
  allNodes: GraphNode[];
  backlinks: BacklinkItem[];
  onReferenceSelect?: (nodeId: string) => void;
  onDeleteCitation?: (targetId: string) => void;
  onReorderReferences?: (newOrder: string[]) => void;
  onCreateCitation?: (targetId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null) {
        clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const existingTargetIds = useMemo(
    () => new Set((node.references ?? []).map((r) => r.id)),
    [node.references]
  );

  const candidates = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allNodes.filter(
      (n) =>
        n.id !== node.id &&
        !existingTargetIds.has(n.id) &&
        (n.title.toLowerCase().includes(q) || n.id.toLowerCase().includes(q))
    );
  }, [searchQuery, allNodes, node.id, existingTargetIds]);

  const references = node.references ?? [];
  const hasAnyLinks = references.length > 0 || backlinks.length > 0;

  const handleDragStart = (e: DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(fromIndex) || fromIndex === targetIndex) return;

    const newOrder = references.map((r) => r.id);
    const [moved] = newOrder.splice(fromIndex, 1);
    newOrder.splice(targetIndex, 0, moved);
    onReorderReferences?.(newOrder);
  };

  return (
    <div className="references-tab-content">
      <div className="reference-search-bar">
        <input
          ref={searchRef}
          type="text"
          className="reference-search-input"
          placeholder={isZh ? "搜索卡片以添加引用…" : "Search nodes to add links..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearching(true)}
          onBlur={() => {
            if (blurTimerRef.current !== null) clearTimeout(blurTimerRef.current);
            blurTimerRef.current = setTimeout(() => setIsSearching(false), 150);
          }}
          aria-label={isZh ? "搜索卡片以添加引用" : "Search nodes to add links"}
        />
        {isSearching && candidates.length > 0 && (
          <ul className="reference-search-dropdown" role="listbox">
            {candidates.map((candidate) => (
              <li key={candidate.id} role="option">
                <button
                  type="button"
                  className="reference-search-option"
                  onClick={() => {
                    onCreateCitation?.(candidate.id);
                    setSearchQuery("");
                    setIsSearching(false);
                  }}
                >
                  <span
                    className="reference-search-color"
                    data-card-color={candidate.color || ""}
                    aria-hidden="true"
                  />
                  <span className="reference-search-title">{candidate.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {isSearching && searchQuery.trim() && candidates.length === 0 && (
          <div className="reference-search-dropdown reference-search-empty">
            {isZh ? "未找到匹配的卡片" : "No matching nodes found"}
          </div>
        )}
      </div>

      {hasAnyLinks ? (
        <>
          {references.length > 0 ? (
            <ReferenceListSection
              title={isZh ? `引用 (${references.length})` : `References (${references.length})`}
            >
              <ol className="reference-card-list">
                {references.map((reference, index) => (
                  <li
                    key={reference.id}
                    draggable={!!onReorderReferences}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="reference-card-item"
                  >
                    <button
                      type="button"
                      className="reference-card"
                      onClick={() => onReferenceSelect?.(reference.id)}
                      aria-label={
                        isZh
                          ? `打开引用 ${reference.id}: ${reference.title}`
                          : `Open reference ${reference.id}: ${reference.title}`
                      }
                    >
                      <span
                        className="reference-card__color-bar"
                        data-card-color={allNodes.find((n) => n.id === reference.id)?.color || ""}
                        aria-hidden="true"
                      />
                      <span className="reference-card__badge">{reference.id}</span>
                      <span className="reference-card__title">{reference.title}</span>
                    </button>
                    {onDeleteCitation && (
                      <button
                        type="button"
                        className="reference-card__delete"
                        aria-label={
                          isZh
                            ? `删除引用 ${reference.id}: ${reference.title}`
                            : `Delete reference ${reference.id}: ${reference.title}`
                        }
                        title={isZh ? "删除引用" : "Delete reference"}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCitation(reference.id);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </ReferenceListSection>
          ) : null}

          {backlinks.length > 0 ? (
            <ReferenceListSection
              title={isZh ? `反向引用 (${backlinks.length})` : `Backlinks (${backlinks.length})`}
            >
              <BacklinksSection
                isZh={isZh}
                allNodes={allNodes}
                backlinks={backlinks}
                onBacklinkSelect={onReferenceSelect}
              />
            </ReferenceListSection>
          ) : null}
        </>
      ) : (
        <div className="references-empty">
          <p>{isZh ? "暂无引用。" : "No links yet."}</p>
          <p className="references-empty__hint">
            {isZh
              ? "在上方搜索框查找卡片，或右键点击画布节点创建引用。"
              : "Use the search field above, or right-click a canvas node to create a link."}
          </p>
        </div>
      )}
    </div>
  );
}

function ReferenceListSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="reference-group" aria-label={title}>
      <h4 className="reference-group__title">{title}</h4>
      {children}
    </section>
  );
}

function BacklinksSection({
  isZh,
  allNodes,
  backlinks,
  onBacklinkSelect,
}: {
  isZh: boolean;
  allNodes: GraphNode[];
  backlinks: BacklinkItem[];
  onBacklinkSelect?: (nodeId: string) => void;
}) {
  return (
    <ol className="reference-card-list">
      {backlinks.map((backlink) => (
        <li key={backlink.id} className="reference-card-item">
          <button
            type="button"
            className="reference-card"
            onClick={() => onBacklinkSelect?.(backlink.id)}
            aria-label={
              isZh ? `打开反向引用: ${backlink.title}` : `Open backlink: ${backlink.title}`
            }
          >
            <span
              className="reference-card__color-bar"
              data-card-color={allNodes.find((n) => n.id === backlink.id)?.color || ""}
              aria-hidden="true"
            />
            <span className="reference-card__badge">{backlink.id}</span>
            <span className="reference-card__title">{backlink.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
