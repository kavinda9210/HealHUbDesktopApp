import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useLanguage } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import type { PatientUser } from './ProfileViewCard';

type Props = {
  user: PatientUser;
  onSave: (next: PatientUser) => void;
  onCancel?: () => void;
  onRequestEmailChange?: (newEmail: string) => void;
};

export default function ProfileEditCard({ user, onSave, onCancel, onRequestEmailChange }: Props) {
  const { language } = useLanguage();
  const { colors } = useTheme();

  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [gender, setGender] = useState(user.gender);
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth);
  const [address, setAddress] = useState(user.address);

  // Email is not editable here per requirement.
  const [newEmail, setNewEmail] = useState('');

  const title = useMemo(() => {
    if (language === 'sinhala') return 'පැතිකඩ සංස්කරණය';
    if (language === 'tamil') return 'சுயவிவரத்தை திருத்து';
    return 'Edit profile';
  }, [language]);

  const saveLabel = useMemo(() => {
    if (language === 'sinhala') return 'සුරකින්න';
    if (language === 'tamil') return 'சேமி';
    return 'Save';
  }, [language]);

  const cancelLabel = useMemo(() => {
    if (language === 'sinhala') return 'අවලංගු';
    if (language === 'tamil') return 'ரத்து';
    return 'Cancel';
  }, [language]);

  const changeEmailLabel = useMemo(() => {
    if (language === 'sinhala') return 'ඊමේල් වෙනස් කරන්න (සත්‍යාපනය අවශ්‍යයි)';
    if (language === 'tamil') return 'மின்னஞ்சலை மாற்று (சரிபார்ப்பு தேவை)';
    return 'Change email (verification required)';
  }, [language]);

  const sendCodeLabel = useMemo(() => {
    if (language === 'sinhala') return 'කේතය යවන්න';
    if (language === 'tamil') return 'குறியீட்டை அனுப்பு';
    return 'Send code';
  }, [language]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      <Text style={[styles.label, { color: colors.subtext }]}>Email</Text>
      <View style={[styles.readonlyBox, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <Text style={[styles.readonlyText, { color: colors.text }]}>{user.email}</Text>
      </View>

      <Text style={[styles.label, { color: colors.subtext }]}>
        {language === 'sinhala' ? 'නම' : language === 'tamil' ? 'பெயர்' : 'Name'}
      </Text>
      <TextInput
        value={fullName}
        onChangeText={setFullName}
        placeholder={language === 'sinhala' ? 'නම' : language === 'tamil' ? 'பெயர்' : 'Name'}
        placeholderTextColor={colors.subtext}
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
      />

      <Text style={[styles.label, { color: colors.subtext }]}>
        {language === 'sinhala' ? 'දුරකථනය' : language === 'tamil' ? 'தொலைபேசி' : 'Phone'}
      </Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder={language === 'sinhala' ? 'දුරකථනය' : language === 'tamil' ? 'தொலைபேசி' : 'Phone'}
        placeholderTextColor={colors.subtext}
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
      />

      <Text style={[styles.label, { color: colors.subtext }]}>
        {language === 'sinhala' ? 'ලිංගය' : language === 'tamil' ? 'பாலினம்' : 'Gender'}
      </Text>
      <TextInput
        value={gender}
        onChangeText={setGender}
        placeholder={language === 'sinhala' ? 'ලිංගය' : language === 'tamil' ? 'பாலினம்' : 'Gender'}
        placeholderTextColor={colors.subtext}
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
      />

      <Text style={[styles.label, { color: colors.subtext }]}>
        {language === 'sinhala' ? 'උපන් දිනය' : language === 'tamil' ? 'பிறந்த தேதி' : 'Date of birth'}
      </Text>
      <TextInput
        value={dateOfBirth}
        onChangeText={setDateOfBirth}
        placeholder={language === 'sinhala' ? 'YYYY-MM-DD' : language === 'tamil' ? 'YYYY-MM-DD' : 'YYYY-MM-DD'}
        placeholderTextColor={colors.subtext}
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
      />

      <Text style={[styles.label, { color: colors.subtext }]}>
        {language === 'sinhala' ? 'ලිපිනය' : language === 'tamil' ? 'முகவரி' : 'Address'}
      </Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        placeholder={language === 'sinhala' ? 'ලිපිනය' : language === 'tamil' ? 'முகவரி' : 'Address'}
        placeholderTextColor={colors.subtext}
        style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
      />

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <Text style={[styles.label, { color: colors.subtext }]}>{changeEmailLabel}</Text>
      <View style={styles.emailRow}>
        <TextInput
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="new@email.com"
          placeholderTextColor={colors.subtext}
          style={[styles.input, styles.emailInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
        />
        <TouchableOpacity
          style={[styles.sendCodeBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={() => {
            const trimmed = newEmail.trim();
            if (trimmed.length > 3) onRequestEmailChange?.(trimmed);
          }}
        >
          <Text style={styles.sendCodeText}>{sendCodeLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={() =>
            onSave({
              ...user,
              fullName: fullName.trim(),
              phone: phone.trim(),
              gender: gender.trim(),
              dateOfBirth: dateOfBirth.trim(),
              address: address.trim(),
            })
          }
        >
          <Text style={styles.primaryText}>{saveLabel}</Text>
        </TouchableOpacity>

        {!!onCancel && (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            activeOpacity={0.85}
            onPress={onCancel}
          >
            <Text style={[styles.secondaryText, { color: colors.subtext }]}>{cancelLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
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
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  readonlyBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  readonlyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginTop: 14,
  },
  emailRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
  },
  sendCodeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendCodeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
