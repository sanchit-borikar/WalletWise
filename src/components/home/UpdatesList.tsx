import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { catalog } from '../../data/catalog';
import { cardChanges } from '../../engine';
import type { CardData } from '../../store/useCardStore';
import { theme } from '../../theme';
import { BankBadge } from './BankBadge';
import { SectionHeader } from './SectionHeader';
import { SEVERITY_STYLE, updateSeverity } from './updateSeverity';
import type { Severity } from './updateSeverity';

/** Updates shown before "View all updates". */
const VISIBLE = 3;
/** Most updates shown when expanded. */
const MAX = 10;

type Update = {
  key: string;
  cardId: string;
  issuer: string;
  cardLabel: string;
  title: string;
  date: string;
  upcoming: boolean;
  severity: Severity;
};

type Props = {
  cards: CardData[];
  onOpenCard: (id: string) => void;
};

const UpdateRow = React.memo(function UpdateRow({ item, onOpen }: { item: Update; onOpen: (id: string) => void }) {
  const style = SEVERITY_STYLE[item.severity];
  const when = `${item.upcoming ? 'From' : 'Since'} ${item.date}`;
  return (
    <Pressable
      onPress={() => onOpen(item.cardId)}
      accessibilityRole="button"
      accessibilityLabel={`${style.label}, ${when}: ${item.title}. ${item.cardLabel}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.tagRow}>
        <View style={[styles.tag, { backgroundColor: style.background }]}>
          <Text style={[theme.text.caption, { color: style.color }]}>{style.label.toUpperCase()}</Text>
        </View>
        <Text style={theme.text.caption}>{when}</Text>
      </View>
      <Text style={[theme.text.body, styles.title]} numberOfLines={2}>
        {item.title}
      </Text>
      <View style={styles.cardRow}>
        <BankBadge issuer={item.issuer} small />
        <Text style={[theme.text.body, styles.cardLabel]} numberOfLines={1}>
          {item.cardLabel}
        </Text>
      </View>
    </Pressable>
  );
});

/** Devaluations and other changes on the user's cards, upcoming first. */
export function UpdatesList({ cards, onOpenCard }: Props) {
  const [expanded, setExpanded] = useState(false);

  const updates = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const items: Update[] = [];
    for (const c of cards) {
      const issuer = catalog.byId.get(c.catalogId)?.issuer ?? c.bankName;
      const { upcoming, recent } = cardChanges(catalog, c.catalogId);
      for (const e of [...upcoming, ...recent.slice(0, 2)]) {
        items.push({
          key: `${c.id}-${e.date}-${e.title}`,
          cardId: c.id,
          issuer,
          cardLabel: `${c.bankName} · ${c.cardName}`,
          title: e.title,
          date: e.date,
          upcoming: e.date > today,
          severity: updateSeverity(e),
        });
      }
    }
    // Upcoming first (nearest date), then the most recent past changes.
    return items
      .sort((a, b) => {
        if (a.upcoming !== b.upcoming) return a.upcoming ? -1 : 1;
        return a.upcoming ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      })
      .slice(0, MAX);
  }, [cards]);

  const renderItem = useCallback(({ item }: { item: Update }) => <UpdateRow item={item} onOpen={onOpenCard} />, [onOpenCard]);
  const toggle = useCallback(() => setExpanded((v) => !v), []);
  const visible = expanded ? updates : updates.slice(0, VISIBLE);

  return (
    <View>
      <SectionHeader title="Updates on your cards" meta={updates.length ? `${updates.length}` : undefined} />
      <FlatList
        data={visible}
        keyExtractor={(u) => u.key}
        renderItem={renderItem}
        scrollEnabled={false}
        ItemSeparatorComponent={Separator}
        style={styles.list}
        ListEmptyComponent={<Text style={[theme.text.body, styles.empty]}>No recent or upcoming changes to your cards.</Text>}
      />
      {updates.length > VISIBLE && (
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show fewer updates' : `View all ${updates.length} updates`}
          accessibilityState={{ expanded }}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
        >
          <Text style={[theme.text.body, styles.moreText]}>{expanded ? 'Show fewer' : 'View all updates'}</Text>
        </Pressable>
      )}
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  list: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.sizes.hairline,
    borderColor: theme.colors.border,
  },
  row: { padding: theme.spacing.md, gap: theme.spacing.sm, minHeight: theme.sizes.touch },
  pressed: { backgroundColor: theme.colors.pressed },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  tag: { paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs, borderRadius: theme.radius.pill },
  title: { color: theme.colors.textPrimary, fontWeight: '600' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cardLabel: { flex: 1 },
  separator: { height: theme.sizes.hairline, backgroundColor: theme.colors.border, marginLeft: theme.spacing.md },
  empty: { padding: theme.spacing.md },
  more: {
    minHeight: theme.sizes.touch,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  moreText: { color: theme.colors.gold, fontWeight: '700' },
});
