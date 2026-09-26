import type { ChangeDetectionResult } from '@/types';

const BASE_URL = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Accept': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export const apiClient = {
  healthCheck: () => request<{ status: string; demo_mode: boolean }>('/health'),

  analyzeBeforeAfter: async (before: File, after: File): Promise<ChangeDetectionResult> => {
    const form = new FormData();
    form.append('before', before);
    form.append('after', after);
    return request<ChangeDetectionResult>('/analyze/before-after', { method: 'POST', body: form });
  },
};
