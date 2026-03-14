import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule> | null = null;

async function getNotificationsAsync(): Promise<NotificationsModule> {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }
  return notificationsModulePromise;
}

export type AlarmScheduleResult = {
  id: string;
};

export type AlarmBurstScheduleResult = {
  ids: string[];
};

export type AlarmSoundConfig = {
  /** iOS expects filename with extension (bundled). Use 'default' for system sound. */
  iosSound: string;
  /** Android expects raw resource name (no extension). Use 'default' for system sound. */
  androidSound: string;
};

const ALARM_CHANNEL_PREFIX = 'alarms_v2';
const MISSED_CHANNEL_ID = 'alarms_missed_v1';
const ALARM_CATEGORY_ID = 'alarm';
export const STOP_ALARM_ACTION_ID = 'STOP_ALARM';

type AlarmData = {
  alarmKey?: string;
  /** If true, do not play sound (used for missed reminders). */
  silent?: boolean;
  [key: string]: any;
};

function makeAlarmChannelId(androidSound: string | null | undefined): string {
  const key = (androidSound ?? 'default').trim() || 'default';
  if (key === 'default') return `${ALARM_CHANNEL_PREFIX}_default`;
  return `${ALARM_CHANNEL_PREFIX}_${key}`;
}

async function ensureAlarmChannelAsync(androidSound: string | null | undefined) {
  if (Platform.OS !== 'android') return;
  const Notifications = await getNotificationsAsync();
  const channelId = makeAlarmChannelId(androidSound);

  await Notifications.setNotificationChannelAsync(channelId, {
    name: 'Alarms',
    importance: Notifications.AndroidImportance.MAX,
    sound: androidSound && androidSound !== 'default' ? androidSound : 'default',
    // Longer pattern to feel closer to an alarm.
    vibrationPattern: [0, 1200, 600, 1200, 600, 1200, 600, 1200],
    enableVibrate: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
    showBadge: true,
    // Request ALARM audio usage when playing sound.
    // Note: actual behavior still depends on OEM + user settings.
    audioAttributes: {
      usage: Notifications.AndroidAudioUsage.ALARM,
      contentType: Notifications.AndroidAudioContentType.SONIFICATION,
    },
  });
}

async function ensureMissedChannelAsync() {
  if (Platform.OS !== 'android') return;
  const Notifications = await getNotificationsAsync();
  await Notifications.setNotificationChannelAsync(MISSED_CHANNEL_ID, {
    name: 'Missed reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    enableVibrate: false,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    bypassDnd: false,
    showBadge: true,
  });
}

function isSilentAlarm(data: any): boolean {
  return Boolean(data?.silent);
}

export async function configureAlarmNotificationsAsync() {
  const Notifications = await getNotificationsAsync();

  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data: any = (notification as any)?.request?.content?.data ?? {};
      const silent = isSilentAlarm(data);
      return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: !silent,
      shouldSetBadge: true,
      };
    },
  });

  await ensureAlarmChannelAsync('default');
  await ensureMissedChannelAsync();

  // Action buttons (Stop alarm)
  try {
    await Notifications.setNotificationCategoryAsync(ALARM_CATEGORY_ID, [
      {
        identifier: STOP_ALARM_ACTION_ID,
        buttonTitle: 'Stop',
        options: { opensAppToForeground: false },
      },
    ]);
  } catch (e) {
    // Best-effort (older SDKs / platforms may not support categories)
    console.log('setNotificationCategoryAsync failed:', e);
  }
}

export async function ensureAlarmPermissionAsync() {
  const Notifications = await getNotificationsAsync();
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status === 'granted') return settings;
  return await Notifications.requestPermissionsAsync();
}

export async function scheduleAlarmAtAsync(input: {
  title: string;
  body: string;
  date: Date;
  data?: AlarmData;
  sound?: AlarmSoundConfig;
}): Promise<AlarmScheduleResult> {
  const Notifications = await getNotificationsAsync();
  const perm = await ensureAlarmPermissionAsync();
  if (perm.status !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const silent = isSilentAlarm(input.data);
  const iosSound = silent ? null : (input.sound?.iosSound ?? 'default');
  const androidSound = silent ? null : (input.sound?.androidSound ?? 'default');

  if (Platform.OS === 'android') {
    if (silent) {
      await ensureMissedChannelAsync();
    } else {
      await ensureAlarmChannelAsync(androidSound);
    }
  }

  const androidChannelId = Platform.OS === 'android' ? (silent ? MISSED_CHANNEL_ID : makeAlarmChannelId(androidSound)) : undefined;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: iosSound as any,
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: ALARM_CATEGORY_ID,
      data: input.data ?? {},
      ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.date,
      ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
    },
  });

  return { id };
}

export async function scheduleAlarmInSecondsAsync(input: {
  title: string;
  body: string;
  seconds: number;
  data?: AlarmData;
  sound?: AlarmSoundConfig;
}): Promise<AlarmScheduleResult> {
  const Notifications = await getNotificationsAsync();
  const perm = await ensureAlarmPermissionAsync();
  if (perm.status !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const silent = isSilentAlarm(input.data);
  const iosSound = silent ? null : (input.sound?.iosSound ?? 'default');
  const androidSound = silent ? null : (input.sound?.androidSound ?? 'default');

  if (Platform.OS === 'android') {
    if (silent) {
      await ensureMissedChannelAsync();
    } else {
      await ensureAlarmChannelAsync(androidSound);
    }
  }

  const androidChannelId = Platform.OS === 'android' ? (silent ? MISSED_CHANNEL_ID : makeAlarmChannelId(androidSound)) : undefined;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: iosSound as any,
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: ALARM_CATEGORY_ID,
      data: input.data ?? {},
      ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(input.seconds)),
      ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
    },
  });

  return { id };
}

/**
 * Best-effort "call-like" alarm: schedules a burst of notifications so the device
 * plays sound/vibration repeatedly for a short period (even if the app is closed).
 *
 * Notes:
 * - This is NOT the same as a true native alarm / incoming-call UI.
 * - OEM/Android settings may throttle, group, or limit frequent notifications.
 */
export async function scheduleCallLikeAlarmBurstAsync(input: {
  title: string;
  body: string;
  startInSeconds?: number;
  repeatEverySeconds?: number;
  repeatCount?: number;
  data?: AlarmData;
  sound?: AlarmSoundConfig;
}): Promise<AlarmBurstScheduleResult> {
  const Notifications = await getNotificationsAsync();

  const startInSeconds = Math.max(1, Math.round(input.startInSeconds ?? 10));
  const repeatEverySeconds = Math.max(3, Math.round(input.repeatEverySeconds ?? 6));
  const repeatCount = Math.max(1, Math.min(20, Math.round(input.repeatCount ?? 10)));

  const perm = await ensureAlarmPermissionAsync();
  if (perm.status !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const silent = isSilentAlarm(input.data);
  const iosSound = silent ? null : (input.sound?.iosSound ?? 'default');
  const androidSound = silent ? null : (input.sound?.androidSound ?? 'default');

  if (Platform.OS === 'android') {
    if (silent) {
      await ensureMissedChannelAsync();
    } else {
      await ensureAlarmChannelAsync(androidSound);
    }
  }

  const androidChannelId = Platform.OS === 'android' ? (silent ? MISSED_CHANNEL_ID : makeAlarmChannelId(androidSound)) : undefined;

  const now = Date.now();
  const ids: string[] = [];

  for (let i = 0; i < repeatCount; i++) {
    const fireAt = now + (startInSeconds + i * repeatEverySeconds) * 1000;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: iosSound as any,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: ALARM_CATEGORY_ID,
        data: input.data ?? {},
        ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
      },
    });
    ids.push(id);
  }

  return { ids };
}

export async function scheduleDailyMedicineReminderAsync(input: {
  medicineName: string;
  hour: number;
  minute: number;
  sound?: AlarmSoundConfig;
}): Promise<AlarmScheduleResult> {
  const Notifications = await getNotificationsAsync();
  const perm = await ensureAlarmPermissionAsync();
  if (perm.status !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const iosSound = input.sound?.iosSound ?? 'default';
  const androidSound = input.sound?.androidSound ?? 'default';

  if (Platform.OS === 'android') {
    await ensureAlarmChannelAsync(androidSound);
  }

  const androidChannelId = Platform.OS === 'android' ? makeAlarmChannelId(androidSound) : undefined;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Medicine reminder',
      body: `${input.medicineName} • ${String(input.hour).padStart(2, '0')}:${String(input.minute).padStart(2, '0')}`,
      sound: iosSound as any,
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: ALARM_CATEGORY_ID,
      data: {},
      ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: input.hour,
      minute: input.minute,
      ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
    },
  });

  return { id };
}

export async function scheduleAlarmBurstAtAsync(input: {
  title: string;
  body: string;
  date: Date;
  burstEverySeconds?: number;
  burstCount?: number;
  data?: AlarmData;
  sound?: AlarmSoundConfig;
}): Promise<AlarmBurstScheduleResult> {
  const Notifications = await getNotificationsAsync();
  const perm = await ensureAlarmPermissionAsync();
  if (perm.status !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const burstEverySeconds = Math.max(10, Math.round(input.burstEverySeconds ?? 60));
  const burstCount = Math.max(1, Math.min(10, Math.round(input.burstCount ?? 4)));

  const silent = isSilentAlarm(input.data);
  const iosSound = silent ? null : (input.sound?.iosSound ?? 'default');
  const androidSound = silent ? null : (input.sound?.androidSound ?? 'default');

  if (Platform.OS === 'android') {
    if (silent) {
      await ensureMissedChannelAsync();
    } else {
      await ensureAlarmChannelAsync(androidSound);
    }
  }

  const androidChannelId = Platform.OS === 'android' ? (silent ? MISSED_CHANNEL_ID : makeAlarmChannelId(androidSound)) : undefined;

  const base = input.date.getTime();
  const ids: string[] = [];

  for (let i = 0; i < burstCount; i++) {
    const fireAt = base + i * burstEverySeconds * 1000;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: iosSound as any,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: ALARM_CATEGORY_ID,
        data: input.data ?? {},
        ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        ...(Platform.OS === 'android' ? { channelId: androidChannelId } : {}),
      },
    });
    ids.push(id);
  }

  return { ids };
}

export async function scheduleMissedReminderAtAsync(input: {
  title: string;
  body: string;
  date: Date;
  data?: AlarmData;
}): Promise<AlarmScheduleResult> {
  return scheduleAlarmAtAsync({
    title: input.title,
    body: input.body,
    date: input.date,
    data: { ...(input.data ?? {}), silent: true },
  });
}

export async function cancelScheduledAlarmsByKeyAsync(alarmKey: string) {
  const Notifications = await getNotificationsAsync();
  if (!alarmKey) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const targets = scheduled.filter((req: any) => {
    const key = req?.content?.data?.alarmKey;
    return key && String(key) === String(alarmKey);
  });
  for (const t of targets) {
    try {
      await Notifications.cancelScheduledNotificationAsync(String(t.identifier));
    } catch (e) {
      console.log('cancelScheduledNotificationAsync failed:', e);
    }
  }
}

export async function cancelAllAlarmsAsync() {
  const Notifications = await getNotificationsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function cancelAlarmAsync(id: string) {
  const Notifications = await getNotificationsAsync();
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(String(id));
}

export async function listScheduledAlarmsAsync() {
  const Notifications = await getNotificationsAsync();
  return await Notifications.getAllScheduledNotificationsAsync();
}
