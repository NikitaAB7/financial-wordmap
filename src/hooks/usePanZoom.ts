import { useState, useCallback, useRef, type WheelEvent, type MouseEvent, type TouchEvent } from 'react';

interface PanZoomState {
  x: number;
  y: number;
  scale: number;
}

export function usePanZoom(minScale = 0.3, maxScale = 4) {
  const [state, setState] = useState<PanZoomState>({ x: 0, y: 0, scale: 1 });
  const isPanning = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setState(prev => {
      const newScale = Math.max(minScale, Math.min(maxScale, prev.scale * delta));
      // Zoom toward cursor position
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const scaleRatio = newScale / prev.scale;
      return {
        scale: newScale,
        x: cx - scaleRatio * (cx - prev.x),
        y: cy - scaleRatio * (cy - prev.y),
      };
    });
  }, [minScale, maxScale]);

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      isPanning.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1 && isPanning.current) {
      const dx = e.touches[0].clientX - lastPos.current.x;
      const dy = e.touches[0].clientY - lastPos.current.y;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    }
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const delta = dist / lastTouchDist.current;
      lastTouchDist.current = dist;
      setState(prev => ({
        ...prev,
        scale: Math.max(minScale, Math.min(maxScale, prev.scale * delta)),
      }));
    }
  }, [minScale, maxScale]);

  const onTouchEnd = useCallback(() => {
    isPanning.current = false;
    lastTouchDist.current = null;
  }, []);

  const resetView = useCallback(() => {
    setState({ x: 0, y: 0, scale: 1 });
  }, []);

  return {
    transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
    scale: state.scale,
    handlers: {
      onWheel,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave: onMouseUp,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    resetView,
    isPanning,
  };
}
