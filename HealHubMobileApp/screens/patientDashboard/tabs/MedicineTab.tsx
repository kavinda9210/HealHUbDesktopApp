import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles';

type TakeMedicineCard = {
  reminderId: number;
  medicineName?: string;
  dosage?: string;
  reminderDate?: string;
  reminderTime?: string;
  alarmKey?: string;
};

type TodayMedicineReminder = {
  id: string;
  name: string;
  date: string;
  time: string;
  dosage: string;
  description: string;
  doctor: string;
};

type FutureMedicineReminder = {
  id: string;
  name: string;
  date: string;
  time: string;
  when: string;
  dosage: string;
  description: string;
  doctor: string;
};

export type MedicineTabProps = {
  language: string;
  colors: any;
  medicineScrollRef: React.RefObject<any>;
  takeMedicineCard: TakeMedicineCard | null;
  onClearTakeMedicineCard: () => void;
  onMarkReminderTaken: (input: { reminderId: number; alarmKey?: string }) => Promise<boolean>;
  todayMedicineReminders: TodayMedicineReminder[];
  futureMedicineReminders: FutureMedicineReminder[];
  medicineClockTick: number;
  parseTimeParts: (timeText: string) => null | { hour: number; minute: number };
  computeMedicineAlarmKey: (input: { reminderId: number | string; date: string; time: string }) => string;
  onShowMedicineDetails: (details: { name: string; date: string; time: string; dosage?: string; description?: string; doctor?: string }) => void;
};

export default function MedicineTab({
  language,
  colors,
  medicineScrollRef,
  takeMedicineCard,
  onClearTakeMedicineCard,
  onMarkReminderTaken,
  todayMedicineReminders,
  futureMedicineReminders,
  medicineClockTick,
  parseTimeParts,
  computeMedicineAlarmKey,
  onShowMedicineDetails,
}: MedicineTabProps) {
  // Helper for consistent card styling
  const cardElevation = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.mode === 'dark' ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 3,
  };

  // Helper to get the current time in minutes
  const getNowMinutes = () => {
    const now = new Date(Date.now() + medicineClockTick * 0);
    return now.getHours() * 60 + now.getMinutes();
  };

  const nowMinutes = getNowMinutes();
  const graceMinutes = 2;

  // Filter missed medicines (time already passed)
  const missedMedicines = todayMedicineReminders.filter((m) => {
    const tp = parseTimeParts(m.time);
    if (!tp) return false;
    const mins = tp.hour * 60 + tp.minute;
    return mins < nowMinutes - graceMinutes;
  });

  // Filter upcoming medicines for today (time not yet passed)
  const upcomingMedicines = todayMedicineReminders
    .filter((m) => {
      const tp = parseTimeParts(m.time);
      if (!tp) return true;
      const mins = tp.hour * 60 + tp.minute;
      return mins >= nowMinutes - graceMinutes;
    })
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));

  return (
    <ScrollView
      ref={medicineScrollRef}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}
    >
      {/* Take Medicine Card (active reminder) */}
      {!!takeMedicineCard && (
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 20,
            marginBottom: 24,
            ...cardElevation,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="medkit-outline" size={26} color={colors.primary} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
              {language === 'sinhala' ? 'ඖෂධ ගන්න' : language === 'tamil' ? 'மருந்தை எடுத்துக்கொள்' : 'Take medicine'}
            </Text>
          </View>

          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 8 }}>
            {[
              takeMedicineCard.medicineName ? String(takeMedicineCard.medicineName) : '',
              takeMedicineCard.dosage ? String(takeMedicineCard.dosage) : '',
              takeMedicineCard.reminderDate && takeMedicineCard.reminderTime
                ? `${String(takeMedicineCard.reminderDate)} ${String(takeMedicineCard.reminderTime).slice(0, 5)}`
                : takeMedicineCard.reminderTime
                  ? String(takeMedicineCard.reminderTime).slice(0, 5)
                  : '',
            ]
              .filter(Boolean)
              .join(' • ') ||
              (language === 'sinhala'
                ? 'ඖෂධ විස්තර ලබාගැනෙමින්...'
                : language === 'tamil'
                  ? 'மருந்து விவரங்கள் ஏற்றப்படுகிறது...'
                  : 'Loading medicine details...')}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              void (async () => {
                const ok = await onMarkReminderTaken({
                  reminderId: Number(takeMedicineCard.reminderId),
                  alarmKey: takeMedicineCard.alarmKey ? String(takeMedicineCard.alarmKey) : undefined,
                });
                if (!ok) return;
                onClearTakeMedicineCard();
              })();
            }}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 40,
              paddingVertical: 14,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              marginTop: 12,
              ...cardElevation,
            }}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {language === 'sinhala' ? 'ගත්තා' : language === 'tamil' ? 'எடுத்தேன்' : 'Taken'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Missed Medicines Section */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          marginBottom: 24,
          ...cardElevation,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="alert-circle" size={24} color="#e74c3c" style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {language === 'sinhala' ? 'මඟහැරුණු ඖෂධ' : language === 'tamil' ? 'தவறிய மருந்துகள்' : 'Missed medicines'}
          </Text>
        </View>

        {missedMedicines.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
            <Ionicons name="checkmark-done-circle" size={48} color={colors.subtext} />
            <Text style={{ color: colors.subtext, fontSize: 16, textAlign: 'center' }}>
              {language === 'sinhala' ? 'මඟහැරුණු ඖෂධ නැත.' : language === 'tamil' ? 'தவறிய மருந்துகள் இல்லை.' : 'No missed medicines.'}
            </Text>
          </View>
        ) : (
          missedMedicines.map((m) => {
            const alarmKey = computeMedicineAlarmKey({ reminderId: m.id, date: m.date, time: m.time });
            return (
              <View
                key={m.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  gap: 12,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={{ flex: 1 }}
                  onPress={() => {
                    onShowMedicineDetails({
                      name: m.name,
                      date: m.date,
                      time: m.time,
                      dosage: m.dosage,
                      description: m.description,
                      doctor: m.doctor,
                    });
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{m.name}</Text>
                  <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 2 }}>
                    {[m.dosage, m.description].filter(Boolean).join(' • ')}
                  </Text>
                </TouchableOpacity>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: colors.danger || '#e74c3c' }}>
                    {m.time}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => void onMarkReminderTaken({ reminderId: Number(m.id), alarmKey })}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 40,
                      borderWidth: 1,
                      borderColor: colors.primary,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>
                      {language === 'sinhala' ? 'ගත්තා' : language === 'tamil' ? 'எடுத்தேன்' : 'Taken'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Today's Upcoming Medicines Section */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          marginBottom: 24,
          ...cardElevation,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="today-outline" size={24} color={colors.primary} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {language === 'sinhala' ? 'අද ඖෂධ (ඉදිරියට)' : language === 'tamil' ? 'இன்றைய மருந்துகள் (வரவிருக்கும்)' : 'Today medicines (upcoming)'}
          </Text>
        </View>

        {upcomingMedicines.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
            <Ionicons name="calendar-clear-outline" size={48} color={colors.subtext} />
            <Text style={{ color: colors.subtext, fontSize: 16, textAlign: 'center' }}>
              {language === 'sinhala'
                ? 'අද සඳහා ඉදිරි ඖෂධ නැත.'
                : language === 'tamil'
                  ? 'இன்றைக்கு வரவிருக்கும் மருந்துகள் இல்லை.'
                  : 'No upcoming medicines for today.'}
            </Text>
          </View>
        ) : (
          upcomingMedicines.map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.7}
              onPress={() => {
                onShowMedicineDetails({
                  name: m.name,
                  date: m.date,
                  time: m.time,
                  dosage: m.dosage,
                  description: m.description,
                  doctor: m.doctor,
                });
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{m.name}</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 2 }}>
                  {[m.dosage, m.description].filter(Boolean).join(' • ')}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: colors.primary + '20',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 40,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>{m.time}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Future Medicines Section */}
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 28,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 20,
          ...cardElevation,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text }}>
            {language === 'sinhala' ? 'ඉදිරි ඖෂධ' : language === 'tamil' ? 'வரவிருக்கும் மருந்துகள்' : 'Future medicines'}
          </Text>
        </View>

        {futureMedicineReminders.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
            <Ionicons name="bed-outline" size={48} color={colors.subtext} />
            <Text style={{ color: colors.subtext, fontSize: 16, textAlign: 'center' }}>
              {language === 'sinhala'
                ? 'ඉදිරි ඖෂධ මතක් කිරීම් නැත.'
                : language === 'tamil'
                  ? 'வரவிருக்கும் மருந்து நினைவூட்டல்கள் இல்லை.'
                  : 'No future medicine reminders.'}
            </Text>
          </View>
        ) : (
          futureMedicineReminders.map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.7}
              onPress={() => {
                onShowMedicineDetails({
                  name: m.name,
                  date: m.date,
                  time: m.time,
                  dosage: m.dosage,
                  description: m.description,
                  doctor: m.doctor,
                });
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{m.name}</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 2 }}>
                  {[m.dosage, m.description].filter(Boolean).join(' • ')}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: colors.primary + '10',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 40,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: colors.primary }}>{m.when}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}