import { kvDelete, kvGet, kvSet } from './kvStorage';

const ACCESS_TOKEN_KEY = 'healhub_access_token';
const REFRESH_TOKEN_KEY = 'healhub_refresh_token';
const USER_ROLE_KEY = 'healhub_user_role';

export async function saveAuth(auth: { accessToken: string; refreshToken: string; role?: string }) {
  await kvSet(ACCESS_TOKEN_KEY, String(auth.accessToken ?? ''));
  await kvSet(REFRESH_TOKEN_KEY, String(auth.refreshToken ?? ''));
  await kvSet(USER_ROLE_KEY, String(auth.role ?? ''));
}

export async function clearAuth() {
  await kvDelete(ACCESS_TOKEN_KEY);
  await kvDelete(REFRESH_TOKEN_KEY);
  await kvDelete(USER_ROLE_KEY);
}

export async function getAccessToken(): Promise<string> {
  return (await kvGet(ACCESS_TOKEN_KEY)) ?? '';
}

export async function getRefreshToken(): Promise<string> {
  return (await kvGet(REFRESH_TOKEN_KEY)) ?? '';
}

export async function setAccessToken(token: string) {
  await kvSet(ACCESS_TOKEN_KEY, String(token ?? ''));
}

export async function getUserRole(): Promise<string> {
  return (await kvGet(USER_ROLE_KEY)) ?? '';
}
