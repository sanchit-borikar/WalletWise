import type { ChangeEvent } from '../../engine';
import { theme } from '../../theme';

export type Severity = 'severe' | 'caution' | 'info';

/**
 * Severity of a card change, derived from the change data's existing fields:
 * `direction` (devaluation / neutral / revaluation) and `magnitude` (major / minor).
 *  - severe:  a major devaluation (red)
 *  - caution: a minor devaluation or a neutral change in terms (amber)
 *  - info:    an improvement (neutral)
 */
export function updateSeverity(change: Pick<ChangeEvent, 'direction' | 'magnitude'>): Severity {
  if (change.direction === 'devaluation') return change.magnitude === 'major' ? 'severe' : 'caution';
  if (change.direction === 'neutral') return 'caution';
  return 'info';
}

export const SEVERITY_STYLE: Record<Severity, { label: string; color: string; background: string }> = {
  severe: { label: 'Major cut', color: theme.colors.danger, background: theme.colors.dangerSoft },
  caution: { label: 'Change', color: theme.colors.warning, background: theme.colors.warningSoft },
  info: { label: 'Improved', color: theme.colors.info, background: theme.colors.infoSoft },
};
