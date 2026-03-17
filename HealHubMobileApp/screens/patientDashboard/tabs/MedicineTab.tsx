import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
  return (
    <ScrollView ref={medicineScrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {!!takeMedicineCard && (
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'sinhala' ? 'ඖෂධ ගන්න' : language === 'tamil' ? 'மருந்தை எடுத்துக்கொள்' : 'Take medicine'}</Text>
          <Text style={[styles.cardText, { color: colors.subtext }]}>
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
            style={[styles.primaryAction, { backgroundColor: colors.primary }]}
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
          >
            <Text style={styles.primaryActionText}>{language === 'sinhala' ? 'ගත්තා' : language === 'tamil' ? 'எடுத்தேன்' : 'Taken'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'sinhala' ? 'මඟහැරුණු ඖෂධ' : language === 'tamil' ? 'தவறிய மருந்துகள்' : 'Missed medicines'}</Text>

        {(() => {
          const _tick = medicineClockTick;
          const now = new Date(Date.now() + _tick * 0);
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          const graceMinutes = 2;
          const missed = todayMedicineReminders.filter((m) => {
            const tp = parseTimeParts(m.time);
            if (!tp) return false;
            const mins = tp.hour * 60 + tp.minute;
            return mins < nowMinutes - graceMinutes;
          });

          if (missed.length === 0) {
            return (
              <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                {language === 'sinhala' ? 'මඟහැරුණු ඖෂධ නැත.' : language === 'tamil' ? 'தவறிய மருந்துகள் இல்லை.' : 'No missed medicines.'}
              </Text>
            );
          }

          return (
            <>
              {missed.map((m) => {
                const alarmKey = computeMedicineAlarmKey({ reminderId: m.id, date: m.date, time: m.time });
                return (
                  <View key={m.id} style={[styles.itemRow, { borderTopColor: colors.border }]}>
                    <TouchableOpacity
                      activeOpacity={0.8}
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
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
                      <Text style={[styles.itemSub, { color: colors.subtext }]}>{[m.dosage, m.description].filter(Boolean).join(' • ')}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.itemRight, { color: colors.danger }]}>{m.time}</Text>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => void onMarkReminderTaken({ reminderId: Number(m.id), alarmKey })}
                      style={[styles.smallPill, { borderColor: colors.primary }]}
                    >
                      <Text style={[styles.smallPillText, { color: colors.primary }]}>{language === 'sinhala' ? 'ගත්තා' : language === 'tamil' ? 'எடுத்தேன்' : 'Taken'}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </>
          );
        })()}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'sinhala' ? 'අද ඖෂධ (ඉදිරියට)' : language === 'tamil' ? 'இன்றைய மருந்துகள் (வரவிருக்கும்)' : 'Today medicines (upcoming)'}</Text>

        {(() => {
          const _tick = medicineClockTick;
          const now = new Date(Date.now() + _tick * 0);
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          const graceMinutes = 2;
          const upcoming = todayMedicineReminders
            .filter((m) => {
              const tp = parseTimeParts(m.time);
              if (!tp) return true;
              const mins = tp.hour * 60 + tp.minute;
              return mins >= nowMinutes - graceMinutes;
            })
            .sort((a, b) => String(a.time).localeCompare(String(b.time)));

          if (upcoming.length === 0) {
            return (
              <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
                {language === 'sinhala'
                  ? 'අද සඳහා ඉදිරි ඖෂධ නැත.'
                  : language === 'tamil'
                    ? 'இன்றைக்கு வரவிருக்கும் மருந்துகள் இல்லை.'
                    : 'No upcoming medicines for today.'}
              </Text>
            );
          }

          return (
            <>
              {upcoming.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.8}
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
                  style={[styles.itemRow, { borderTopColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
                    <Text style={[styles.itemSub, { color: colors.subtext }]}>{[m.dosage, m.description].filter(Boolean).join(' • ')}</Text>
                  </View>
                  <Text style={[styles.itemRight, { color: colors.primary }]}>{m.time}</Text>
                </TouchableOpacity>
              ))}
            </>
          );
        })()}
      </View>

      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'sinhala' ? 'ඉදිරි ඖෂධ' : language === 'tamil' ? 'வரவிருக்கும் மருந்துகள்' : 'Future medicines'}</Text>

        {futureMedicineReminders.map((m) => (
          <TouchableOpacity
            key={m.id}
            activeOpacity={0.8}
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
            style={[styles.itemRow, { borderTopColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{m.name}</Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]}>{[m.dosage, m.description].filter(Boolean).join(' • ')}</Text>
            </View>
            <Text style={[styles.itemRight, { color: colors.primary }]}>{m.when}</Text>
          </TouchableOpacity>
        ))}

        {futureMedicineReminders.length === 0 && (
          <Text style={[styles.cardText, { color: colors.subtext, marginTop: 8 }]}>
            {language === 'sinhala'
              ? 'ඉදිරි ඖෂධ මතක් කිරීම් නැත.'
              : language === 'tamil'
                ? 'வரவிருக்கும் மருந்து நினைவூட்டல்கள் இல்லை.'
                : 'No future medicine reminders.'}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
