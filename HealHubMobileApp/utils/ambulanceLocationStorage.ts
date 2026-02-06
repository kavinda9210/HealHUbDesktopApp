import { kvDelete, kvGet, kvSet } from './kvStorage';

const SHARE_ENABLED_KEY = 'healhub_amb_share_enabled';
const LAST_LOCATION_PAYLOAD_KEY = 'healhub_amb_last_location_payload';
const LAST_AVAILABILITY_KEY = 'healhub_amb_last_availability';

export type QueuedLocationPayload = {
  latitude: number;
  longitude: number;
  is_available: boolean;
  queued_at: string;
};

export async function setShareEnabled(enabled: boolean) {
  await kvSet(SHARE_ENABLED_KEY, enabled ? '1' : '0');
}

export async function getShareEnabled(): Promise<boolean> {
  const v = await kvGet(SHARE_ENABLED_KEY);
  return v === '1' || v === 'true';
}

export async function setLastAvailability(isAvailable: boolean) {
  await kvSet(LAST_AVAILABILITY_KEY, isAvailable ? '1' : '0');
}

export async function getLastAvailability(): Promise<boolean> {
  const v = await kvGet(LAST_AVAILABILITY_KEY);
  if (v === null) return true;
  return v === '1' || v === 'true';
}

export async function setQueuedLocation(payload: QueuedLocationPayload | null) {
  if (!payload) {
    await kvDelete(LAST_LOCATION_PAYLOAD_KEY);
    return;
  }
  await kvSet(LAST_LOCATION_PAYLOAD_KEY, JSON.stringify(payload));
}

export async function getQueuedLocation(): Promise<QueuedLocationPayload | null> {
  const raw = await kvGet(LAST_LOCATION_PAYLOAD_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as QueuedLocationPayload;
  } catch {
    return null;
  }
}
