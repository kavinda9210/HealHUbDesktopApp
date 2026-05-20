import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';

type Props = {
  onDelete?: () => Promise<void> | void;
};

export default function DeleteAccountCard({ onDelete }: Props) {
  const { language } = useLanguage();
  const { colors } = useTheme();

  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ගිණුම මකා දැමීම';
    if (language === 'tamil') return 'கணக்கை நீக்கு';
    return 'Delete account';
  }, [language]);

  const desc = useMemo(() => {
    if (language === 'sinhala') return 'ඔබගේ ගිණුම සහ සම්බන්ධ සියලු ডেටා ස්ථිරවම මකා දෙනු ලබයි. මෙම ක්‍රියා අවලංගු කළ නොහැක.';
    if (language === 'tamil') return 'உங்கள் खाता மற்றும் அனைத்து தொடர்புடைய தரவு நிரந்தரமாக நீக்கப்படும். இந்த செயலை மீண்டும் செய்ய முடியாது.';
    return 'Your account and all associated data will be permanently deleted. This action cannot be undone.';
  }, [language]);

  const deleteLabel = useMemo(() => {
    if (language === 'sinhala') return 'මකා දමන්න';
    if (language === 'tamil') return 'நீக்கு';
    return 'Delete account';
  }, [language]);

  const cancelLabel = useMemo(() => {
    if (language === 'sinhala') return 'අවලංගු';
    if (language === 'tamil') return 'ரத்து';
    return 'Cancel';
  }, [language]);

  const confirmLabel = useMemo(() => {
    if (language === 'sinhala') return 'තහවුරු කර ස්ථිරවම මකා දමන්න';
    if (language === 'tamil') return 'உறுதிப்படுத்தி நிரந்தரமாக நீக்கவும்';
    return 'Permanently delete my account';
  }, [language]);

  const warningLabel = useMemo(() => {
    if (language === 'sinhala') return 'ඔබ මෙම ක්‍රියාව ස්ථිරවම මකා දෙමින් අදහස් දෙනවාද?';
    if (language === 'tamil') return 'நீங்கள் உங்கள் खाता நிரந்தரமாக நீக்க விரும்புகிறீர்களா?';
    return 'Are you sure you want to permanently delete your account?';
  }, [language]);

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      if (onDelete) {
        const result = onDelete();
        if (result instanceof Promise) {
          await result;
        }
      }
    } catch (error) {
      console.error('Delete account failed:', error);
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <Text style={[styles.title, { color: colors.danger }]}>{title}</Text>
      <Text style={[styles.desc, { color: colors.subtext }]}>{desc}</Text>

      {!confirming ? (
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.danger }]}
          activeOpacity={0.85}
          onPress={() => setConfirming(true)}
          disabled={loading}
        >
          <Text style={[styles.deleteText, { color: colors.danger }]}>{deleteLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={[styles.warningText, { color: colors.danger }]}>{warningLabel}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              activeOpacity={0.85}
              onPress={() => setConfirming(false)}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { color: colors.subtext }]}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.danger }]}
              activeOpacity={0.85}
              onPress={handleConfirmDelete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    marginBottom: 8,
  },
  desc: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 12,
  },
  deleteBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '900',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});
