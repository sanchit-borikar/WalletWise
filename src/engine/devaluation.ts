import type { Catalog, ChangeEvent } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / DAY_MS;

export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Change types that reduce what a point or a swipe is worth. Fee and lounge changes are handled elsewhere. */
const VALUE_CHANGE_TYPES = new Set(['reward', 'redemption', 'transfer', 'milestone']);

export type DevaluationRisk = {
  /** 0 to 0.3. Used only as a ranking haircut on points cards, never shown as a percentage. */
  risk: number;
  recentCuts: number;
  upcomingCuts: ChangeEvent[];
};

/**
 * Devaluation risk from the card's own recent history.
 * Weighting: each minor value cut in the last 12 months adds 0.04, each major cut 0.08,
 * each announced future cut 0.06; capped at 0.3 so a noisy history cannot bury a good card.
 * Spec: research/algorithm-spec.md §6.
 */
export function devaluationRisk(catalog: Catalog, cardId: string, today = todayIso()): DevaluationRisk {
  const events = catalog.changesByCard.get(cardId) ?? [];
  let risk = 0;
  let recentCuts = 0;
  const upcomingCuts: ChangeEvent[] = [];

  for (const e of events) {
    if (e.direction !== 'devaluation') continue;
    const age = daysBetween(e.date, today);
    if (age < 0) {
      upcomingCuts.push(e);
      if (VALUE_CHANGE_TYPES.has(e.type)) risk += 0.06;
    } else if (age <= 365 && VALUE_CHANGE_TYPES.has(e.type)) {
      recentCuts += 1;
      risk += e.magnitude === 'major' ? 0.08 : 0.04;
    }
  }

  upcomingCuts.sort((a, b) => (a.date < b.date ? -1 : 1));
  return { risk: Math.min(0.3, risk), recentCuts, upcomingCuts };
}

export type CardChangeSummary = {
  upcoming: ChangeEvent[];
  recent: ChangeEvent[];
};

/** Upcoming changes (any direction) and those in the last `sinceDays` days, newest first. */
export function cardChanges(catalog: Catalog, cardId: string, today = todayIso(), sinceDays = 180): CardChangeSummary {
  const events = catalog.changesByCard.get(cardId) ?? [];
  const upcoming = events.filter((e) => e.date > today).sort((a, b) => (a.date < b.date ? -1 : 1));
  const recent = events.filter((e) => e.date <= today && daysBetween(e.date, today) <= sinceDays);
  return { upcoming, recent };
}

/**
 * Alerts for the user's wallet: changes taking effect within `windowDays`, or already
 * announced. RBI directions (para 23(7), 79) require at least one month's notice and
 * let the cardholder close a card without extra charge after a change to their
 * disadvantage, so the alert text says so.
 */
export function walletAlerts(catalog: Catalog, cardIds: string[], today = todayIso(), windowDays = 45) {
  const alerts: { cardId: string; change: ChangeEvent; daysAway: number; message: string }[] = [];
  for (const id of cardIds) {
    for (const change of cardChanges(catalog, id, today).upcoming) {
      const daysAway = Math.round(daysBetween(today, change.date));
      if (daysAway > windowDays) continue;
      const card = catalog.byId.get(id);
      const exit =
        change.direction === 'devaluation'
          ? ' If this change hurts you, RBI rules let you close the card without an extra closure charge once dues are paid.'
          : '';
      alerts.push({
        cardId: id,
        change,
        daysAway,
        message: `${card?.name ?? id}: ${change.title} from ${change.date} (${daysAway} days).${exit}`,
      });
    }
  }
  return alerts.sort((a, b) => a.daysAway - b.daysAway);
}
