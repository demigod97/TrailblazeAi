'use server';

import type { Module, Run } from '@trailblaze/shared';
import { revalidatePath } from 'next/cache';

interface ImportResponse {
  run: Run;
  modules: Module[];
}

interface ApiSuccess<T> {
  data: T;
  error: null;
}

interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

interface ApiError {
  data: null;
  error: ApiErrorBody;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

export async function importTrailmix(
  formData: FormData,
): Promise<{ modules: Module[] } | { error: string }> {
  try {
    const url = formData.get('url');

    if (!url || typeof url !== 'string') {
      return { error: 'URL is required' };
    }

    const vpsApiUrl = process.env.VPS_API_URL;
    const vpsApiSecret = process.env.VPS_API_SECRET;
    if (!vpsApiUrl || !vpsApiSecret) {
      return { error: 'Server configuration error — contact administrator' };
    }

    const response = await fetch(
      `${vpsApiUrl}/api/trailmix/import`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${vpsApiSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      },
    );

    const data = (await response.json()) as ApiResponse<ImportResponse>;

    if (!response.ok || data.error) {
      return { error: data.error?.message || 'Import failed — check URL' };
    }

    if (data.data) {
      revalidatePath('/dashboard');
      return { modules: data.data.modules };
    }

    return { error: 'Import failed — check URL' };
  } catch {
    return { error: 'Import failed — check URL' };
  }
}

export async function retryModule(moduleId: string): Promise<{ success: true } | { error: string }> {
  const vpsApiUrl = process.env.VPS_API_URL;
  const vpsApiSecret = process.env.VPS_API_SECRET;
  if (!vpsApiUrl || !vpsApiSecret) {
    return { error: 'Server configuration error' };
  }
  try {
    const response = await fetch(`${vpsApiUrl}/api/modules/${moduleId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${vpsApiSecret}` },
    });
    if (!response.ok) return { error: 'Retry failed' };
    revalidatePath('/dashboard');
    return { success: true };
  } catch {
    return { error: 'Retry failed' };
  }
}
