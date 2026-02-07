import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import NotificationList, { NotificationItem } from '../components/notifications/NotificationList';
import { useTheme } from '../context/ThemeContext';
import { apiGet } from '../utils/api';

type PatientNotification = {
  notification_id: number;
  title: string;
  message: string;
  type: string;
  is_read?: boolean;
  created_at?: string;
};

type NotificationsProps = {
  accessToken?: string;
  onBack?: () => void;
};

export default function Notifications({ accessToken, onBack }: NotificationsProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();

  const title = useMemo(() => {
    if (language === 'sinhala') return 'දැනුම්දීම්';
    if (language === 'tamil') return 'அறிவிப்புகள்';
    return 'Notifications';
  }, [language]);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadError, setLoadError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      if (!accessToken) return;
      setLoadError('');

      const res = await apiGet<any>('/api/patient/notifications?limit=100', accessToken);
      if (cancelled) return;

      if (!res.ok || !res.data?.success) {
        const msg = (res.data && (res.data.message || res.data.error)) || 'Failed to load notifications';
        setLoadError(String(msg));
        return;
      }

      const rows: PatientNotification[] = Array.isArray(res.data?.data) ? res.data.data : [];
      const mapped: NotificationItem[] = rows.map((n) => {
        const created = String(n.created_at ?? '');
        const timeLabel = created ? created.replace('T', ' ').slice(0, 16) : '';
        return {
          id: String(n.notification_id),
          title: String(n.title ?? ''),
          message: String(n.message ?? ''),
          time: timeLabel,
          read: Boolean(n.is_read),
        };
      });

      setNotifications(mapped);
    }

    loadNotifications();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
          {!!onBack && (
            <TouchableOpacity onPress={onBack} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.backText, { color: colors.primary }]}>
                {language === 'sinhala' ? 'ආපසු' : language === 'tamil' ? 'பின்செல்' : 'Back'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {language === 'sinhala'
            ? `${unreadCount} නොකියවූ`
            : language === 'tamil'
              ? `${unreadCount} படிக்காதவை`
              : `${unreadCount} unread`}
        </Text>
      </View>

      <ScrollView
        style={[styles.content, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {!!loadError && (
          <Text style={[styles.subtitle, { color: colors.danger, marginTop: 0, marginBottom: 12 }]}>{loadError}</Text>
        )}
        <NotificationList
          notifications={notifications}
          onPressItem={(id) => {
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
          }}
          onClearAll={() => setNotifications([])}
          emptyText={language === 'sinhala' ? 'දැනුම්දීම් නැත' : language === 'tamil' ? 'அறிவிப்புகள் இல்லை' : 'No notifications'}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  backText: {
    fontWeight: '800',
    fontSize: 14,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
