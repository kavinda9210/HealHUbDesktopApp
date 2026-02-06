import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'healhub_access_token';
const REFRESH_TOKEN_KEY = 'healhub_refresh_token';
const USER_ROLE_KEY = 'healhub_user_role';

export async function saveAuth(auth: { accessToken: string; refreshToken: string; role?: string }) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, String(auth.accessToken ?? ''));
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, String(auth.refreshToken ?? ''));
  await SecureStore.setItemAsync(USER_ROLE_KEY, String(auth.role ?? ''));
}

export async function clearAuth() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_ROLE_KEY);
}

export async function getAccessToken(): Promise<string> {
  return (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) ?? '';
}

export async function getRefreshToken(): Promise<string> {
  return (await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)) ?? '';
}

export async function setAccessToken(token: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, String(token ?? ''));
}

export async function getUserRole(): Promise<string> {
  return (await SecureStore.getItemAsync(USER_ROLE_KEY)) ?? '';
}
