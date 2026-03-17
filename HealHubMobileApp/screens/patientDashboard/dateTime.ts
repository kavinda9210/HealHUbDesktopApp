export function getLocalYyyyMmDd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function parseTimeParts(timeText: string): null | { hour: number; minute: number } {
  const raw = String(timeText || '').trim();
  const text = raw.includes(':') ? raw : '';
  const parts = text.slice(0, 5).split(':');
  if (parts.length !== 2) return null;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23) return null;
  if (minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function makeLocalDateTime(dateText: string, timeText: string): Date | null {
  const dateStr = String(dateText || '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return null;

  const yyyy = Number(m[1]);
  const mon = Number(m[2]);
  const dd = Number(m[3]);
  if (!Number.isFinite(yyyy) || !Number.isFinite(mon) || !Number.isFinite(dd)) return null;

  const tp = parseTimeParts(timeText) ?? { hour: 0, minute: 0 };
  const dt = new Date(yyyy, mon - 1, dd, tp.hour, tp.minute, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export function computeMedicineAlarmKey(input: { reminderId: number | string; date: string; time: string }) {
  const rid = String(input.reminderId || '').trim();
  const dateText = String(input.date || '').trim();
  const timeText = String(input.time || '').trim().slice(0, 5);
  if (!rid || !dateText || !timeText) return '';
  return `med:${rid}:${dateText} ${timeText}`;
}
