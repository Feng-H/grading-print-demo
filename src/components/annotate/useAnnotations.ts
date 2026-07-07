'use client';
import useSWR from 'swr';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface Annotation {
  id?: string;
  questionId?: string | null;
  page: number;
  kind: 'check' | 'cross' | 'score' | 'comment' | 'circle' | 'underline' | 'arrow' | 'freehand';
  xPct: number;
  yPct: number;
  wPct?: number | null;
  hPct?: number | null;
  text?: string | null;
  strokePath?: number[][] | null;
  color?: string;
  fontSize?: number | null;
  strokeWidth?: number | null;
  source?: 'ai' | 'teacher';
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useAnnotations(submissionId: string) {
  const { data, error, mutate } = useSWR<{ annotations: Annotation[] }>(
    submissionId ? `/api/submissions/${submissionId}/annotations` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data?.annotations) {
      setLocalAnnotations(data.annotations);
      setDirty(false);
    }
  }, [data]);

  // 自动保存（debounce 1.5秒）
  const save = useCallback(async (anns: Annotation[]) => {
    if (!submissionId) return;
    try {
      await fetch(`/api/submissions/${submissionId}/annotations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotations: anns }),
      });
      setDirty(false);
      mutate();
    } catch (err) {
      console.error('保存批注失败:', err);
    }
  }, [submissionId, mutate]);

  const updateAnnotations = useCallback((updater: (prev: Annotation[]) => Annotation[]) => {
    setLocalAnnotations(prev => {
      const next = updater(prev);
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(next), 1500);
      return next;
    });
  }, [save]);

  const addAnnotation = useCallback((ann: Omit<Annotation, 'source'>) => {
    updateAnnotations(prev => [...prev, { ...ann, source: 'teacher' }]);
  }, [updateAnnotations]);

  const updateAnnotation = useCallback((id: string, patch: Partial<Annotation>) => {
    updateAnnotations(prev => prev.map(a => (a.id === id || !a.id) ? { ...a, ...patch } : a));
  }, [updateAnnotations]);

  const deleteAnnotation = useCallback((id: string) => {
    updateAnnotations(prev => prev.filter(a => a.id !== id));
  }, [updateAnnotations]);

  const flushSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    return save(localAnnotations);
  }, [localAnnotations, save]);

  return {
    annotations: localAnnotations,
    loading: !data && !error,
    error,
    dirty,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    updateAnnotations,
    flushSave,
  };
}
