import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  type AlarmToneId,
  type AlarmToneTarget,
  getAlarmToneById,
  getSelectedAlarmToneId,
  listAlarmTones,
  setSelectedAlarmToneId,
} from '../../utils/alarmTones';

export default function AlarmToneSettingsCard() {
  const { colors } = useTheme();
  const { language } = useLanguage();

  const [medicineToneId, setMedicineToneId] = useState<AlarmToneId>('ringtone_cabinet');
  const [clinicToneId, setClinicToneId] = useState<AlarmToneId>('ringtone_classic');
  const [expanded, setExpanded] = useState<AlarmToneTarget | null>(null);

  const [playing, setPlaying] = useState<AlarmToneId | null>(null);
  const soundRef = useRef<any>(null);
  const [previewSupported, setPreviewSupported] = useState<boolean>(true);
  const [previewError, setPreviewError] = useState<string>('');

  const tones = useMemo(() => listAlarmTones(), []);

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ඇලාම් රින්ගින් ටෝන් සැකසුම';
    if (language === 'tamil') return 'அலாரம் ரிங்டோன் அமைப்பு';
    return 'Customize alarm ringing tone';
  }, [language]);

  const medicineLabel = useMemo(() => {
    if (language === 'sinhala') return 'ඖෂධ රින්ගින් ටෝන් වෙනස් කරන්න';
    if (language === 'tamil') return 'மருந்து ரிங்டோனை மாற்று';
    return 'Change medicine ringing tone';
  }, [language]);

  const clinicLabel = useMemo(() => {
    if (language === 'sinhala') return 'ක්ලිනික් රින්ගින් ටෝන් වෙනස් කරන්න';
    if (language === 'tamil') return 'கிளினிக் ரிங்டோனை மாற்று';
    return 'Change clinic ringing tone';
  }, [language]);

  const playLabel = useMemo(() => {
    if (language === 'sinhala') return 'සවන් දෙන්න';
    if (language === 'tamil') return 'பிளே';
    return 'Play';
  }, [language]);

  const stopLabel = useMemo(() => {
    if (language === 'sinhala') return 'නවත්වන්න';
    if (language === 'tamil') return 'நிறுத்து';
    return 'Stop';
  }, [language]);

  const selectLabel = useMemo(() => {
    if (language === 'sinhala') return 'තෝරන්න';
    if (language === 'tamil') return 'தேர்வு';
    return 'Select';
  }, [language]);

  const selectedLabel = useMemo(() => {
    if (language === 'sinhala') return 'තෝරා ඇත';
    if (language === 'tamil') return 'தேர்ந்தெடுக்கப்பட்டது';
    return 'Selected';
  }, [language]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const med = await getSelectedAlarmToneId('medicine');
      const cli = await getSelectedAlarmToneId('clinic');
      if (!mounted) return;
      setMedicineToneId(med);
      setClinicToneId(cli);
    })().catch(() => {
      // best-effort
    });

    return () => {
      mounted = false;
    };
  }, []);

  const hasExponentAVNativeModule = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const core = require('expo-modules-core') as {
        requireOptionalNativeModule?: (name: string) => unknown;
      };
      if (typeof core.requireOptionalNativeModule === 'function') {
        return Boolean(core.requireOptionalNativeModule('ExponentAV'));
      }
    } catch {
      // ignore
    }

    // Fallback check
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const rn = require('react-native') as { NativeModules?: Record<string, unknown> };
      return Boolean(rn?.NativeModules?.ExponentAV);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    // If the runtime doesn't include ExponentAV (old Expo Go / stale dev build), disable preview.
    if (!hasExponentAVNativeModule()) {
      setPreviewSupported(false);
      setPreviewError(
        'Tone preview is not available in this runtime (missing ExponentAV). Update Expo Go or install an EAS development build to preview tones.',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      void (async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
          }
        } catch {
          // ignore
        }
      })();
    };
  }, []);

  let expoAvPromise: Promise<any> | null = null;
  const getExpoAvAsync = async () => {
    if (!expoAvPromise) expoAvPromise = import('expo-av');
    return expoAvPromise;
  };

  const stopPreviewAsync = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } finally {
      setPlaying(null);
    }
  };

  const playPreviewAsync = async (toneId: AlarmToneId) => {
    try {
      setPreviewError('');
      if (!previewSupported) return;
      if (playing) await stopPreviewAsync();

      const ExpoAv = await getExpoAvAsync();
      const Audio = ExpoAv?.Audio;
      if (!Audio) {
        setPreviewSupported(false);
        setPreviewError('Preview is not available in this runtime. Use a development build to preview tones.');
        return;
      }

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const tone = getAlarmToneById(toneId);
      const { sound } = await Audio.Sound.createAsync(tone.asset, { shouldPlay: true, volume: 1.0 });
      soundRef.current = sound;
      setPlaying(toneId);

      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          void stopPreviewAsync();
        }
      });
    } catch {
      // If play fails, just ensure state is clean.
      setPreviewSupported(false);
      setPreviewError('Preview failed to start (missing native audio module). Use a development build to preview tones.');
      await stopPreviewAsync();
    }
  };

  const setToneForTargetAsync = async (target: AlarmToneTarget, toneId: AlarmToneId) => {
    await setSelectedAlarmToneId(target, toneId);
    if (target === 'medicine') setMedicineToneId(toneId);
    else setClinicToneId(toneId);
    setExpanded(null);
  };

  const renderToneList = (target: AlarmToneTarget) => {
    const current = target === 'medicine' ? medicineToneId : clinicToneId;

    return (
      <View style={{ marginTop: 12, gap: 10 }}>
        {tones.map((t) => {
          const isSelected = t.id === current;
          const isPlaying = t.id === playing;

          return (
            <View
              key={t.id}
              style={[
                styles.toneRow,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: colors.background === '#ffffff' && isSelected ? '#f0f9ff' : 'transparent',
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.toneName, { color: colors.text }]} numberOfLines={1}>
                  {t.label}
                </Text>
                <Text style={[styles.toneSub, { color: colors.subtext }]} numberOfLines={1}>
                  {target === 'medicine'
                    ? language === 'sinhala'
                      ? 'ඖෂධ මතක් කිරීම සඳහා'
                      : language === 'tamil'
                        ? 'மருந்து நினைவூட்டலுக்கு'
                        : 'For medicine reminders'
                    : language === 'sinhala'
                      ? 'ක්ලිනික් මතක් කිරීම සඳහා'
                      : language === 'tamil'
                        ? 'கிளினிக் நினைவூட்டலுக்கு'
                        : 'For clinic reminders'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => (isPlaying ? void stopPreviewAsync() : void playPreviewAsync(t.id))}
                style={[styles.smallBtn, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? stopLabel : playLabel}
              >
                <Text style={[styles.smallBtnText, { color: colors.subtext }]}>{isPlaying ? stopLabel : playLabel}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSelected}
                onPress={() => void setToneForTargetAsync(target, t.id)}
                style={[styles.smallBtn, { borderColor: isSelected ? colors.primary : colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={isSelected ? selectedLabel : selectLabel}
              >
                <Text style={[styles.smallBtnText, { color: isSelected ? colors.primary : colors.subtext }]}>
                  {isSelected ? selectedLabel : selectLabel}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const currentMedicineLabel = getAlarmToneById(medicineToneId).label;
  const currentClinicLabel = getAlarmToneById(clinicToneId).label;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpanded((v) => (v === 'medicine' ? null : 'medicine'))}
        style={[styles.selectorRow, { borderColor: colors.border }]}
        accessibilityRole="button"
        accessibilityLabel={medicineLabel}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.selectorTitle, { color: colors.text }]}>{medicineLabel}</Text>
          <Text style={[styles.selectorValue, { color: colors.subtext }]}>{currentMedicineLabel}</Text>
        </View>
        <Text style={[styles.chev, { color: colors.subtext }]}>{expanded === 'medicine' ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {expanded === 'medicine' && renderToneList('medicine')}

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setExpanded((v) => (v === 'clinic' ? null : 'clinic'))}
        style={[styles.selectorRow, { borderColor: colors.border, marginTop: 12 }]}
        accessibilityRole="button"
        accessibilityLabel={clinicLabel}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.selectorTitle, { color: colors.text }]}>{clinicLabel}</Text>
          <Text style={[styles.selectorValue, { color: colors.subtext }]}>{currentClinicLabel}</Text>
        </View>
        <Text style={[styles.chev, { color: colors.subtext }]}>{expanded === 'clinic' ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {expanded === 'clinic' && renderToneList('clinic')}

      {!!previewError && (
        <Text style={[styles.note, { color: colors.subtext, marginTop: 10 }]}>{previewError}</Text>
      )}

      <Text style={[styles.note, { color: colors.subtext }]}>
        {language === 'sinhala'
          ? 'රින්ගින් ටෝන් තෝරලා ඉවර වුණාම, එය ඖෂධ/ක්ලිනික් මතක් කිරීම් සඳහා භාවිතා වේ.'
          : language === 'tamil'
            ? 'ரிங்டோன் தேர்ந்த பிறகு, அது மருந்து/கிளினிக் நினைவூட்டல்களுக்கு பயன்படுத்தப்படும்.'
            : 'Your selected tone is used for medicine/clinic reminders.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12,
  },
  selectorRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  selectorValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  chev: {
    fontSize: 16,
    fontWeight: '900',
  },
  toneRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toneName: {
    fontSize: 13,
    fontWeight: '900',
  },
  toneSub: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
  },
  smallBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallBtnText: {
    fontSize: 12,
    fontWeight: '900',
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
});
