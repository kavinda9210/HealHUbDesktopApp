import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import NotificationList, { NotificationItem } from '../components/notifications/NotificationList';
import { useTheme } from '../context/ThemeContext';

type NotificationsProps = {
  onBack?: () => void;
};

export default function Notifications({ onBack }: NotificationsProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();

  const title = useMemo(() => {
    if (language === 'sinhala') return 'දැනුම්දීම්';
    if (language === 'tamil') return 'அறிவிப்புகள்';
    return 'Notifications';
  }, [language]);

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    // UI demo: “get all notifications” (replace with API later)
    return [
      {
        id: 'n1',
        title: language === 'sinhala' ? 'ඖෂධ මතක් කිරීම' : language === 'tamil' ? 'மருந்து நினைவூட்டல்' : 'Medicine reminder',
        message:
          language === 'sinhala'
            ? 'පැරසිටමෝල් ලබා ගැනීමට 2:00 PM'
            : language === 'tamil'
              ? 'பாராசிட்டமோல் 2:00 PM'
              : 'Paracetamol due at 2:00 PM',
        time: language === 'sinhala' ? 'මිනිත්තු 10කට පෙර' : language === 'tamil' ? '10 நிமிடம் முன்' : '10 min ago',
        read: false,
      },
      {
        id: 'n2',
        title: language === 'sinhala' ? 'වෙන්කිරීම තහවුරු විය' : language === 'tamil' ? 'நியமனம் உறுதியாகியது' : 'Appointment confirmed',
        message:
          language === 'sinhala'
            ? 'Dr. Jayasinghe සමඟ අද 10:30 AM'
            : language === 'tamil'
              ? 'Dr. Jayasinghe இன்று 10:30 AM'
              : 'With Dr. Jayasinghe at 10:30 AM',
        time: language === 'sinhala' ? 'පැය 2කට පෙර' : language === 'tamil' ? '2 மணி முன்' : '2 hours ago',
        read: true,
      },
      {
        id: 'n3',
        title: language === 'sinhala' ? 'AI පරීක්ෂාව' : language === 'tamil' ? 'AI பரிசோதனை' : 'AI check',
        message:
          language === 'sinhala'
            ? 'රෑෂ්/තුවාල පරීක්ෂාව සඳහා පැහැදිලි ඡායාරූපයක් ලබාගන්න.'
            : language === 'tamil'
              ? 'ரேஷ்/காயம் பரிசோதனைக்கு தெளிவான படம் எடுக்கவும்.'
              : 'For rash/wound checks, take a clear photo.',
        time: language === 'sinhala' ? 'ඊයේ' : language === 'tamil' ? 'நேற்று' : 'Yesterday',
        read: false,
      },
    ];
  });

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
