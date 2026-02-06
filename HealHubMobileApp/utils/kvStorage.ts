import { Platform } from 'react-native';

type Backend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

const memory = new Map<string, string>();

function hasExpoNativeModule(moduleName: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const core = require('expo-modules-core') as {
      requireOptionalNativeModule?: (name: string) => unknown;
    };
    if (typeof core.requireOptionalNativeModule === 'function') {
      return Boolean(core.requireOptionalNativeModule(moduleName));
    }
  } catch {
    // ignore
  }

  // Fallback for older RN / environments.
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native') as { NativeModules?: Record<string, unknown> };
    return Boolean(rn?.NativeModules?.[moduleName]);
  } catch {
    return false;
  }
}

function makeMemoryBackend(): Backend {
  return {
    async getItemAsync(key) {
      return memory.has(key) ? String(memory.get(key)) : null;
    },
    async setItemAsync(key, value) {
      memory.set(key, String(value));
    },
    async deleteItemAsync(key) {
      memory.delete(key);
    },
  };
}

function makeWebBackend(): Backend {
  return {
    async getItemAsync(key) {
      try {
        if (typeof localStorage === 'undefined') return null;
        const v = localStorage.getItem(key);
        return v === null ? null : String(v);
      } catch {
        return null;
      }
    },
    async setItemAsync(key, value) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, String(value));
      } catch {
        // ignore
      }
    },
    async deleteItemAsync(key) {
      try {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(key);
      } catch {
        // ignore
      }
    },
  };
}

function loadSecureStoreBackend(): Backend | null {
  try {
    // Avoid requiring the JS module when the native module is missing (Expo Go / web / stale builds).
    // Some Expo modules log noisy errors during import if the native side isn't present.
    if (!hasExpoNativeModule('ExpoSecureStore')) return null;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const SecureStore = require('expo-secure-store') as {
      isAvailableAsync?: () => Promise<boolean>;
      getItemAsync: (key: string) => Promise<string | null>;
      setItemAsync: (key: string, value: string) => Promise<void>;
      deleteItemAsync: (key: string) => Promise<void>;
    };

    if (
      SecureStore &&
      typeof SecureStore.getItemAsync === 'function' &&
      typeof SecureStore.setItemAsync === 'function' &&
      typeof SecureStore.deleteItemAsync === 'function'
    ) {
      return {
        async getItemAsync(key: string) {
          if (typeof SecureStore.isAvailableAsync === 'function') {
            const ok = await SecureStore.isAvailableAsync();
            if (!ok) return null;
          }
          return SecureStore.getItemAsync(key);
        },
        async setItemAsync(key: string, value: string) {
          if (typeof SecureStore.isAvailableAsync === 'function') {
            const ok = await SecureStore.isAvailableAsync();
            if (!ok) return;
          }
          return SecureStore.setItemAsync(key, value);
        },
        async deleteItemAsync(key: string) {
          if (typeof SecureStore.isAvailableAsync === 'function') {
            const ok = await SecureStore.isAvailableAsync();
            if (!ok) return;
          }
          return SecureStore.deleteItemAsync(key);
        },
      };
    }
  } catch {
    // Module missing at runtime (e.g., web or dev build not rebuilt)
  }

  return null;
}

let backend: Backend | null = null;

function isMissingSecureStoreNativeModule(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('ExpoSecureStore') || msg.includes("Cannot find native module 'ExpoSecureStore'");
}

function forceFallbackBackend(): Backend {
  if (Platform.OS === 'web') return makeWebBackend();
  return makeMemoryBackend();
}

async function callWithBackend<T>(fn: (b: Backend) => Promise<T>): Promise<T> {
  const b = getBackend();
  try {
    return await fn(b);
  } catch (err) {
    if (isMissingSecureStoreNativeModule(err)) {
      backend = forceFallbackBackend();
      return fn(backend);
    }
    throw err;
  }
}

function getBackend(): Backend {
  if (backend) return backend;

  const secure = loadSecureStoreBackend();
  if (secure) {
    backend = secure;
    return backend;
  }

  if (Platform.OS === 'web') {
    backend = makeWebBackend();
    return backend;
  }

  backend = makeMemoryBackend();
  return backend;
}

export async function kvGet(key: string): Promise<string | null> {
  return callWithBackend((b) => b.getItemAsync(key));
}

export async function kvSet(key: string, value: string): Promise<void> {
  return callWithBackend((b) => b.setItemAsync(key, value));
}

export async function kvDelete(key: string): Promise<void> {
  return callWithBackend((b) => b.deleteItemAsync(key));
}
