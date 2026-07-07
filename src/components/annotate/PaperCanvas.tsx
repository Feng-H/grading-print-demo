'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AnnotationLayer from './AnnotationLayer';
import type { Annotation } from './useAnnotations';

interface Props {
  pageImageUrl: string;
  annotations: Annotation[];
  currentPage: number;
  selectedTool: string;
  selectedColor: string;
  strokeWidth: number;
  onAddAnnotation: (ann: Omit<Annotation, 'source'>) => void;
  onUpdateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
}

export default function PaperCanvas({
  pageImageUrl,
  annotations,
  currentPage,
  selectedTool,
  selectedColor,
  strokeWidth,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; px: number; py: number } | null>(null);

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    resetView();
    setImgLoaded(false);
  }, [pageImageUrl, resetView]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.max(0.3, Math.min(4, s * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'pan' || e.button === 1 || e.button === 2) {
      setDragStart({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
    }
  }, [selectedTool, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragStart) {
      setPan({ x: dragStart.px + (e.clientX - dragStart.x), y: dragStart.py + (e.clientY - dragStart.y) });
    }
  }, [dragStart]);

  const handleMouseUp = useCallback(() => setDragStart(null), []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-300 flex items-center justify-center"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: dragStart ? 'grabbing' : (selectedTool === 'pan' ? 'grab' : 'crosshair') }}
      onContextMenu={e => e.preventDefault()}
    >
      <div
        className="relative shadow-2xl bg-white"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transition: dragStart ? 'none' : 'transform 0.1s',
          maxHeight: '95%',
          maxWidth: '90%',
        }}
      >
        <img
          src={pageImageUrl}
          alt="试卷"
          className="block max-h-[85vh] w-auto"
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />
        {imgLoaded && (
          <AnnotationLayer
            annotations={annotations}
            currentPage={currentPage}
            selectedTool={selectedTool}
            selectedColor={selectedColor}
            strokeWidth={strokeWidth}
            onAddAnnotation={onAddAnnotation}
            onUpdateAnnotation={onUpdateAnnotation}
            onDeleteAnnotation={onDeleteAnnotation}
            containerRef={containerRef}
          />
        )}
      </div>

      <div className="absolute bottom-4 right-4 flex gap-1 bg-white/95 rounded-lg shadow p-1 items-center">
        <button onClick={() => setScale(s => Math.min(4, s * 1.2))} className="w-8 h-8 hover:bg-gray-100 rounded text-lg">+</button>
        <span className="text-xs w-12 text-center">{Math.round(scale*100)}%</span>
        <button onClick={() => setScale(s => Math.max(0.3, s * 0.8))} className="w-8 h-8 hover:bg-gray-100 rounded text-lg">−</button>
        <button onClick={resetView} className="w-8 h-8 hover:bg-gray-100 rounded text-xs">重置</button>
      </div>
      <div className="absolute bottom-4 left-4 text-xs text-gray-700 bg-white/90 rounded px-2 py-1">
        滚轮缩放(按Ctrl) · 右键或手形工具拖动 · 右键批注可删除
      </div>
    </div>
  );
}
