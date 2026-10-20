/**
 * Bill-day reminders as local notifications (expo-notifications, SDK 57). No push server: the phone
 * schedules them itself. Date maths lives in engine/billing.ts; this file only talks to the OS.
 *
 * Expo Go can show local notifications, but test reminders in the APK or a development build,
 * where the config plugin in app.json and the Android channel behave as they will for users.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { billReminders, localIsoDate } from '../engine/billing';

const CHANNEL_ID = 'bill-reminders';
/** Every bill reminder id starts with this, so a sync never touches other notifications. */
const ID_PREFIX = 'bill-';

export type ReminderHolding = { id: string; bankName: string; cardName: string; dueDay?: number };

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

let handlerSet = false;
/** Shows reminders as a banner even when the app is open. Safe to call more than once. */
export function setupBillReminderHandler() {
  if (!supported || handlerSet) return;
  handlerSet = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Android needs a channel before it shows the permission prompt (Android 13+) or any notification. */
async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Bill reminders',
    description: 'Reminders 3 days and 1 day before a card bill is due',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

const allowed = (p: Notifications.NotificationPermissionsStatus) =>
  p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

/** Checks permission without asking. */
export async function hasReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  return allowed(await Notifications.getPermissionsAsync());
}

/** Asks for permission. Call only when the user turns reminders on. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (allowed(current)) return true;
  if (!current.canAskAgain) return false;
  return allowed(await Notifications.requestPermissionsAsync());
}

const dateLabel = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/**
 * Replaces every bill reminder with a fresh set for the cards that have a due day.
 * Called whenever cards, due days or the on/off switch change. Returns how many were scheduled.
 */
export async function syncBillReminders(holdings: ReminderHolding[], on: boolean, now = new Date()): Promise<number> {
  if (!supported) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!on || !(await hasReminderPermission())) return 0;
  await ensureChannel();

  let count = 0;
  for (const h of holdings) {
    if (!h.dueDay) continue;
    for (const r of billReminders(h.dueDay, now)) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${h.id}-${localIsoDate(r.dueDate)}-${r.daysBefore}`,
        content: {
          title: `${h.bankName} ${h.cardName}: bill due ${r.daysBefore === 1 ? 'tomorrow' : `in ${r.daysBefore} days`}`,
          body: `Due ${dateLabel(r.dueDate)}. Pay the total due, not the minimum, to avoid interest and late fees.`,
          data: { holdingId: h.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fireAt, channelId: CHANNEL_ID },
      });
      count++;
    }
  }
  return count;
}

/** Calls `onOpen` with the card's holding id when the user taps a bill reminder. Returns an unsubscribe function. */
export function onBillReminderTap(onOpen: (holdingId: string) => void): () => void {
  if (!supported) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const { identifier, content } = response.notification.request;
    const holdingId = content.data?.holdingId;
    if (identifier.startsWith(ID_PREFIX) && typeof holdingId === 'string') onOpen(holdingId);
  });
  return () => sub.remove();
}
