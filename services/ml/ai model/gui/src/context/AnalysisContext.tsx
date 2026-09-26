import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ChangeDetectionResult } from '@/types';
import { apiClient } from '@/services/api';

interface AnalysisContextValue {
  // State
  changeResult: ChangeDetectionResult | null;
  isAnalyzing: boolean;
  beforeImage: File | null;
  afterImage: File | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  processingStep: number;
  error: string | null;

  // Actions
  analyzeBeforeAfter: (before: File, after: File) => Promise<void>;
  clearResults: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

const PROCESSING_STEPS = [
  'Preprocessing images',
  'Aligning image pair',
  'Pixel-level differencing',
  'NDVI & spectral analysis',
  'Change classification & risk mapping',
  'Report generation',
];

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [changeResult, setChangeResult] = useState<ChangeDetectionResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [beforeImage, setBeforeImage] = useState<File | null>(null);
  const [afterImage, setAfterImage] = useState<File | null>(null);
  const [beforeImageUrl, setBeforeImageUrl] = useState<string | null>(null);
  const [afterImageUrl, setAfterImageUrl] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runProcessingSteps = useCallback(async () => {
    for (let step = 1; step <= PROCESSING_STEPS.length; step++) {
      setProcessingStep(step);
      await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
    }
  }, []);

  const analyzeBeforeAfter = useCallback(async (before: File, after: File) => {
    // Clean up old object URLs
    if (beforeImageUrl) URL.revokeObjectURL(beforeImageUrl);
    if (afterImageUrl) URL.revokeObjectURL(afterImageUrl);

    setBeforeImage(before);
    setAfterImage(after);
    setBeforeImageUrl(URL.createObjectURL(before));
    setAfterImageUrl(URL.createObjectURL(after));
    setIsAnalyzing(true);
    setError(null);
    setChangeResult(null);

    try {
      // Run API call and processing animation in parallel
      const [result] = await Promise.all([
        apiClient.analyzeBeforeAfter(before, after),
        runProcessingSteps(),
      ]);
      setChangeResult(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Change detection failed';
      console.warn('Backend change detection failed:', message);
      setError(
        `Change detection failed: ${message}. Make sure the backend is running on localhost:8000.`
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [beforeImageUrl, afterImageUrl, runProcessingSteps]);

  const clearResults = useCallback(() => {
    setChangeResult(null);
    setProcessingStep(0);
    setError(null);
  }, []);

  return (
    <AnalysisContext.Provider
      value={{
        changeResult, isAnalyzing,
        beforeImage, afterImage, beforeImageUrl, afterImageUrl,
        processingStep, error,
        analyzeBeforeAfter, clearResults,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error('useAnalysis must be used within AnalysisProvider');
  return ctx;
}
