// charset: utf-8
import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { GraphState } from '../../hooks/useGraphState';
import type { CanvasPosition } from '../../types';

interface UseKnowledgeBaseImageImportOptions {
  createNode: GraphState['nodes']['createNode'];
  setImages: Dispatch<SetStateAction<Map<string, Blob>>>;
}

export function useKnowledgeBaseImageImport({
  createNode,
  setImages,
}: UseKnowledgeBaseImageImportOptions) {
  const handleDropImages = useCallback(
    (files: File[], position: CanvasPosition) => {
      files.forEach((file, index) => {
        const ext = file.name.split('.').pop() || 'png';
        const path = `images/img_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 15)}.${ext}`;
        setImages((prev) => {
          const next = new Map(prev);
          next.set(path, file);
          return next;
        });
        const dropPos = {
          x: position.x + index * 20,
          y: position.y + index * 20,
        };
        createNode('image', dropPos, path);
      });
    },
    [createNode, setImages]
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
      ) {
        return;
      }

      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/')
      );
      if (files.length === 0) return;

      event.preventDefault();
      handleDropImages(files, { x: 0, y: 0 });
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleDropImages]);

  return { handleDropImages };
}
