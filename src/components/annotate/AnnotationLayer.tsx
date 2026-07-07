'use client';
import React from 'react';
import type { Annotation } from './useAnnotations';

interface Props {
  annotations: Annotation[];
  currentPage: number;
  selectedTool: string;
  selectedColor: string;
  strokeWidth: number;
  onAddAnnotation: (ann: Omit<Annotation, 'source'>) => void;
  onUpdateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function AnnotationLayer({
  annotations,
  currentPage,
  selectedTool,
  selectedColor,
  strokeWidth,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  containerRef,
}: Props) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = React.useState<{ points: number[][] } | null>(null);
  const [dragAnn, setDragAnn] = React.useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const pageAnnotations = React.useMemo(
    () => annotations.filter(a => a.page === currentPage),
    [annotations, currentPage]
  );

  const getRelativeCoords = React.useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }, []);

  const handleClick = React.useCallback((e: React.MouseEvent) => {
    // 避免刚拖拽完的点击
    if (drawing || dragAnn) return;
    if (selectedTool === 'select' || selectedTool === 'pan') return;
    const target = (e.target as SVGElement).closest('[data-ann-id]');
    if (target) return; // 点在已有批注上

    const { x, y } = getRelativeCoords(e);
    const base = { page: currentPage, color: selectedColor, strokeWidth };

    switch (selectedTool) {
      case 'check':
        onAddAnnotation({ ...base, kind: 'check', xPct: x, yPct: y, wPct: 0.04, hPct: 0.04 });
        break;
      case 'cross':
        onAddAnnotation({ ...base, kind: 'cross', xPct: x, yPct: y, wPct: 0.04, hPct: 0.04 });
        break;
      case 'score': {
        const text = window.prompt('输入扣分值（如 -2）：');
        if (text) onAddAnnotation({ ...base, kind: 'score', xPct: x, yPct: y, wPct: 0.06, hPct: 0.04, text });
        break;
      }
      case 'comment': {
        const text = window.prompt('输入评语：');
        if (text) onAddAnnotation({ ...base, kind: 'comment', xPct: x, yPct: y, wPct: 0.3, hPct: 0.08, text });
        break;
      }
      case 'underline':
        onAddAnnotation({ ...base, kind: 'underline', xPct: x - 0.07, yPct: y, wPct: 0.14, hPct: 0.005 });
        break;
      case 'circle':
        onAddAnnotation({ ...base, kind: 'circle', xPct: x - 0.05, yPct: y - 0.02, wPct: 0.1, hPct: 0.04 });
        break;
    }
  }, [selectedTool, currentPage, selectedColor, strokeWidth, getRelativeCoords, onAddAnnotation, drawing, dragAnn]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (selectedTool === 'freehand') {
      const { x, y } = getRelativeCoords(e);
      setDrawing({ points: [[x, y]] });
      e.stopPropagation();
      return;
    }
    if (selectedTool === 'select') {
      const target = (e.target as SVGElement).closest('[data-ann-id]');
      if (target) {
        const id = target.getAttribute('data-ann-id')!;
        const ann = pageAnnotations.find(a => (a.id || '') === id);
        if (ann) {
          const { x, y } = getRelativeCoords(e);
          setDragAnn({ id, startX: x, startY: y, origX: ann.xPct, origY: ann.yPct });
        }
      }
    }
  }, [selectedTool, getRelativeCoords, pageAnnotations]);

  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (drawing) {
      const { x, y } = getRelativeCoords(e);
      setDrawing(prev => prev ? { points: [...prev.points, [x, y]] } : null);
    } else if (dragAnn) {
      const { x, y } = getRelativeCoords(e);
      const dx = x - dragAnn.startX;
      const dy = y - dragAnn.startY;
      onUpdateAnnotation(dragAnn.id, {
        xPct: Math.max(-0.1, Math.min(1.1, dragAnn.origX + dx)),
        yPct: Math.max(-0.1, Math.min(1.1, dragAnn.origY + dy)),
      });
    }
  }, [drawing, dragAnn, getRelativeCoords, onUpdateAnnotation]);

  const handleMouseUp = React.useCallback(() => {
    if (drawing && drawing.points.length > 1) {
      onAddAnnotation({
        page: currentPage,
        kind: 'freehand',
        xPct: 0, yPct: 0, wPct: 0, hPct: 0,
        strokePath: drawing.points,
        color: selectedColor,
        strokeWidth,
      });
    }
    setDrawing(null);
    setDragAnn(null);
    // 延迟清空dragAnn防止click误触发
    setTimeout(() => setDragAnn(null), 50);
  }, [drawing, currentPage, selectedColor, strokeWidth, onAddAnnotation]);

  const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = (e.target as SVGElement).closest('[data-ann-id]');
    if (target) {
      const id = target.getAttribute('data-ann-id')!;
      if (window.confirm('删除此批注？')) onDeleteAnnotation(id);
    }
  }, [onDeleteAnnotation]);

  // 用百分比坐标直接渲染，viewBox 0 0 1 1
  const toPx = (pct: number) => pct * 100 + '%';

  const renderAnnotation = (a: Annotation) => {
    const color = a.color || '#E11D48';
    const sw = Math.max(1, (a.strokeWidth ?? 2) as number);
    const isGreen = a.kind === 'check';
    const stroke = isGreen ? '#16A34A' : color;
    const key = a.id || `${a.kind}-${a.xPct}-${a.yPct}-${Math.random()}`;
    const wrap = (children: React.ReactNode) => (
      <g key={key} data-ann-id={a.id} style={{ cursor: selectedTool === 'select' ? 'move' : 'pointer' }}>
        {children}
      </g>
    );

    switch (a.kind) {
      case 'check': {
        const size = a.wPct || 0.04;
        const cx = a.xPct, cy = a.yPct;
        return wrap(
          <polyline
            points={`${(cx - size*0.3)*100}%,${(cy + size*0.2)*100}% ${(cx + size*0.1)*100}%,${(cy + size*0.6)*100}% ${(cx + size*0.5)*100}%,${(cy - size*0.3)*100}%`}
            fill="none" stroke={stroke} strokeWidth={sw*1.5} strokeLinecap="round" strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      }
      case 'cross': {
        const size = a.wPct || 0.04;
        const cx = a.xPct, cy = a.yPct;
        return wrap(
          <>
            <line x1={toPx(cx - size/2)} y1={toPx(cy - size/2)} x2={toPx(cx + size/2)} y2={toPx(cy + size/2)} stroke={stroke} strokeWidth={sw*1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1={toPx(cx - size/2)} y1={toPx(cy + size/2)} x2={toPx(cx + size/2)} y2={toPx(cy - size/2)} stroke={stroke} strokeWidth={sw*1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </>
        );
      }
      case 'score':
      case 'comment': {
        const fs = a.fontSize ? a.fontSize / 100 : (a.kind === 'score' ? 0.035 : 0.025);
        return wrap(
          <text
            x={toPx(a.xPct)} y={toPx(a.yPct + fs*0.3)}
            fill={stroke}
            style={{ fontSize: `calc(100vw * ${fs} * 0.6)`, fontWeight: 'bold', fontFamily: 'system-ui, sans-serif', whiteSpace: 'pre' }}
          >
            {a.text}
          </text>
        );
      }
      case 'underline':
        return wrap(
          <line
            x1={toPx(a.xPct)} y1={toPx(a.yPct)} x2={toPx(a.xPct + (a.wPct||0))} y2={toPx(a.yPct)}
            stroke={stroke} strokeWidth={sw*1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke"
          />
        );
      case 'circle':
        return wrap(
          <rect
            x={toPx(a.xPct)} y={toPx(a.yPct)}
            width={toPx(a.wPct||0)} height={toPx(a.hPct||0)}
            fill="none" stroke={stroke} strokeWidth={sw} rx={(a.wPct||0)*100/4}
            vectorEffect="non-scaling-stroke"
          />
        );
      case 'freehand':
        if (!a.strokePath || a.strokePath.length < 2) return null;
        return wrap(
          <polyline
            points={a.strokePath.map(p => `${p[0]*100}%,${p[1]*100}%`).join(' ')}
            fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        );
      default:
        return null;
    }
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      style={{ touchAction: 'none' }}
    >
      <g>{pageAnnotations.map(renderAnnotation)}</g>
      {drawing && drawing.points.length > 1 && (
        <polyline
          points={drawing.points.map(p => `${p[0]*100}%,${p[1]*100}%`).join(' ')}
          fill="none" stroke={selectedColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
