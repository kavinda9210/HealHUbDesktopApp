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

const ALARM_CHANNEL_ID = 'alarms_v2';
const ALARM_CATEGORY_ID = 'alarm';
export const STOP_ALARM_ACTION_ID = 'STOP_ALARM';

type AlarmData = {
  alarmKey?: string;
};

export async function configureAlarmNotificationsAsync() {
  const Notifications = await getNotificationsAsync();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
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
}): Promise<AlarmScheduleResult> {
  const Notifications = await getNotificationsAsync();
  const perm = await ensureAlarmPermissionAsync();
  if (perm.status !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: ALARM_CATEGORY_ID,
      data: input.data ?? {},
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.date,
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
    },
  });

  return { id };
}

export async function scheduleAlarmInSecondsAsync(input: {
  title: string;
  body: string;
  seconds: number;
  data?: AlarmData;
}): Promise<AlarmScheduleResult> {
  const Notifications = await getNotificationsAsync();
  const perm = await ensureAlarmPermissionAsync();
  if (perm.status !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: ALARM_CATEGORY_ID,
      data: input.data ?? {},
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(input.seconds)),
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
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
}): Promise<AlarmBurstScheduleResult> {
  const Notifications = await getNotificationsAsync();

  const startInSeconds = Math.max(1, Math.round(input.startInSeconds ?? 10));
  const repeatEverySeconds = Math.max(3, Math.round(input.repeatEverySeconds ?? 6));
  const repeatCount = Math.max(1, Math.min(20, Math.round(input.repeatCount ?? 10)));

  const perm = await ensureAlarmPermissionAsync();
  if (perm.status !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const now = Date.now();
  const ids: string[] = [];

  for (let i = 0; i < repeatCount; i++) {
    const fireAt = now + (startInSeconds + i * repeatEverySeconds) * 1000;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: input.title,
        body: input.body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: ALARM_CATEGORY_ID,
        data: input.data ?? {},
        ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
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
}): Promise<AlarmScheduleResult> {
  const Notifications = await getNotificationsAsync();
  const perm = await ensureAlarmPermissionAsync();
  if (perm.status !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Medicine reminder',
      body: `${input.medicineName} • ${String(input.hour).padStart(2, '0')}:${String(input.minute).padStart(2, '0')}`,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: ALARM_CATEGORY_ID,
      data: {},
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: input.hour,
      minute: input.minute,
      ...(Platform.OS === 'android' ? { channelId: ALARM_CHANNEL_ID } : null),
    },
  });

  return { id };
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
