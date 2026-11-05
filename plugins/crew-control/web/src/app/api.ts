// Bentuk galat = ApiError di src/contract/errors.ts; tidak diimpor agar tes node (tanpa alias) tetap jalan.
type ApiErrorBody = { error: { code: string; message: string; details?: Record<string, unknown> } };

/** Galat seragam dari server (ARCHITECTURE 6.1): { error: { code, message, details? } }. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
      // Tanpa isi kirim {} (6.1).
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new ApiError(0, 'network', 'Server tidak terjangkau. Periksa koneksi lalu coba lagi.');
  }
  const data: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const e = (data as Partial<ApiErrorBody> | undefined)?.error;
    throw new ApiError(res.status, e?.code ?? 'internal_error', e?.message ?? 'Terjadi galat di server.', e?.details);
  }
  return data as T;
}
