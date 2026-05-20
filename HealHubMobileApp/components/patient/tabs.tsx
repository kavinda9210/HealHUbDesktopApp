import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

  const tabs = [
    { key: 'home', iconActive: 'home', iconInactive: 'home-outline', label: 'Home' },
    { key: 'appointment', iconActive: 'calendar', iconInactive: 'calendar-outline', label: 'Appoint' },
    { key: 'medicine', iconActive: 'medkit', iconInactive: 'medkit-outline', label: 'Med' },
    { key: 'clinic', iconActive: 'business', iconInactive: 'business-outline', label: 'Clinic' },
    { key: 'reports', iconActive: 'document-text', iconInactive: 'document-text-outline', label: 'Reports' },
    { key: 'profile', iconActive: 'person', iconInactive: 'person-outline', label: 'Profile' },
  ] as const;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom, // exactly the safe area inset
        },
      ]}
    >
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => onChange(tab.key)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconWrapper,
                  isActive && { backgroundColor: colors.primary + '15' },
                ]}
              >
                <Ionicons
                  name={isActive ? tab.iconActive : tab.iconInactive}
                  size={24}
                  color={isActive ? colors.primary : colors.subtext}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isActive ? colors.primary : colors.subtext },
                  isActive && styles.activeLabel,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 0,    // absolutely no bottom padding inside the row
    justifyContent: 'space-between',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,   // no vertical padding on the tab itself
    gap: 4,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    padding: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeLabel: {
    fontWeight: '700',
  },
});