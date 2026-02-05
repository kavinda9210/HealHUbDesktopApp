import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';
export type AlertMode = 'toast' | 'inline';

export type AlertMessageProps = {
  visible?: boolean;
  variant?: AlertVariant;
  mode?: AlertMode;
  title?: string;
  message: string;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function AlertMessage({
  visible = true,
  variant = 'info',
  mode = 'toast',
  title,
  message,
  onClose,
  style,
}: AlertMessageProps) {
  const insets = useSafeAreaInsets();

  const theme = useMemo(() => {
    switch (variant) {
      case 'success':
        return {
          icon: '✅',
          bg: '#ecfdf5',
          border: '#34d399',
          title: '#065f46',
          text: '#064e3b',
        };
      case 'error':
        return {
          icon: '⚠️',
          bg: '#fef2f2',
          border: '#fca5a5',
          title: '#991b1b',
          text: '#7f1d1d',
        };
      case 'warning':
        return {
          icon: '⚠️',
          bg: '#fffbeb',
          border: '#fcd34d',
          title: '#92400e',
          text: '#78350f',
        };
      case 'info':
      default:
        return {
          icon: 'ℹ️',
          bg: '#f0f9ff',
          border: '#93c5fd',
          title: '#1d4ed8',
          text: '#1e3a8a',
        };
    }
  }, [variant]);

  if (!visible) return null;

  const containerStyles = [
    styles.base,
    mode === 'toast' && {
      position: 'absolute' as const,
      left: 16,
      right: 16,
      top: Math.max(12, insets.top + 12),
      zIndex: 999,
    },
    { backgroundColor: theme.bg, borderColor: theme.border },
    style,
  ];

  return (
    <View style={containerStyles}>
      <Text style={styles.icon} accessibilityLabel={variant}>
        {theme.icon}
      </Text>

      <View style={styles.content}>
        {!!title && <Text style={[styles.title, { color: theme.title }]}>{title}</Text>}
        <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
      </View>

      {!!onClose && (
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close alert"
        >
          <Text style={styles.close}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  icon: {
    fontSize: 18,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  close: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
