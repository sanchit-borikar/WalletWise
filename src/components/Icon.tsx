import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { theme } from '../theme';

/**
 * Small line-icon set drawn with react-native-svg (already a dependency), so no
 * icon library is needed. Paths are simple 24x24 outlines in the style of Feather (MIT).
 */
export type IconName =
  | 'home'
  | 'pin'
  | 'sparkle'
  | 'book'
  | 'card'
  | 'bell'
  | 'settings'
  | 'plus'
  | 'plane'
  | 'chevron-right'
  | 'play'
  | 'rupee'
  | 'search';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = theme.sizes.icon, color = theme.colors.textPrimary, strokeWidth = 1.8 }: Props) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...stroke} />}
      {name === 'pin' && (
        <>
          <Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" {...stroke} />
          <Circle cx={12} cy={9.5} r={2.5} {...stroke} />
        </>
      )}
      {name === 'sparkle' && <Path d="M12 2.5 14 9l6.5 2.5L14 14l-2 6.5L10 14l-6.5-2.5L10 9z" fill={color} />}
      {name === 'book' && (
        <>
          <Path d="M3 4.5h6a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H3z" {...stroke} />
          <Path d="M21 4.5h-6a3 3 0 0 0-3 3V20a2.5 2.5 0 0 1 2.5-2.5H21z" {...stroke} />
        </>
      )}
      {name === 'card' && (
        <>
          <Rect x={2.5} y={5} width={19} height={14} rx={2.5} {...stroke} />
          <Path d="M2.5 10h19M6.5 15h4" {...stroke} />
        </>
      )}
      {name === 'bell' && (
        <>
          <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" {...stroke} />
          <Path d="M10 20.5a2 2 0 0 0 4 0" {...stroke} />
        </>
      )}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3} {...stroke} />
          <Path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
            {...stroke}
          />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...stroke} />}
      {name === 'plane' && <Path d="M10.5 21 12 18l1.5 3M12 18V4.5a1.5 1.5 0 0 0-3 0V18M12 4.5a1.5 1.5 0 0 1 3 0V18M3 13l9-4 9 4" {...stroke} />}
      {name === 'chevron-right' && <Path d="m9 6 6 6-6 6" {...stroke} />}
      {name === 'play' && <Path d="M8 5.5v13l10.5-6.5z" fill={color} />}
      {name === 'rupee' && <Path d="M7 4.5h10M7 9h10M7 4.5h3.5a4.5 4.5 0 0 1 0 9H7l7.5 7" {...stroke} />}
      {name === 'search' && (
        <>
          <Circle cx={10.5} cy={10.5} r={6.5} {...stroke} />
          <Path d="m15.5 15.5 5 5" {...stroke} />
        </>
      )}
    </Svg>
  );
}
