import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';

export type PatientUser = {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address: string;
};

type Props = {
  user: PatientUser;
  onEdit?: () => void;
};

export default function ProfileViewCard({ user, onEdit }: Props) {
  const { language } = useLanguage();
  const { colors } = useTheme();

  const title = useMemo(() => {
    if (language === 'sinhala') return 'පැතිකඩ විස්තර';
    if (language === 'tamil') return 'சுயவிவர விவரங்கள்';
    return 'Profile details';
  }, [language]);

  const editLabel = useMemo(() => {
    if (language === 'sinhala') return 'සංස්කරණය';
    if (language === 'tamil') return 'திருத்து';
    return 'Edit';
  }, [language]);

  const fields = [
    { k: language === 'sinhala' ? 'නම' : language === 'tamil' ? 'பெயர்' : 'Name', v: user.fullName },
    { k: language === 'sinhala' ? 'ඊමේල්' : language === 'tamil' ? 'மின்னஞ்சல்' : 'Email', v: user.email },
    { k: language === 'sinhala' ? 'දුරකථනය' : language === 'tamil' ? 'தொலைபேசி' : 'Phone', v: user.phone },
    { k: language === 'sinhala' ? 'ලිංගය' : language === 'tamil' ? 'பாலினம்' : 'Gender', v: user.gender },
    { k: language === 'sinhala' ? 'උපන් දිනය' : language === 'tamil' ? 'பிறந்த தேதி' : 'DOB', v: user.dateOfBirth },
    { k: language === 'sinhala' ? 'ලිපිනය' : language === 'tamil' ? 'முகவரி' : 'Address', v: user.address },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {!!onEdit && (
          <TouchableOpacity onPress={onEdit} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.edit, { color: colors.primary }]}>{editLabel}</Text>
          </TouchableOpacity>
        )}
      </View>

      {fields.map((f) => (
        <View key={f.k} style={[styles.row, { borderTopColor: colors.border }]}>
          <Text style={[styles.key, { color: colors.subtext }]}>{f.k}</Text>
          <Text style={[styles.val, { color: colors.text }]}>{f.v}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
  },
  edit: {
    fontSize: 13,
    fontWeight: '900',
  },
  row: {
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  key: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  val: {
    fontSize: 13,
    fontWeight: '700',
  },
});
