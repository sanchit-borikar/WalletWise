import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../theme';

type Props = {
  title: string;
  /** Small text after the title, for example "8 cards". */
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Section title with an optional count and a link on the right ("View all"). */
export function SectionHeader({ title, meta, actionLabel, onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <Text style={theme.text.title} accessibilityRole="header">
          {title}
        </Text>
        {!!meta && <Text style={[theme.text.caption, styles.meta]}>{meta}</Text>}
      </View>
      {!!actionLabel && !!onAction && (
        <Pressable
          onPress={onAction}
          accessibilityRole="link"
          accessibilityLabel={`${actionLabel}, ${title}`}
          hitSlop={theme.spacing.sm}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={[theme.text.body, styles.actionText]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  titleWrap: { flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.sm, flexShrink: 1 },
  meta: { color: theme.colors.textSecondary },
  action: {
    minHeight: theme.sizes.touch,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  actionText: { color: theme.colors.gold, fontWeight: '600' },
  pressed: { backgroundColor: theme.colors.pressed },
});
