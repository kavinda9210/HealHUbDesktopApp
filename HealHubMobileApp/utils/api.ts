import Constants from 'expo-constants';

function getExtra(): Record<string, unknown> {
  // expoConfig is present in SDK 49+; fall back for older manifests.
  const anyConstants = Constants as unknown as {
    expoConfig?: { extra?: Record<string, unknown> };
    manifest2?: { extra?: Record<string, unknown> };
    manifest?: { extra?: Record<string, unknown> };
  };

  return (
    anyConstants.expoConfig?.extra ??
    anyConstants.manifest2?.extra ??
    anyConstants.manifest?.extra ??
    {}
  );
}

export const API_BASE_URL = String(
  // Preferred: Expo public env var (set in .env or eas.json)
  process.env.EXPO_PUBLIC_API_BASE_URL ??
    // Optional: app.json -> expo.extra.apiBaseUrl
    (getExtra() as { apiBaseUrl?: unknown }).apiBaseUrl ??
    // Fallback for local dev
    'http://localhost:5000'
).replace(/\/$/, '');

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: any };

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.ok) return { ok: true, status: res.status, data };
  return { ok: false, status: res.status, data };
}
