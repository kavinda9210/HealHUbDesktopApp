import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';

import { API_BASE_URL } from './api';
import { getAccessToken } from './authStorage';
import {
  getLastAvailability,
  getQueuedLocation,
  setQueuedLocation,
  type QueuedLocationPayload,
} from './ambulanceLocationStorage';

export const AMBULANCE_LOCATION_TASK = 'healhub-ambulance-location-task';

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

TaskManager.defineTask(AMBULANCE_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    try {
      const started = await Location.hasStartedLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
      if (started) await Location.stopLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
    } catch {
      // ignore
    }
    return;
  }

  const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
  if (!locations || locations.length === 0) return;

  const last = locations[locations.length - 1];
  const latitude = last.coords.latitude;
  const longitude = last.coords.longitude;
  const is_available = await getLastAvailability();

  // First try to flush any queued payload
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
    // Offline or server issue: persist latest so it can be synced later
    await setQueuedLocation(payload);
  }
});

export async function ensureLocationPermissionsAsync() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== Location.PermissionStatus.GRANTED) {
    return { ok: false as const, message: 'Foreground location permission is required.' };
  }

  // Background permission is required for background updates.
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== Location.PermissionStatus.GRANTED) {
    return { ok: false as const, message: 'Background location permission is required for offline/background tracking.' };
  }

  return { ok: true as const };
}

export async function startAmbulanceBackgroundLocationAsync() {
  const started = await Location.hasStartedLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
  if (started) return;

  await Location.startLocationUpdatesAsync(AMBULANCE_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 30,
    timeInterval: 8000,
    pausesUpdatesAutomatically: false,
    // Android requires a foreground service notification for background location.
    foregroundService: {
      notificationTitle: 'HealHub location sharing',
      notificationBody: 'Sharing ambulance location for dispatch',
    },
  });
}

export async function stopAmbulanceBackgroundLocationAsync() {
  const started = await Location.hasStartedLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
  if (!started) return;
  await Location.stopLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
}

export async function isAmbulanceBackgroundLocationRunningAsync(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(AMBULANCE_LOCATION_TASK);
  } catch {
    return false;
  }
}
