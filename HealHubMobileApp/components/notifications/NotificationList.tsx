import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  time: string;
  read?: boolean;
  type?: string;
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
    [notifications]
  );

  const cardElevation = {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: colors.mode === 'dark' ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 3,
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...cardElevation,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="notifications-outline" size={24} color={colors.primary} style={styles.headerIcon} />
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary + '10' }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>{unreadCount} unread</Text>
            </View>
          )}
          {!!onClearAll && (
            <TouchableOpacity
              onPress={onClearAll}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.clearButton}
            >
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[styles.clearText, { color: colors.danger }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={colors.subtext + '40'} />
          <Text style={[styles.emptyText, { color: colors.subtext }]}>{emptyText}</Text>
        </View>
      ) : (
        notifications.map((n, index) => (
          <TouchableOpacity
            key={n.id}
            onPress={() => onPressItem?.(n.id)}
            activeOpacity={0.7}
            style={[
              styles.itemRow,
              {
                borderTopColor: colors.border,
                backgroundColor: n.read ? 'transparent' : colors.primary + '04',
              },
              index === 0 && { borderTopWidth: 0 },
            ]}
          >
            <View style={styles.iconWrapper}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: n.read ? colors.border + '50' : colors.primary + '15',
                  },
                ]}
              >
                {n.type === 'alert' ? (
                  <Ionicons name="alert-circle" size={20} color={n.read ? colors.subtext : colors.primary} />
                ) : n.type === 'reminder' ? (
                  <Ionicons name="alarm" size={20} color={n.read ? colors.subtext : colors.primary} />
                ) : (
                  <Ionicons name="notifications" size={20} color={n.read ? colors.subtext : colors.primary} />
                )}
              </View>
            </View>

            <View style={styles.contentContainer}>
              <View style={styles.titleRow}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                  {n.title}
                </Text>
                {!n.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.itemMessage, { color: colors.subtext }]} numberOfLines={2}>
                {n.message}
              </Text>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color={colors.subtext} />
                <Text style={[styles.itemTime, { color: colors.subtext + '80' }]}>{n.time}</Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.subtext + '60'} />
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    marginHorizontal: 8,        // Reduced from 20 → 8 for wider appearance
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unreadBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 14,
  },
  iconWrapper: {
    width: 44,
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemTime: {
    fontSize: 11,
  },
});