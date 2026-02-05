import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PatientTabs, { PatientTabKey } from '../components/patient/tabs';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import AlertMessage from '../components/alerts/AlertMessage';
import { scheduleAlarmAtAsync } from '../utils/alarms';

import ProfileViewCard, { PatientUser } from '../components/patient/profile/ProfileViewCard';
import ProfileEditCard from '../components/patient/profile/ProfileEditCard';
import EmailChangeVerificationCard from '../components/patient/profile/EmailChangeVerificationCard';
import DeleteAccountCard from '../components/patient/profile/DeleteAccountCard';
import LanguagePickerInline from '../components/settings/LanguagePickerInline';
import ThemeToggleCard from '../components/settings/ThemeToggleCard';

type PatientdashboardProps = {
  onOpenAiDetect?: () => void;
  onOpenNotifications?: () => void;
  onOpenNearbyAmbulance?: () => void;
  onLogout?: () => void;
};

export default function Patientdashboard({ onOpenAiDetect, onOpenNotifications, onOpenNearbyAmbulance, onLogout }: PatientdashboardProps) {
  const { language } = useLanguage();
  const { colors, mode } = useTheme();
  const [activeTab, setActiveTab] = useState<PatientTabKey>('home');

  const reminderToastTimer = useRef<NodeJS.Timeout | null>(null);
  const [reminderToastVisible, setReminderToastVisible] = useState(false);
  const [reminderToastVariant, setReminderToastVariant] = useState<'success' | 'error' | 'info'>('success');
  const [reminderToastMessage, setReminderToastMessage] = useState('');

  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);
  const [appointmentTime, setAppointmentTime] = useState<Date | null>(null);
  const [appointmentReason, setAppointmentReason] = useState<string>('');
  const [appointmentError, setAppointmentError] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [appointments, setAppointments] = useState<
    Array<{ id: string; doctor: string; date: string; time: string; reason: string; status: 'pending' | 'confirmed' }>
  >([]);

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

  const doctorOptions = useMemo(() => {
    return [
      { id: 'd1', name: 'Dr. Jayasinghe', specialty: language === 'sinhala' ? 'සාමාන්‍ය වෛද්‍ය' : language === 'tamil' ? 'பொது மருத்துவர்' : 'General Practice' },
      { id: 'd2', name: 'Dr. Fernando', specialty: language === 'sinhala' ? 'ඩර්මටෝලජි' : language === 'tamil' ? 'டெர்மடாலஜி' : 'Dermatology' },
      { id: 'd3', name: 'Dr. Perera', specialty: language === 'sinhala' ? 'වවුන්ඩ් කෙයාර්' : language === 'tamil' ? 'காய சிகிச்சை' : 'Wound Care' },
    ];
  }, [language]);

  const bookAppointmentLabel = useMemo(() => {
    if (language === 'sinhala') return 'වෙන්කරගන්න';
    if (language === 'tamil') return 'முன்பதிவு';
    return 'Book appointment';
  }, [language]);

  const appointmentsHint = useMemo(() => {
    if (language === 'sinhala') return 'ආකෘතිය: YYYY-MM-DD සහ 10:30 AM';
    if (language === 'tamil') return 'வடிவம்: YYYY-MM-DD மற்றும் 10:30 AM';
    return 'Format: YYYY-MM-DD and 10:30 AM';
  }, [language]);

  const cannotPastErrorText = useMemo(() => {
    if (language === 'sinhala') return 'පසුගිය දිනයකට/වේලාවකට වෙන්කර ගත නොහැක.';
    if (language === 'tamil') return 'கடந்த தேதி/நேரத்திற்கு முன்பதிவு செய்ய முடியாது.';
    return 'Cannot book an appointment in the past.';
  }, [language]);

  const formatDateLabel = (d: Date | null) => {
    if (!d) return language === 'sinhala' ? 'දිනය තෝරන්න' : language === 'tamil' ? 'தேதியை தேர்வு செய்' : 'Select date';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatTimeLabel = (t: Date | null) => {
    if (!t) return language === 'sinhala' ? 'වේලාව තෝරන්න' : language === 'tamil' ? 'நேரத்தை தேர்வு செய்' : 'Select time';
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const buildAppointmentDateTime = (d: Date | null, t: Date | null) => {
    if (!d || !t) return null;
    const dt = new Date(d);
    dt.setHours(t.getHours(), t.getMinutes(), 0, 0);
    return dt;
  };

  const selectedDateTime = useMemo(() => buildAppointmentDateTime(appointmentDate, appointmentTime), [appointmentDate, appointmentTime]);

  const validateNotPast = (dt: Date | null) => {
    if (!dt) return true;
    return dt.getTime() >= Date.now();
  };

  const onDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (!date) return;

    setAppointmentDate(date);
    setAppointmentError('');

    const dt = buildAppointmentDateTime(date, appointmentTime);
    if (dt && !validateNotPast(dt)) setAppointmentError(cannotPastErrorText);
  };

  const onTimeChange = (_event: DateTimePickerEvent, time?: Date) => {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (!time) return;

    setAppointmentTime(time);
    setAppointmentError('');

    const dt = buildAppointmentDateTime(appointmentDate, time);
    if (dt && !validateNotPast(dt)) setAppointmentError(cannotPastErrorText);
  };

  useEffect(() => {
    return () => {
      if (reminderToastTimer.current) clearTimeout(reminderToastTimer.current);
    };
  }, []);

  const showReminderToast = (variant: 'success' | 'error' | 'info', message: string) => {
    if (reminderToastTimer.current) {
      clearTimeout(reminderToastTimer.current);
      reminderToastTimer.current = null;
    }

    setReminderToastVariant(variant);
    setReminderToastMessage(message);
    setReminderToastVisible(true);

    reminderToastTimer.current = setTimeout(() => {
      setReminderToastVisible(false);
    }, 2500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />

      <AlertMessage
        visible={reminderToastVisible}
        mode="toast"
        variant={reminderToastVariant}
        message={reminderToastMessage}
        onClose={() => setReminderToastVisible(false)}
      />

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
            <View
              style={[
                styles.emergencyCard,
                {
                  backgroundColor: mode === 'dark' ? '#2b1d1f' : '#fee2e2',
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.emergencyTitle, { color: colors.text }]}>
                  {language === 'sinhala'
                    ? 'ආසන්න ඇම්බියුලන්ස්'
                    : language === 'tamil'
                      ? 'அருகிலுள்ள ஆம்புலன்ஸ்'
                      : 'Nearby Ambulance'}
                </Text>
                <Text style={[styles.emergencySub, { color: colors.subtext }]}>
                  {language === 'sinhala'
                    ? 'ස්ථානය සක්‍රීය කර ආසන්න ඇම්බියුලන්ස් සොයන්න'
                    : language === 'tamil'
                      ? 'இடத்தை இயக்கி அருகிலுள்ள ஆம்புலன்ஸ்களை கண்டுபிடிக்கவும்'
                      : 'Turn on location and find ambulances nearby'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.emergencyBtn, { backgroundColor: colors.danger }]}
                activeOpacity={0.85}
                onPress={onOpenNearbyAmbulance}
                disabled={!onOpenNearbyAmbulance}
              >
                <Text style={styles.emergencyBtnText}>
                  {language === 'sinhala' ? 'විවෘත කරන්න' : language === 'tamil' ? 'திற' : 'Open'}
                </Text>
              </TouchableOpacity>
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
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'වෛද්‍යවරයෙක් වෙන්කරගන්න' : language === 'tamil' ? 'மருத்துவரை முன்பதிவு செய்' : 'Book a doctor'}
              </Text>

              <Text style={[styles.itemSub, { color: colors.subtext, marginTop: 0 }]}>{appointmentsHint}</Text>

              <AlertMessage
                visible={appointmentError.length > 0}
                mode="inline"
                variant="error"
                message={appointmentError}
                onClose={() => setAppointmentError('')}
                style={{ marginTop: 12 }}
              />

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
                {language === 'sinhala' ? 'වෛද්‍යවරයා' : language === 'tamil' ? 'மருத்துவர்' : 'Doctor'}
              </Text>
              <View style={styles.pillsWrap}>
                {doctorOptions.map((d) => {
                  const active = selectedDoctor === d.name;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      activeOpacity={0.85}
                      onPress={() => setSelectedDoctor(d.name)}
                      style={[
                        styles.pillChip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? (mode === 'dark' ? '#0b2a22' : '#f0f9ff') : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.pillChipText, { color: active ? colors.primary : colors.subtext }]}>
                        {d.name}
                      </Text>
                      <Text style={[styles.pillChipSub, { color: colors.subtext }]}>{d.specialty}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
                {language === 'sinhala' ? 'දිනය' : language === 'tamil' ? 'தேதி' : 'Date'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setShowDatePicker(true);
                  setAppointmentError('');
                }}
                style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <Text style={[styles.pickerBtnText, { color: appointmentDate ? colors.text : colors.subtext }]}>
                  📅 {formatDateLabel(appointmentDate)}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <View style={{ marginTop: 8 }}>
                  <DateTimePicker
                    value={appointmentDate ?? new Date()}
                    mode="date"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  />
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
                {language === 'sinhala' ? 'වේලාව' : language === 'tamil' ? 'நேரம்' : 'Time'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setShowTimePicker(true);
                  setAppointmentError('');
                }}
                style={[styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              >
                <Text style={[styles.pickerBtnText, { color: appointmentTime ? colors.text : colors.subtext }]}>
                  ⏰ {formatTimeLabel(appointmentTime)}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <View style={{ marginTop: 8 }}>
                  <DateTimePicker
                    value={appointmentTime ?? new Date()}
                    mode="time"
                    onChange={onTimeChange}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  />
                </View>
              )}

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>
                {language === 'sinhala' ? 'හේතුව' : language === 'tamil' ? 'காரணம்' : 'Reason'}
              </Text>
              <TextInput
                value={appointmentReason}
                onChangeText={setAppointmentReason}
                placeholder={language === 'sinhala' ? 'උදා: රෑෂ් පරීක්ෂාව' : language === 'tamil' ? 'உ.தா: ரேஷ் பரிசோதனை' : 'e.g., rash check'}
                placeholderTextColor={colors.subtext}
                style={[styles.input, styles.inputMultiline, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                multiline
              />

              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.primaryAction, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const doctor = selectedDoctor.trim();
                  const dt = selectedDateTime;
                  const reason = appointmentReason.trim();

                  if (!doctor || !dt) return;

                  if (!validateNotPast(dt)) {
                    setAppointmentError(cannotPastErrorText);
                    return;
                  }

                  const id = `${Date.now()}`;
                  setAppointments((prev) => [
                    {
                      id,
                      doctor,
                      date: formatDateLabel(appointmentDate),
                      time: formatTimeLabel(appointmentTime),
                      reason,
                      status: 'pending',
                    },
                    ...prev,
                  ]);

                  void (async () => {
                    try {
                      await scheduleAlarmAtAsync({
                        title: language === 'sinhala' ? 'වෙන්කිරීම් මතක් කිරීම' : language === 'tamil' ? 'நியமன நினைவூட்டல்' : 'Appointment reminder',
                        body: `${doctor} • ${formatDateLabel(appointmentDate)} ${formatTimeLabel(appointmentTime)}`,
                        date: dt,
                      });

                      showReminderToast(
                        'success',
                        language === 'sinhala'
                          ? 'වෙන්කිරීම් ඇලර්ම් එකක් සැකසුම් විය.'
                          : language === 'tamil'
                            ? 'நியமன அலாரம் அமைக்கப்பட்டது.'
                            : 'Appointment alarm scheduled.'
                      );
                    } catch (e) {
                      console.log('scheduleAlarmAtAsync failed:', e);
                      showReminderToast(
                        'error',
                        language === 'sinhala'
                          ? 'ඇලර්ම් එක සැකසීමට අසමත් විය. Notification අවසර පරීක්ෂා කරන්න.'
                          : language === 'tamil'
                            ? 'அலாரம் அமைக்க முடியவில்லை. Notification அனுமதி சரிபார்க்கவும்.'
                            : 'Failed to schedule alarm. Check notification permission.'
                      );
                    }
                  })();

                  setAppointmentReason('');
                  setAppointmentError('');
                }}
              >
                <Text style={styles.primaryActionText}>{bookAppointmentLabel}</Text>
              </TouchableOpacity>

              <Text style={[styles.noteText, { color: colors.subtext }]}>
                {language === 'sinhala'
                  ? 'සටහන: මෙය UI පමණි. පසුව සැබෑ වෙන්කිරීම් (API) එක් කළ හැක.'
                  : language === 'tamil'
                    ? 'குறிப்பு: இது UI மட்டும். பின்னர் உண்மை முன்பதிவு (API) சேர்க்கலாம்.'
                    : 'Note: UI only. We can connect real booking (API) later.'}
              </Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'sinhala' ? 'ඔබගේ වෙන්කිරීම්' : language === 'tamil' ? 'உங்கள் நியமனங்கள்' : 'Your appointments'}
              </Text>

              {appointments.length === 0 ? (
                <Text style={[styles.cardText, { color: colors.subtext }]}>
                  {language === 'sinhala'
                    ? 'තවම වෙන්කිරීම් නැත.'
                    : language === 'tamil'
                      ? 'இன்னும் நியமனங்கள் இல்லை.'
                      : 'No appointments yet.'}
                </Text>
              ) : (
                appointments.map((a) => (
                  <View key={a.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{a.doctor}</Text>
                      <Text style={[styles.itemSub, { color: colors.subtext }]}>
                        {a.date} • {a.time}
                        {a.reason ? ` • ${a.reason}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[styles.smallPill, { borderColor: colors.primary }]}
                      onPress={() => {
                        setAppointments((prev) =>
                          prev.map((x) => (x.id === a.id ? { ...x, status: 'confirmed' } : x)),
                        );
                      }}
                    >
                      <Text style={[styles.smallPillText, { color: colors.primary }]}>
                        {a.status === 'confirmed'
                          ? language === 'sinhala'
                            ? 'තහවුරු' 
                            : language === 'tamil'
                              ? 'உறுதி'
                              : 'Confirmed'
                          : language === 'sinhala'
                            ? 'Pending'
                            : language === 'tamil'
                              ? 'Pending'
                              : 'Pending'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
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
  emergencyCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emergencyTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  emergencySub: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  emergencyBtn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emergencyBtnText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 12,
  },
  fieldLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
  },
  pillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  pillChip: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillChipText: {
    fontSize: 13,
    fontWeight: '900',
  },
  pillChipSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  inputMultiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  primaryAction: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  noteText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  smallPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '900',
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
