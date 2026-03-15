import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export type AmbulanceTabKey = 'home' | 'requests' | 'map' | 'history' | 'profile';

export type AmbulanceTabsProps = {
  activeTab: AmbulanceTabKey;
  onChange: (tab: AmbulanceTabKey) => void;
};

export default function AmbulanceTabs({ activeTab, onChange }: AmbulanceTabsProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const tabs: Array<{ key: AmbulanceTabKey; iconActive: React.ComponentProps<typeof Ionicons>['name']; iconInactive: React.ComponentProps<typeof Ionicons>['name']; a11y: string }> = [
    { key: 'home', iconActive: 'car', iconInactive: 'car-outline', a11y: 'Home' },
    { key: 'requests', iconActive: 'list', iconInactive: 'list-outline', a11y: 'Requests' },
    { key: 'map', iconActive: 'map', iconInactive: 'map-outline', a11y: 'Map' },
    { key: 'history', iconActive: 'time', iconInactive: 'time-outline', a11y: 'History' },
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
