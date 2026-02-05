import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export type AlarmScheduleResult = {
  id: string;
};

function isExpoGo() {
  // Expo Go reports `appOwnership: 'expo'`
  // Dev builds / standalone are usually 'guest' | 'standalone'.
  return Constants.appOwnership === 'expo';
}

function requireDevBuild(featureName: string) {
  if (!isExpoGo()) return;
  throw new Error(
    `${featureName} is not supported in Expo Go on Android (SDK 53+). Use a development build (dev client) instead.`
  );
}

export async function configureAlarmNotificationsAsync() {
  requireDevBuild('Alarm notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarms', {
      name: 'Alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 500, 500, 500, 500],
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      showBadge: true,
    });
  }
}

export async function ensureAlarmPermissionAsync() {
  requireDevBuild('Notifications');
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status === 'granted') return settings;
  return await Notifications.requestPermissionsAsync();
}

export async function scheduleAlarmAtAsync(input: {
  title: string;
  body: string;
  date: Date;
}): Promise<AlarmScheduleResult> {
  requireDevBuild('Scheduling alarms');
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
      ...(Platform.OS === 'android' ? { channelId: 'alarms' } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: input.date,
      ...(Platform.OS === 'android' ? { channelId: 'alarms' } : null),
    },
  });

  return { id };
}

export async function scheduleAlarmInSecondsAsync(input: {
  title: string;
  body: string;
  seconds: number;
}): Promise<AlarmScheduleResult> {
  requireDevBuild('Scheduling alarms');
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
      ...(Platform.OS === 'android' ? { channelId: 'alarms' } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, Math.round(input.seconds)),
      ...(Platform.OS === 'android' ? { channelId: 'alarms' } : null),
    },
  });

  return { id };
}

export async function scheduleDailyMedicineReminderAsync(input: {
  medicineName: string;
  hour: number;
  minute: number;
}): Promise<AlarmScheduleResult> {
  requireDevBuild('Daily medicine reminders');
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
      ...(Platform.OS === 'android' ? { channelId: 'alarms' } : null),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: input.hour,
      minute: input.minute,
      ...(Platform.OS === 'android' ? { channelId: 'alarms' } : null),
    },
  });

  return { id };
}

export async function cancelAllAlarmsAsync() {
  requireDevBuild('Canceling alarms');
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function listScheduledAlarmsAsync() {
  requireDevBuild('Listing alarms');
  return await Notifications.getAllScheduledNotificationsAsync();
}
