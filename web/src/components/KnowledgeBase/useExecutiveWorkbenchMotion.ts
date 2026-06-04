import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import type { RefObject } from 'react';

interface ExecutiveWorkbenchMotionOptions {
  enabled?: boolean;
}

gsap.registerPlugin(useGSAP);

export function useExecutiveWorkbenchMotion(
  scopeRef: RefObject<HTMLElement>,
  { enabled = true }: ExecutiveWorkbenchMotionOptions = {}
) {
  useGSAP(
    () => {
      const scope = scopeRef.current;

      if (!enabled || !scope) {
        return undefined;
      }

      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return undefined;
      }

      const mm = gsap.matchMedia();

      mm.add(
        {
          reduceMotion: '(prefers-reduced-motion: reduce)',
          allowMotion: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          if (context.conditions?.reduceMotion) {
            return;
          }

          const regions = scope.querySelectorAll<HTMLElement>('[data-workbench-motion]');

          if (regions.length === 0) {
            return;
          }

          gsap
            .timeline({
              defaults: {
                duration: 0.42,
                ease: 'power2.out',
              },
            })
            .from(
              regions,
              {
                autoAlpha: 0,
                y: 10,
                stagger: 0.045,
              },
              0
            );
        }
      );

      return () => mm.revert();
    },
    {
      dependencies: [enabled],
      revertOnUpdate: true,
      scope: scopeRef,
    }
  );
}
