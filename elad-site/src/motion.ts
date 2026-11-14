import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap };

export const MOTION_OK = '(prefers-reduced-motion: no-preference)';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Calm scroll-in for a section: every [data-reveal] child fades in and rises 20px.
 * Only opacity and position are animated. Nothing happens with reduced motion.
 */
export function useReveal(ref: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const items = root.querySelectorAll<HTMLElement>('[data-reveal]');
      if (!items.length) return;
      gsap.from(items, {
        opacity: 0,
        y: 20,
        duration: 0.55,
        ease: 'power2.out',
        stagger: 0.07,
        clearProps: 'opacity,transform',
        scrollTrigger: { trigger: root, start: 'top 82%', once: true },
      });
    });
    return () => mm.revert();
  }, [ref]);
}
