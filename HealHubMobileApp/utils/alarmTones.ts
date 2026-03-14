import { kvGet, kvSet } from './kvStorage';

export type AlarmToneTarget = 'medicine' | 'clinic';

export type AlarmToneId =
  | 'ringtone_cabinet'
  | 'ringtone_good_morning'
  | 'ringtone_penthouse'
  | 'ringtone_classic'
  | 'ringtone_universe_071'
  | 'ringtone_universe_091';

export type AlarmTone = {
  id: AlarmToneId;
  label: string;
  /** Asset for in-app preview (expo-av). */
  asset: any;
  /** iOS expects filename with extension (must be bundled). */
  iosSound: string;
  /** Android expects raw resource name (no extension). */
  androidSound: string;
};

const STORAGE_KEY_MEDICINE = 'alarm_tone_medicine';
const STORAGE_KEY_CLINIC = 'alarm_tone_clinic';

const TONES: AlarmTone[] = [
  {
    id: 'ringtone_cabinet',
    label: 'Cabinet',
    asset: require('../assets/ringingTone/ringtone_cabinet.mp3'),
    iosSound: 'ringtone_cabinet.mp3',
    androidSound: 'ringtone_cabinet',
  },
  {
    id: 'ringtone_good_morning',
    label: 'Good Morning',
    asset: require('../assets/ringingTone/ringtone_good_morning.mp3'),
    iosSound: 'ringtone_good_morning.mp3',
    androidSound: 'ringtone_good_morning',
  },
  {
    id: 'ringtone_penthouse',
    label: 'Penthouse',
    asset: require('../assets/ringingTone/ringtone_penthouse.mp3'),
    iosSound: 'ringtone_penthouse.mp3',
    androidSound: 'ringtone_penthouse',
  },
  {
    id: 'ringtone_classic',
    label: 'Classic',
    asset: require('../assets/ringingTone/ringtone_classic.mp3'),
    iosSound: 'ringtone_classic.mp3',
    androidSound: 'ringtone_classic',
  },
  {
    id: 'ringtone_universe_071',
    label: 'Universe 071',
    asset: require('../assets/ringingTone/ringtone_universe_071.mp3'),
    iosSound: 'ringtone_universe_071.mp3',
    androidSound: 'ringtone_universe_071',
  },
  {
    id: 'ringtone_universe_091',
    label: 'Universe 091',
    asset: require('../assets/ringingTone/ringtone_universe_091.mp3'),
    iosSound: 'ringtone_universe_091.mp3',
    androidSound: 'ringtone_universe_091',
  },
];

export function listAlarmTones(): AlarmTone[] {
  return TONES.slice();
}

export function getAlarmToneById(id: AlarmToneId): AlarmTone {
  const found = TONES.find((t) => t.id === id);
  if (!found) return TONES[0];
  return found;
}

export function isAlarmToneId(v: unknown): v is AlarmToneId {
  return typeof v === 'string' && (TONES as any[]).some((t) => t.id === v);
}

function defaultToneIdFor(target: AlarmToneTarget): AlarmToneId {
  // Keep defaults stable.
  return target === 'clinic' ? 'ringtone_classic' : 'ringtone_cabinet';
}

export async function getSelectedAlarmToneId(target: AlarmToneTarget): Promise<AlarmToneId> {
  const key = target === 'clinic' ? STORAGE_KEY_CLINIC : STORAGE_KEY_MEDICINE;
  const raw = await kvGet(key);
  if (raw && isAlarmToneId(raw)) return raw;
  return defaultToneIdFor(target);
}

export async function setSelectedAlarmToneId(target: AlarmToneTarget, id: AlarmToneId): Promise<void> {
  const key = target === 'clinic' ? STORAGE_KEY_CLINIC : STORAGE_KEY_MEDICINE;
  await kvSet(key, id);
}

export type AlarmSoundConfig = {
  iosSound: string;
  androidSound: string;
};

export function getAlarmSoundConfig(id: AlarmToneId): AlarmSoundConfig {
  const tone = getAlarmToneById(id);
  return {
    iosSound: tone.iosSound,
    androidSound: tone.androidSound,
  };
}
