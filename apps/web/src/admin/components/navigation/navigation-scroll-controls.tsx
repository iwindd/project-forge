'use client';

import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useState } from 'react';
import classes from './navigation-scroll-controls.module.css';

export default function NavigationScrollControls({
  children,
  viewportRef,
}: {
  children: ReactNode;
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const [state, setState] = useState({ hasOverflow: false, atStart: true, atEnd: true });
  const update = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const max = Math.max(viewport.scrollHeight - viewport.clientHeight, 0);
    setState({ hasOverflow: max > 2, atStart: viewport.scrollTop <= 2, atEnd: viewport.scrollTop >= max - 2 });
  }, [viewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    viewport.addEventListener('scroll', update, { passive: true });
    update();
    return () => {
      viewport.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [update, viewportRef]);

  const move = (direction: 'up' | 'down') => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollBy({
      top: direction === 'down' ? viewport.clientHeight * 0.7 : -viewport.clientHeight * 0.7,
      behavior: 'smooth',
    });
  };

  return (
    <div className={classes.scrollControlsRoot}>
      {children}
      <button
        type='button'
        aria-label='เลื่อนเมนูขึ้น'
        className={`${classes.control} ${classes.controlStart}`}
        data-hidden={!state.hasOverflow || state.atStart}
        disabled={!state.hasOverflow || state.atStart}
        onClick={() => move('up')}
      >
        <IconChevronUp size={18} stroke={2.4} />
      </button>
      <button
        type='button'
        aria-label='เลื่อนเมนูลง'
        className={`${classes.control} ${classes.controlEnd}`}
        data-hidden={!state.hasOverflow || state.atEnd}
        disabled={!state.hasOverflow || state.atEnd}
        onClick={() => move('down')}
      >
        <IconChevronDown size={18} stroke={2.4} />
      </button>
    </div>
  );
}
