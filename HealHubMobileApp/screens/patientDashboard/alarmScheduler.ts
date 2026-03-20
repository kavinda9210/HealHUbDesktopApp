import {
  cancelScheduledAlarmsByKeyAsync,
  CLINIC_ALARM_CATEGORY_ID,
  CLINIC_MISSED_CATEGORY_ID,
  MEDICINE_ALARM_CATEGORY_ID,
  MEDICINE_MISSED_CATEGORY_ID,
  scheduleAlarmAtAsync,
  scheduleAlarmBurstAtAsync,
  scheduleMissedReminderAtAsync,
} from '../../utils/alarms';
import { getAlarmSoundConfig, getSelectedAlarmToneId } from '../../utils/alarmTones';
import { kvGet, kvSet } from '../../utils/kvStorage';
import type { ClinicRow, DoctorRow } from './types';
import { makeLocalDateTime } from './dateTime';

export async function reconcilePatientAlarmScheduleAsync(input: {
  language: string;
  clinics: ClinicRow[];
  upcomingReminders: Array<any>;
  doctorMap: Record<number, DoctorRow>;
}) {
  const STORAGE_KEY = 'patient_alarm_schedule_v2';
  const VIBRATE_ONLY_KEY = 'alarm_vibration_only_v1';
  try {
    const desired: Array<{ key: string; title: string; body: string; date: Date; data?: any }> = [];
    const now = Date.now();

    // If a reminder is added very close to its time (or slightly after),
    // still try to ring instead of skipping scheduling entirely.
    const MIN_SCHEDULE_AHEAD_MS = 2_000;
    const LATE_RING_WINDOW_MS = 5 * 60 * 1000;

    for (const r of input.upcomingReminders) {
      const dt = makeLocalDateTime(String(r.reminder_date || ''), String(r.reminder_time || ''));
      if (!dt) continue;

      const t = dt.getTime();
      // Too old: don't ring hours-late reminders.
      if (t < now - LATE_RING_WINDOW_MS) continue;

      // If it's slightly late or very close, ring ASAP.
      const ringDate = t < now + MIN_SCHEDULE_AHEAD_MS ? new Date(now + MIN_SCHEDULE_AHEAD_MS) : dt;

      const medicineName = String(r.medicine_name || '').trim() || `Medicine #${String(r.medication_id || '')}`;
      const dosage = String(r.dosage || '').trim();
      const when = `${String(r.reminder_date || '')} ${String(r.reminder_time || '').slice(0, 5)}`;
      desired.push({
        key: `med:${String(r.reminder_id || r.medication_id || medicineName)}:${when}`,
        title:
          input.language === 'sinhala'
            ? 'ඖෂධ මතක් කිරීම'
            : input.language === 'tamil'
              ? 'மருந்து நினைவூட்டல்'
              : 'Medicine reminder',
        body: dosage ? `${medicineName} • ${dosage} • ${when}` : `${medicineName} • ${when}`,
        date: ringDate,
        data: {
          reminderId: r.reminder_id,
          medicationId: r.medication_id,
          medicineName,
          dosage,
          reminderDate: r.reminder_date,
          reminderTime: r.reminder_time,
        },
      });
    }

    // Clinics: schedule only Scheduled clinics within 30 days
    const maxClinicTime = now + 30 * 24 * 60 * 60 * 1000;
    for (const c of input.clinics) {
      if (String(c.status || '').toLowerCase() !== 'scheduled') continue;
      const dt = makeLocalDateTime(String(c.clinic_date || ''), String(c.start_time || '09:00'));
      if (!dt) continue;
      const t = dt.getTime();
      if (t > maxClinicTime) continue;
      if (t < now - LATE_RING_WINDOW_MS) continue;

      const ringDate = t < now + MIN_SCHEDULE_AHEAD_MS ? new Date(now + MIN_SCHEDULE_AHEAD_MS) : dt;

      const doc = input.doctorMap[c.doctor_id];
      const doctorName = doc?.full_name ? `Dr. ${doc.full_name}` : `Doctor #${c.doctor_id}`;
      const when = `${String(c.clinic_date || '')} ${String(c.start_time || '').slice(0, 5)}`;
      desired.push({
        key: `clinic:${String(c.clinic_id)}:${when}`,
        title:
          input.language === 'sinhala'
            ? 'ක්ලිනික් මතක් කිරීම'
            : input.language === 'tamil'
              ? 'கிளினிக் நினைவூட்டல்'
              : 'Clinic reminder',
        body: `${doctorName} • ${when}`,
        date: ringDate,
      });
    }

    desired.sort((a, b) => a.date.getTime() - b.date.getTime());
    const limited = desired.slice(0, 50);
    const desiredKeys = new Set(limited.map((d) => d.key));

    const storedRaw = await kvGet(STORAGE_KEY);
    let storedKeys: string[] = [];
    if (storedRaw) {
      try {
        storedKeys = JSON.parse(storedRaw) as string[];
      } catch {
        storedKeys = [];
      }
    }

    const storedSet = new Set(storedKeys);

    const vibrationOnlyRaw = await kvGet(VIBRATE_ONLY_KEY);
    const vibrationOnly = vibrationOnlyRaw === '1' || String(vibrationOnlyRaw || '').toLowerCase() === 'true';

    const medicineSound = vibrationOnly ? undefined : getAlarmSoundConfig(await getSelectedAlarmToneId('medicine'));
    const clinicSound = vibrationOnly ? undefined : getAlarmSoundConfig(await getSelectedAlarmToneId('clinic'));

    // Cancel alarms that are no longer desired
    for (const key of storedKeys) {
      if (desiredKeys.has(key)) continue;
      try {
        await cancelScheduledAlarmsByKeyAsync(key);
      } catch (e) {
        console.log('cancelScheduledAlarmsByKeyAsync failed:', e);
      }
      storedSet.delete(key);
    }

    // Schedule missing
    for (const d of limited) {
      if (storedSet.has(d.key)) continue;
      try {
        const isMedicine = String(d.key).startsWith('med:');

        const isClinic = String(d.key).startsWith('clinic:');
        const sound = isMedicine ? medicineSound : isClinic ? clinicSound : undefined;

        if (isMedicine || isClinic) {
          // Call-like: ring (sound/vibration) 10 times in a row, but keep only ONE visible notification.
          const ringEverySeconds = 6;
          const ringCount = 10;

          const categoryId = isMedicine ? MEDICINE_ALARM_CATEGORY_ID : CLINIC_ALARM_CATEGORY_ID;
          const missedCategoryId = isMedicine ? MEDICINE_MISSED_CATEGORY_ID : CLINIC_MISSED_CATEGORY_ID;

          const baseData = {
            alarmKey: d.key,
            ...(d.data ?? {}),
            type: isMedicine ? 'medicine' : 'clinic',
            vibrateOnly: vibrationOnly,
          };

          await scheduleAlarmBurstAtAsync({
            title: d.title,
            body: d.body,
            date: d.date,
            burstEverySeconds: ringEverySeconds,
            burstCount: ringCount,
            dataBuilder: (index) => ({ ...baseData, hideFromList: index > 0 }),
            ...(sound ? { sound } : {}),
            categoryId,
          });

          // If the user does not respond within the burst window, mark as missed call.
          const missedAt = new Date(d.date.getTime() + ringCount * ringEverySeconds * 1000);
          await scheduleMissedReminderAtAsync({
            title: isMedicine
              ? input.language === 'sinhala'
                ? 'අහිමි වූ ඖෂධ මතක් කිරීම'
                : input.language === 'tamil'
                  ? 'தவறிய மருந்து நினைவூட்டல்'
                  : 'Missed call • Medicine'
              : input.language === 'sinhala'
                ? 'අහිමි වූ ක්ලිනික් මතක් කිරීම'
                : input.language === 'tamil'
                  ? 'தவறிய கிளினிக் நினைவூட்டல்'
                  : 'Missed call • Clinic',
            body: d.body,
            date: missedAt,
            data: { ...baseData, missed: true },
            categoryId: missedCategoryId,
          });
        } else {
          await scheduleAlarmAtAsync({
            title: d.title,
            body: d.body,
            date: d.date,
            data: { alarmKey: d.key, ...(d.data ?? {}) },
          });
        }

        storedSet.add(d.key);
      } catch (e) {
        console.log('scheduleAlarmAtAsync (auto) failed:', e);
      }
    }

    await kvSet(STORAGE_KEY, JSON.stringify(Array.from(storedSet)));
  } catch (e) {
    console.log('reconcilePatientAlarmScheduleAsync failed:', e);
  }
}
