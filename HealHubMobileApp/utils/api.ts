import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

function inferDevHost(): string {
  const anyConstants = Constants as unknown as {
    expoConfig?: { hostUri?: string; extra?: Record<string, unknown> };
    manifest2?: any;
    manifest?: any;
    experienceUrl?: string;
  };

  const hostUri = anyConstants.expoConfig?.hostUri;
  if (typeof hostUri === 'string' && hostUri.length > 0) {
    // Example: "192.168.1.20:8081"
    return hostUri.split(':')[0];
  }

  const debuggerHost = anyConstants.manifest?.debuggerHost;
  if (typeof debuggerHost === 'string' && debuggerHost.length > 0) {
    // Example: "192.168.1.20:8081"
    return debuggerHost.split(':')[0];
  }

  const experienceUrl = anyConstants.experienceUrl;
  if (typeof experienceUrl === 'string' && experienceUrl.length > 0) {
    // Example: "exp://192.168.1.20:8081"
    const match = experienceUrl.match(/^[a-z]+:\/\/([^/:]+)(?::\d+)?/i);
    if (match?.[1]) return match[1];
  }

  return 'localhost';
}

function normalizeHost(host: string): string {
  const h = host.trim();
  if (h === 'localhost' || h === '127.0.0.1') {
    // Android emulators can't reach host localhost directly.
    if (Platform.OS === 'android') return '10.0.2.2';
  }
  return h;
}

function computeApiBaseUrl(): string {
  // 1) Preferred: Expo public env var (set in .env or eas.json)
  const env = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (env && String(env).trim().length > 0) return String(env).trim();

  // 2) Optional: app.json -> expo.extra.apiBaseUrl
  const extraUrl = (getExtra() as { apiBaseUrl?: unknown }).apiBaseUrl;
  if (typeof extraUrl === 'string' && extraUrl.trim().length > 0) return extraUrl.trim();

  // 3) Dev-friendly: infer host IP from Expo and assume backend runs on :5000
  const inferredHost = normalizeHost(inferDevHost());
  return `http://${inferredHost}:5000`;
}

export const API_BASE_URL = computeApiBaseUrl().replace(/\/$/, '');

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: any };

export async function apiGet<T>(path: string, accessToken?: string): Promise<ApiResult<T>> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });
  } catch (e: any) {
    return {
      ok: false,
      status: 0,
      data: {
        message: 'Network request failed',
        url,
        error: e?.message ? String(e.message) : String(e),
      },
    };
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.ok) return { ok: true, status: res.status, data };
  return { ok: false, status: res.status, data };
}

export async function apiPost<T>(path: string, body: unknown, accessToken?: string): Promise<ApiResult<T>> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch (e: any) {
    return {
      ok: false,
      status: 0,
      data: {
        message: 'Network request failed',
        url,
        error: e?.message ? String(e.message) : String(e),
      },
    };
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.ok) return { ok: true, status: res.status, data };
  return { ok: false, status: res.status, data };
}

export async function apiPostFormData<T>(path: string, formData: FormData, accessToken?: string): Promise<ApiResult<T>> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        // NOTE: Do not set Content-Type for FormData; fetch will set boundary.
      },
      body: formData,
    });
  } catch (e: any) {
    return {
      ok: false,
      status: 0,
      data: {
        message: 'Network request failed',
        url,
        error: e?.message ? String(e.message) : String(e),
      },
    };
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.ok) return { ok: true, status: res.status, data };
  return { ok: false, status: res.status, data };
}
