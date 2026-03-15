import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export type PatientTabKey = 'home' | 'appointment' | 'medicine' | 'clinic' | 'reports' | 'profile';

export type PatientTabsProps = {
  activeTab: PatientTabKey;
  onChange: (tab: PatientTabKey) => void;
};

export default function PatientTabs({ activeTab, onChange }: PatientTabsProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const tabs: Array<{ key: PatientTabKey; iconActive: React.ComponentProps<typeof Ionicons>['name']; iconInactive: React.ComponentProps<typeof Ionicons>['name']; a11y: string }> = [
    { key: 'home', iconActive: 'home', iconInactive: 'home-outline', a11y: 'Home' },
    { key: 'appointment', iconActive: 'calendar', iconInactive: 'calendar-outline', a11y: 'Appointment' },
    { key: 'medicine', iconActive: 'medkit', iconInactive: 'medkit-outline', a11y: 'Medicine' },
    { key: 'clinic', iconActive: 'business', iconInactive: 'business-outline', a11y: 'Clinic' },
    { key: 'reports', iconActive: 'document-text', iconInactive: 'document-text-outline', a11y: 'Reports' },
    { key: 'profile', iconActive: 'person', iconInactive: 'person-outline', a11y: 'Profile' },
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
            <Ionicons name={isActive ? t.iconActive : t.iconInactive} size={22} color={isActive ? colors.primary : colors.subtext} />
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
