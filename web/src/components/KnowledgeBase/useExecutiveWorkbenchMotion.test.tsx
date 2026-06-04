/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExecutiveWorkbenchMotion } from './useExecutiveWorkbenchMotion';

type UseGSAPCallback = () => void | (() => void);
type UseGSAPConfig = {
  dependencies?: readonly unknown[];
  revertOnUpdate?: boolean;
  scope?: unknown;
};

const gsapMock = vi.hoisted(() => {
  const useGSAPConfigs: UseGSAPConfig[] = [];
  const timelineFrom = vi.fn();
  const timeline = vi.fn(() => ({
    from: timelineFrom,
  }));
  const matchMediaAdd = vi.fn();
  const matchMediaRevert = vi.fn();
  const matchMedia = vi.fn(() => ({
    add: matchMediaAdd,
    revert: matchMediaRevert,
  }));

  return {
    matchMedia,
    matchMediaAdd,
    matchMediaRevert,
    registerPlugin: vi.fn(),
    timeline,
    timelineFrom,
    useGSAPConfigs,
  };
});

vi.mock('gsap', () => ({
  gsap: {
    matchMedia: gsapMock.matchMedia,
    registerPlugin: gsapMock.registerPlugin,
    timeline: gsapMock.timeline,
  },
}));

vi.mock('@gsap/react', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    useGSAP: (callback: UseGSAPCallback, config?: UseGSAPConfig) => {
      if (config) {
        gsapMock.useGSAPConfigs.push(config);
      }

      React.useEffect(() => callback(), config?.dependencies);
    },
  };
});

function stubWindowMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

function WorkbenchMotionHarness({ enabled = true }: { enabled?: boolean }) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  useExecutiveWorkbenchMotion(scopeRef, { enabled });

  return (
    <>
      <div data-testid="outside" data-workbench-motion="outside" />
      <div ref={scopeRef}>
        <div data-testid="toolbar" data-workbench-motion="toolbar" />
        <div data-testid="messages" data-workbench-motion="messages" />
        <div data-testid="canvas" data-workbench-motion="canvas" />
      </div>
    </>
  );
}

describe('useExecutiveWorkbenchMotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gsapMock.useGSAPConfigs.length = 0;
    stubWindowMatchMedia();
    gsapMock.matchMediaAdd.mockImplementation((_conditions, callback) => {
      callback({
        conditions: {
          allowMotion: true,
          reduceMotion: false,
        },
      });
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('creates a scoped entrance timeline for workbench motion regions', () => {
    render(<WorkbenchMotionHarness />);

    expect(gsapMock.matchMedia).toHaveBeenCalledTimes(1);
    expect(gsapMock.matchMediaAdd).toHaveBeenCalledWith(
      {
        allowMotion: '(prefers-reduced-motion: no-preference)',
        reduceMotion: '(prefers-reduced-motion: reduce)',
      },
      expect.any(Function)
    );
    expect(gsapMock.timeline).toHaveBeenCalledWith({
      defaults: {
        duration: 0.42,
        ease: 'power2.out',
      },
    });

    const [targets, vars, position] = gsapMock.timelineFrom.mock.calls[0];
    expect(Array.from(targets as Iterable<HTMLElement>)).toEqual([
      screen.getByTestId('toolbar'),
      screen.getByTestId('messages'),
      screen.getByTestId('canvas'),
    ]);
    expect(Array.from(targets as Iterable<HTMLElement>)).not.toContain(
      screen.getByTestId('outside')
    );
    expect(vars).toEqual({
      autoAlpha: 0,
      stagger: 0.045,
      y: 10,
    });
    expect(position).toBe(0);
  });

  it('cleans up GSAP context when enabled changes', () => {
    render(<WorkbenchMotionHarness />);

    expect(gsapMock.useGSAPConfigs[0]).toMatchObject({
      dependencies: [true],
      revertOnUpdate: true,
    });
  });

  it('skips the entrance timeline when reduced motion is preferred', () => {
    gsapMock.matchMediaAdd.mockImplementation((_conditions, callback) => {
      callback({
        conditions: {
          allowMotion: false,
          reduceMotion: true,
        },
      });
    });

    render(<WorkbenchMotionHarness />);

    expect(gsapMock.matchMedia).toHaveBeenCalledTimes(1);
    expect(gsapMock.timeline).not.toHaveBeenCalled();
  });

  it('reverts match media on unmount', () => {
    const { unmount } = render(<WorkbenchMotionHarness />);

    expect(gsapMock.matchMediaRevert).not.toHaveBeenCalled();

    unmount();

    expect(gsapMock.matchMediaRevert).toHaveBeenCalledTimes(1);
  });

  it('does not create match media or a timeline when disabled', () => {
    render(<WorkbenchMotionHarness enabled={false} />);

    expect(gsapMock.matchMedia).not.toHaveBeenCalled();
    expect(gsapMock.timeline).not.toHaveBeenCalled();
  });

  it('does not create match media or a timeline when browser matchMedia is unavailable', () => {
    Reflect.deleteProperty(window, 'matchMedia');

    expect(() => render(<WorkbenchMotionHarness />)).not.toThrow();
    expect(gsapMock.matchMedia).not.toHaveBeenCalled();
    expect(gsapMock.timeline).not.toHaveBeenCalled();
  });
});
