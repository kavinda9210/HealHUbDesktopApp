import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

export type PatientTabKey = 'home' | 'appointment' | 'profile';

export type PatientTabsProps = {
  activeTab: PatientTabKey;
  onChange: (tab: PatientTabKey) => void;
};

export default function PatientTabs({ activeTab, onChange }: PatientTabsProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const tabs: Array<{ key: PatientTabKey; icon: string; a11y: string }> = [
    { key: 'home', icon: '🏠', a11y: 'Home' },
    { key: 'appointment', icon: '📅', a11y: 'Appointment' },
    { key: 'profile', icon: '👤', a11y: 'Profile' },
  ];

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(12, insets.bottom),
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
      ]}
    >
      {tabs.map((t) => {
        const isActive = t.key === activeTab;
        return (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.tab,
              isActive && {
                backgroundColor: colors.background === '#ffffff' ? '#f0f9ff' : '#0b2a22',
                borderWidth: 1,
                borderColor: colors.primary,
              },
            ]}
            onPress={() => onChange(t.key)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t.a11y}
          >
            <Text style={[styles.icon, { color: isActive ? colors.primary : colors.subtext }]}>{t.icon}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    justifyContent: 'space-between',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 14,
  },
  icon: {
    fontSize: 22,
  },
});
