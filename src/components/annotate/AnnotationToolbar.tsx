'use client';
import React from 'react';
import { Check, X, Minus, MessageCircle, Circle, Pencil, MousePointer2, Hand, Eraser } from 'lucide-react';

interface Tool {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const TOOLS: Tool[] = [
  { id: 'select', icon: <MousePointer2 size={18} />, label: '选择/移动' },
  { id: 'pan', icon: <Hand size={18} />, label: '拖动试卷' },
  { id: 'check', icon: <Check size={18} color="#16A34A" strokeWidth={3} />, label: '打√' },
  { id: 'cross', icon: <X size={18} color="#E11D48" strokeWidth={3} />, label: '打×' },
  { id: 'score', icon: <span className="text-red-600 font-bold text-sm">-2</span>, label: '扣分' },
  { id: 'comment', icon: <MessageCircle size={18} color="#E11D48" />, label: '评语' },
  { id: 'underline', icon: <Minus size={18} color="#E11D48" strokeWidth={3} />, label: '下划线' },
  { id: 'circle', icon: <Circle size={18} color="#E11D48" />, label: '圈画' },
  { id: 'freehand', icon: <Pencil size={18} color="#E11D48" />, label: '自由绘' },
];

interface Props {
  selectedTool: string;
  onSelectTool: (t: string) => void;
  color: string;
  onColorChange: (c: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (w: number) => void;
}

export default function AnnotationToolbar({ selectedTool, onSelectTool, color, onColorChange, strokeWidth, onStrokeWidthChange }: Props) {
  return (
    <div className="flex flex-col gap-1 p-2 bg-white rounded-lg shadow border border-gray-200">
      {TOOLS.map(t => (
        <button
          key={t.id}
          onClick={() => onSelectTool(t.id)}
          title={t.label}
          className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
            selectedTool === t.id
              ? 'bg-red-50 text-red-600 ring-2 ring-red-300'
              : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          {t.icon}
        </button>
      ))}

      <div className="border-t border-gray-200 my-1" />

      <div className="flex flex-col items-center gap-1 py-1">
        <span className="text-xs text-gray-500">颜色</span>
        <input
          type="color"
          value={color}
          onChange={e => onColorChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0"
        />
      </div>

      <div className="flex flex-col items-center gap-1 py-1">
        <span className="text-xs text-gray-500">粗细</span>
        <input
          type="range"
          min="1"
          max="6"
          value={strokeWidth}
          onChange={e => onStrokeWidthChange(Number(e.target.value))}
          className="w-8"
        />
      </div>
    </div>
  );
}
