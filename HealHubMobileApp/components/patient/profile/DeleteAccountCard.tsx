import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';

type Props = {
  onDelete?: () => void;
};

export default function DeleteAccountCard({ onDelete }: Props) {
  const { language } = useLanguage();
  const { colors } = useTheme();

  const [confirming, setConfirming] = useState(false);

  const title = useMemo(() => {
    if (language === 'sinhala') return 'ගිණුම මකා දැමීම';
    if (language === 'tamil') return 'கணக்கை நீக்கு';
    return 'Delete account';
  }, [language]);

  const desc = useMemo(() => {
    if (language === 'sinhala') return 'මෙය UI පමණි. සත්‍යව ගිණුම මකා දැමීම පසුව API හරහා සිදු කරමු.';
    if (language === 'tamil') return 'இது UI மட்டும். உண்மையான கணக்கு நீக்கத்தை பின்னர் API மூலம் செய்யலாம்.';
    return 'UI only. Real account deletion can be handled via API later.';
  }, [language]);

  const deleteLabel = useMemo(() => {
    if (language === 'sinhala') return 'මකා දමන්න';
    if (language === 'tamil') return 'நீக்கு';
    return 'Delete';
  }, [language]);

  const cancelLabel = useMemo(() => {
    if (language === 'sinhala') return 'අවලංගු';
    if (language === 'tamil') return 'ரத்து';
    return 'Cancel';
  }, [language]);

  const confirmLabel = useMemo(() => {
    if (language === 'sinhala') return 'තහවුරු කර මකා දමන්න';
    if (language === 'tamil') return 'உறுதி செய்து நீக்கு';
    return 'Confirm delete';
  }, [language]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <Text style={[styles.title, { color: colors.danger }]}>{title}</Text>
      <Text style={[styles.desc, { color: colors.subtext }]}>{desc}</Text>

      {!confirming ? (
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: colors.danger }]}
          activeOpacity={0.85}
          onPress={() => setConfirming(true)}
        >
          <Text style={[styles.deleteText, { color: colors.danger }]}>{deleteLabel}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            activeOpacity={0.85}
            onPress={() => setConfirming(false)}
          >
            <Text style={[styles.cancelText, { color: colors.subtext }]}>{cancelLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.danger }]}
            activeOpacity={0.85}
            onPress={onDelete}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>
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
