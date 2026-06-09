/**
 * @vitest-environment jsdom
 */
// charset: utf-8
import { act, renderHook } from '@testing-library/react';
import type { Dispatch, SetStateAction } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useKnowledgeBaseImageImport } from './useKnowledgeBaseImageImport';

describe('useKnowledgeBaseImageImport', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores dropped image files and creates offset image nodes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    let images = new Map<string, Blob>();
    const setImages: Dispatch<SetStateAction<Map<string, Blob>>> = vi.fn((value) => {
      images = typeof value === 'function' ? value(images) : value;
    });
    const createNode = vi.fn();
    const firstFile = new File(['first'], 'first.png', { type: 'image/png' });
    const secondFile = new File(['second'], 'second.jpg', { type: 'image/jpeg' });

    const { result } = renderHook(() =>
      useKnowledgeBaseImageImport({
        createNode,
        setImages,
      })
    );

    act(() => {
      result.current.handleDropImages([firstFile, secondFile], { x: 100, y: 200 });
    });

    const firstPath = 'images/img_12345_0_i.png';
    const secondPath = 'images/img_12345_1_i.jpg';

    expect(images.get(firstPath)).toBe(firstFile);
    expect(images.get(secondPath)).toBe(secondFile);
    expect(createNode).toHaveBeenNthCalledWith(1, 'image', { x: 100, y: 200 }, firstPath);
    expect(createNode).toHaveBeenNthCalledWith(2, 'image', { x: 120, y: 220 }, secondPath);
  });

  it('imports pasted image files when focus is outside editable controls', () => {
    let images = new Map<string, Blob>();
    const setImages: Dispatch<SetStateAction<Map<string, Blob>>> = vi.fn((value) => {
      images = typeof value === 'function' ? value(images) : value;
    });
    const createNode = vi.fn();
    const file = new File(['pasted'], 'pasted.png', { type: 'image/png' });
    const { unmount } = renderHook(() =>
      useKnowledgeBaseImageImport({
        createNode,
        setImages,
      })
    );
    const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
    Object.defineProperty(event, 'clipboardData', {
      value: { files: [file] },
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(images.size).toBe(1);
    expect(createNode).toHaveBeenCalledWith('image', { x: 0, y: 0 }, expect.any(String));

    unmount();
  });
});
