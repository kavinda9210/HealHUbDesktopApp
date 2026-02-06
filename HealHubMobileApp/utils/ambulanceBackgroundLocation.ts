// NOTE: Do not import native modules unconditionally.
// In Expo Go / web / stale dev-client builds, the native module might be missing.
// We use guarded requires so the app can still boot and show a helpful message.

import { API_BASE_URL } from './api';
import { getAccessToken } from './authStorage';
import {
  getLastAvailability,
  getQueuedLocation,
  setQueuedLocation,
  type QueuedLocationPayload,
} from './ambulanceLocationStorage';

export const AMBULANCE_LOCATION_TASK = 'healhub-ambulance-location-task';

type TaskManagerModule = typeof import('expo-task-manager');
type LocationModule = typeof import('expo-location');

let TaskManager: TaskManagerModule | null = null;
let Location: LocationModule | null = null;

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

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const rn = require('react-native') as { NativeModules?: Record<string, unknown> };
    return Boolean(rn?.NativeModules?.[moduleName]);
  } catch {
    return false;
  }
}

function isMissingTaskManagerNativeModule(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('ExpoTaskManager') || msg.includes("Cannot find native module 'ExpoTaskManager'");
}

function loadNativeModules() {
  if (!TaskManager) {
    try {
      if (!hasExpoNativeModule('ExpoTaskManager')) {
        TaskManager = null;
      } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      TaskManager = require('expo-task-manager') as TaskManagerModule;
      }
    } catch {
      TaskManager = null;
    }
  }

  if (!Location) {
    try {
      if (!hasExpoNativeModule('ExpoLocation')) {
        Location = null;
      } else {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Location = require('expo-location') as LocationModule;
      }
    } catch {
      Location = null;
    }
  }

  return { TaskManager, Location };
}

function missingNativeModuleMessage() {
  return (
    "Background location requires a native build with expo-task-manager. " +
    "If you're using a dev-client, rebuild and reinstall it after installing expo-task-manager. " +
    "This won't work on web."
  );
}

async function postLocation(payload: { latitude: number; longitude: number; is_available: boolean }, accessToken: string) {
  const url = `${API_BASE_URL}/api/ambulance/update-location`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = '';
    try {
      const data = await res.json();
      msg = String(data?.message || data?.error || '');
    } catch {
      // ignore
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }
}

// Register the task in module scope when possible.
// If native modules are missing, we simply don't register, and starting sharing will show an error.
{
  const mods = loadNativeModules();
  if (mods.TaskManager && mods.Location) {
    try {
      if (!(mods.TaskManager as any).isTaskDefined?.(AMBULANCE_LOCATION_TASK)) {
        mods.TaskManager.defineTask(AMBULANCE_LOCATION_TASK, async ({ data, error }) => {
          if (error) {
            return;
          }

          const accessToken = await getAccessToken();
          if (!accessToken) {
            try {
              const started = await mods.Location!.hasStartedLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
              if (started) await mods.Location!.stopLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
            } catch {
              // ignore
            }
            return;
          }

          const locations = (data as any)?.locations as any[] | undefined;
          if (!locations || locations.length === 0) return;

          const last = locations[locations.length - 1];
          const latitude = last.coords.latitude;
          const longitude = last.coords.longitude;
          const is_available = await getLastAvailability();

          const queued = await getQueuedLocation();
          if (queued) {
            try {
              await postLocation(
                { latitude: queued.latitude, longitude: queued.longitude, is_available: queued.is_available },
                accessToken
              );
              await setQueuedLocation(null);
            } catch {
              // still offline; keep queued
            }
          }

          const payload: QueuedLocationPayload = {
            latitude,
            longitude,
            is_available,
            queued_at: new Date().toISOString(),
          };

          try {
            await postLocation({ latitude, longitude, is_available }, accessToken);
            await setQueuedLocation(null);
          } catch {
            await setQueuedLocation(payload);
          }
        });
      }
    } catch (err) {
      if (isMissingTaskManagerNativeModule(err)) {
        TaskManager = null;
      } else {
        throw err;
      }
    }
  }
}

export async function ensureLocationPermissionsAsync() {
  const mods = loadNativeModules();
  if (!mods.Location || !mods.TaskManager) {
    return { ok: false as const, message: missingNativeModuleMessage() };
  }

  try {
    const fg = await mods.Location.requestForegroundPermissionsAsync();
    if (fg.status !== mods.Location.PermissionStatus.GRANTED) {
      return { ok: false as const, message: 'Foreground location permission is required.' };
    }

    // Background permission is required for background updates.
    const bg = await mods.Location.requestBackgroundPermissionsAsync();
    if (bg.status !== mods.Location.PermissionStatus.GRANTED) {
      return { ok: false as const, message: 'Background location permission is required for offline/background tracking.' };
    }

    return { ok: true as const };
  } catch (err) {
    if (isMissingTaskManagerNativeModule(err)) {
      TaskManager = null;
      return { ok: false as const, message: missingNativeModuleMessage() };
    }
    throw err;
  }
}

export async function startAmbulanceBackgroundLocationAsync() {
  const mods = loadNativeModules();
  if (!mods.Location || !mods.TaskManager) throw new Error(missingNativeModuleMessage());

  try {
    const started = await mods.Location.hasStartedLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
    if (started) return;

    await mods.Location.startLocationUpdatesAsync(AMBULANCE_LOCATION_TASK, {
      accuracy: mods.Location.Accuracy.Balanced,
      distanceInterval: 30,
      timeInterval: 8000,
      pausesUpdatesAutomatically: false,
      // Android requires a foreground service notification for background location.
      foregroundService: {
        notificationTitle: 'HealHub location sharing',
        notificationBody: 'Sharing ambulance location for dispatch',
      },
    });
  } catch (err) {
    if (isMissingTaskManagerNativeModule(err)) {
      TaskManager = null;
      throw new Error(missingNativeModuleMessage());
    }
    throw err;
  }
}

export async function stopAmbulanceBackgroundLocationAsync() {
  const mods = loadNativeModules();
  if (!mods.Location || !mods.TaskManager) return;

  try {
    const started = await mods.Location.hasStartedLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
    if (!started) return;
    await mods.Location.stopLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
  } catch (err) {
    if (isMissingTaskManagerNativeModule(err)) {
      TaskManager = null;
      return;
    }
    throw err;
  }
}

export async function isAmbulanceBackgroundLocationRunningAsync(): Promise<boolean> {
  try {
    const mods = loadNativeModules();
    if (!mods.Location || !mods.TaskManager) return false;
    return await mods.Location.hasStartedLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
  } catch {
    return false;
  }
}
