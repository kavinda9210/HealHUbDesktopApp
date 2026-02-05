import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PatientTabs, { PatientTabKey } from '../components/patient/tabs';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

import ProfileViewCard, { PatientUser } from '../components/patient/profile/ProfileViewCard';
import ProfileEditCard from '../components/patient/profile/ProfileEditCard';
import EmailChangeVerificationCard from '../components/patient/profile/EmailChangeVerificationCard';
import DeleteAccountCard from '../components/patient/profile/DeleteAccountCard';
import LanguagePickerInline from '../components/settings/LanguagePickerInline';
import ThemeToggleCard from '../components/settings/ThemeToggleCard';

type PatientdashboardProps = {
  onOpenAiDetect?: () => void;
  onOpenNotifications?: () => void;
  onLogout?: () => void;
};

export default function Patientdashboard({ onOpenAiDetect, onOpenNotifications, onLogout }: PatientdashboardProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState<PatientTabKey>('home');

  const [profileView, setProfileView] = useState<'view' | 'edit' | 'verify-email'>('view');
  const [pendingEmail, setPendingEmail] = useState<string>('');

  const [user, setUser] = useState<PatientUser>({
    fullName: 'A. Patient',
    email: 'patient@email.com',
    phone: '+94 77 123 4567',
    gender: 'Female',
    dateOfBirth: '1998-04-12',
    address: 'Colombo, Sri Lanka',
  });

  const notificationCount = 3; // UI demo: replace with real notifications count later

  const title = useMemo(() => {
    if (language === 'sinhala') return 'රෝගී පුවරුව';
    if (language === 'tamil') return 'நோயாளர் டாஷ்போர்டு';
    return 'Patient Dashboard';
  }, [language]);

  const tabTitle = useMemo(() => {
    if (activeTab === 'home') {
      return language === 'sinhala' ? 'මුල් පිටුව' : language === 'tamil' ? 'முகப்பு' : 'Home';
    }
    if (activeTab === 'appointment') {
      return language === 'sinhala' ? 'වෙන්කිරීම්' : language === 'tamil' ? 'நியமனங்கள்' : 'Appointments';
    }
    return language === 'sinhala' ? 'පැතිකඩ' : language === 'tamil' ? 'சுயவிவரம்' : 'Profile';
  }, [activeTab, language]);

  const homeSections = useMemo(() => {
    const medicines = [
      {
        id: 'm1',
        name: language === 'sinhala' ? 'පැරසිටමෝල්' : language === 'tamil' ? 'பாராசிட்டமோல்' : 'Paracetamol',
        time: '2:00 PM',
        note: language === 'sinhala' ? '1 ටැබ්ලට්' : language === 'tamil' ? '1 மாத்திரை' : '1 tablet',
      },
      {
        id: 'm2',
        name: language === 'sinhala' ? 'විටමින් C' : language === 'tamil' ? 'விட்டமின் C' : 'Vitamin C',
        time: '8:00 PM',
        note: language === 'sinhala' ? '1 ටැබ්ලට්' : language === 'tamil' ? '1 மாத்திரை' : '1 tablet',
      },
    ];

    const clinics = [
      {
        id: 'c1',
        title:
          language === 'sinhala'
            ? 'ඩර්මටෝලජි ක්ලිනික්'
            : language === 'tamil'
              ? 'டர்மடாலஜி கிளினிக்'
              : 'Dermatology Clinic',
        when: 'Mon • 10:30 AM',
        where: language === 'sinhala' ? 'City General Hospital' : language === 'tamil' ? 'City General Hospital' : 'City General Hospital',
      },
      {
        id: 'c2',
        title:
          language === 'sinhala'
            ? 'සාමාන්‍ය වෛද්‍ය පරීක්ෂාව'
            : language === 'tamil'
              ? 'பொது மருத்துவ பரிசோதனை'
              : 'General Checkup',
        when: 'Thu • 4:15 PM',
        where: language === 'sinhala' ? 'HealHub Care Center' : language === 'tamil' ? 'HealHub Care Center' : 'HealHub Care Center',
      },
    ];

    const recentAppointments = [
      {
        id: 'a1',
        doctor: 'Dr. Jayasinghe',
        date: language === 'sinhala' ? 'අද' : language === 'tamil' ? 'இன்று' : 'Today',
        time: '10:30 AM',
        status: language === 'sinhala' ? 'තහවුරු කර ඇත' : language === 'tamil' ? 'உறுதிசெய்யப்பட்டது' : 'Confirmed',
      },
      {
        id: 'a2',
        doctor: 'Dr. Fernando',
        date: language === 'sinhala' ? 'ඊයේ' : language === 'tamil' ? 'நேற்று' : 'Yesterday',
        time: '3:10 PM',
        status: language === 'sinhala' ? 'නිමාවිය' : language === 'tamil' ? 'முடிந்தது' : 'Completed',
      },
    ];

    return { medicines, clinics, recentAppointments };
  }, [language]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <View style={styles.headerTop}>
          <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
          <View style={styles.headerActions}>
            {!!onOpenNotifications && (
              <TouchableOpacity
                onPress={onOpenNotifications}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                style={styles.bellWrap}
              >
                <Text style={[styles.bellIcon, { color: colors.text }]}>🔔</Text>
                {notificationCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
                    <Text style={styles.badgeText}>{notificationCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {!!onLogout && (
              <TouchableOpacity onPress={onLogout} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.logoutText, { color: colors.danger }]}>
                  {language === 'sinhala' ? 'පිටවීම' : language === 'tamil' ? 'வெளியேறு' : 'Logout'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>{tabTitle}</Text>
      </View>

      <View style={styles.content}>
        {activeTab === 'home' ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ඉදිරි ඖෂධ' : language === 'tamil' ? 'வரவிருக்கும் மருந்துகள்' : 'Upcoming medicines'}
              </Text>

              {homeSections.medicines.map((m) => (
                <View key={m.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>{m.note}</Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>{m.time}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ඉදිරි ක්ලිනික්' : language === 'tamil' ? 'வரவிருக்கும் கிளினிக்குகள்' : 'Upcoming clinics'}
              </Text>

              {homeSections.clinics.map((c) => (
                <View key={c.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{c.title}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>
                      {c.when} • {c.where}
                    </Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>
                    {language === 'sinhala' ? 'විස්තර' : language === 'tamil' ? 'விவரம்' : 'Details'}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.aiCard,
                {
                  backgroundColor: mode === 'dark' ? '#123527' : colors.primary,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.aiTitle}>
                  {language === 'sinhala'
                    ? 'AI තුවාල/රෑෂ් හඳුනාගැනීම'
                    : language === 'tamil'
                      ? 'AI காயம்/ரேஷ் கண்டறிதல்'
                      : 'AI Wound / Rash Detector'}
                </Text>
                <Text style={styles.aiSub}>
                  {language === 'sinhala'
                    ? 'ඡායාරූපයක් ගෙන හෝ උඩුගත කර ප්‍රතිඵල බලන්න'
                    : language === 'tamil'
                      ? 'படத்தை எடுத்து/பதிவேற்றி முடிவுகளை பார்க்கவும்'
                      : 'Take/upload a photo and view guidance'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.aiButton, { backgroundColor: colors.background }]}
                activeOpacity={0.85}
                onPress={onOpenAiDetect}
                disabled={!onOpenAiDetect}
              >
                <Text style={[styles.aiButtonText, { color: colors.primary }]}>
                  {language === 'sinhala' ? 'විවෘත කරන්න' : language === 'tamil' ? 'திற' : 'Open'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'මෑත වෙන්කිරීම්' : language === 'tamil' ? 'சமீபத்திய நியமனங்கள்' : 'Recent appointments'}
              </Text>

              {homeSections.recentAppointments.map((a) => (
                <View key={a.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{a.doctor}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>
                      {a.date} • {a.time} • {a.status}
                    </Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>⭐</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : activeTab === 'appointment' ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{tabTitle}</Text>
            <Text style={[styles.cardText, { color: colors.subtext }]}>
              {language === 'sinhala'
                ? 'වෙන්කිරීම් ටැබ් අන්තර්ගතය පසුව එකතු කරමු.'
                : language === 'tamil'
                  ? 'நியமனங்கள் டாப் உள்ளடக்கத்தை பின்னர் சேர்க்கலாம்.'
                  : 'We can add Appointments content next.'}
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {profileView === 'verify-email' ? (
              <EmailChangeVerificationCard
                pendingEmail={pendingEmail}
                onVerified={() => {
                  setUser((u) => ({ ...u, email: pendingEmail }));
                  setPendingEmail('');
                  setProfileView('view');
                }}
                onCancel={() => {
                  setPendingEmail('');
                  setProfileView('edit');
                }}
              />
            ) : profileView === 'edit' ? (
              <ProfileEditCard
                user={user}
                onSave={(next) => {
                  setUser(next);
                  setProfileView('view');
                }}
                onCancel={() => setProfileView('view')}
                onRequestEmailChange={(email) => {
                  setPendingEmail(email);
                  setProfileView('verify-email');
                }}
              />
            ) : (
              <ProfileViewCard user={user} onEdit={() => setProfileView('edit')} />
            )}

            <LanguagePickerInline />
            <ThemeToggleCard />
            <DeleteAccountCard onDelete={onLogout} />
          </ScrollView>
        )}
      </View>

      <PatientTabs activeTab={activeTab} onChange={setActiveTab} />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  bellWrap: {
    position: 'relative',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  bellIcon: {
    fontSize: 20,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    marginTop: -1,
  },
  logoutText: {
    fontWeight: '900',
    fontSize: 14,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scrollContent: {
    paddingBottom: 20,
    gap: 14,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  itemSub: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '600',
  },
  itemRight: {
    fontSize: 12,
    fontWeight: '900',
  },
  aiCard: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  aiSub: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  aiButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  aiButtonText: {
    fontWeight: '900',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
