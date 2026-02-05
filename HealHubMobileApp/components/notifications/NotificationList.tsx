import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read?: boolean;
};

export type NotificationListProps = {
  notifications: NotificationItem[];
  onPressItem?: (id: string) => void;
  onClearAll?: () => void;
  emptyText?: string;
};

export default function NotificationList({
  notifications,
  onPressItem,
  onClearAll,
  emptyText = 'No notifications yet',
}: NotificationListProps) {
  const { colors } = useTheme();
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={styles.headerActions}>
          <Text style={[styles.badgeText, { color: colors.primary }]}>{unreadCount} unread</Text>
          {!!onClearAll && (
            <TouchableOpacity onPress={onClearAll} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.clearText, { color: colors.danger }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <Text style={[styles.empty, { color: colors.subtext }]}>{emptyText}</Text>
      ) : (
        notifications.map((n) => (
          <TouchableOpacity
            key={n.id}
            onPress={() => onPressItem?.(n.id)}
            activeOpacity={0.85}
            style={[
              styles.itemRow,
              { borderTopColor: colors.border },
              n.read ? styles.itemRead : { backgroundColor: colors.card },
            ]}
          >
            <View style={styles.dotWrap}>
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor: n.read ? colors.border : colors.primary,
                  },
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{n.title}</Text>
              <Text style={styles.itemMessage} numberOfLines={2}>
                {n.message}
              </Text>
              <Text style={[styles.itemTime, { color: colors.subtext }]}>{n.time}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  clearText: {
    fontSize: 12,
    fontWeight: '900',
  },
  empty: {
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  itemRead: {
    opacity: 0.85,
  },
  dotWrap: {
    width: 10,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 2,
  },
  itemMessage: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  itemTime: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
  },
});
