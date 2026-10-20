import { useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { onBillReminderTap, setupBillReminderHandler, syncBillReminders } from '../services/billReminders';
import { useCardStore } from '../store/useCardStore';

setupBillReminderHandler();

/**
 * Keeps bill-day reminders in step with the wallet: reschedules when a card, a due day or the
 * on/off switch changes, and opens the card when a reminder is tapped. Mounted once, on Home.
 */
export function useBillReminderSync() {
  const router = useRouter();
  const holdings = useCardStore((s) => s.holdings);
  const on = useCardStore((s) => !!s.billRemindersOn);

  // Only due days and names matter, so point edits do not reschedule.
  const key = useMemo(
    () => JSON.stringify(holdings.filter((h) => h.dueDay).map((h) => [h.id, h.dueDay, h.bankName, h.cardName])),
    [holdings],
  );

  useEffect(() => {
    const list = (JSON.parse(key) as [string, number, string, string][]).map(([id, dueDay, bankName, cardName]) => ({
      id,
      dueDay,
      bankName,
      cardName,
    }));
    syncBillReminders(list, on).catch(() => {
      // Scheduling can fail on devices without notification support; the in-app due-date line still shows.
    });
  }, [key, on]);

  useEffect(() => onBillReminderTap((id) => router.push({ pathname: '/card-detail', params: { id } })), [router]);
}
