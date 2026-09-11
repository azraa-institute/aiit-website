import { useEffect } from 'react';

/** Locks <body> scroll while `locked` is true, preserving scrollbar width. */
export function useLockBodyScroll(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const { body, documentElement } = document;
    const scrollBarWidth = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) body.style.paddingRight = `${scrollBarWidth}px`;
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
    };
  }, [locked]);
}
