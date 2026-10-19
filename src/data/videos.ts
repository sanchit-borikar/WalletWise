/**
 * Expert videos shown on Home and Learn. Every ID was checked against YouTube's
 * oEmbed endpoint on 2026-10-19 (title and channel match). Re-check before release.
 */
export type Video = { id: string; title: string; channel: string; level: 'Beginner' | 'Rewards' | 'Travel'; length: string };

export const VIDEOS: Video[] = [
  { id: 'cYMeZs_EcqE', title: 'How credit cards work, and should you own one?', channel: 'Dhruv Rathee', level: 'Beginner', length: '11:51' },
  { id: 'R8ZWwkbS6Ww', title: 'Should I own a credit card?', channel: 'CA Rachana Ranade', level: 'Beginner', length: '11:55' },
  { id: 'sIDD4pB0USs', title: 'Everything you should know about credit cards', channel: 'Labour Law Advisor', level: 'Beginner', length: '18:55' },
  { id: 'rpUgtwUvpCU', title: "3 do's and don'ts while using a credit card", channel: 'Priya Jain', level: 'Beginner', length: '4:22' },
  { id: 'da4hVy7A44o', title: 'Credit card billing cycle explained', channel: 'Finance Review', level: 'Beginner', length: '8:44' },
  { id: 'YSihe9BEV5Q', title: 'Credit and CIBIL score explained (Hindi)', channel: 'Ankur Warikoo', level: 'Beginner', length: '18:50' },
  { id: 'pRh8oNZMIwc', title: 'Credit card tips for a ₹25,000 salary (Hindi)', channel: 'Ankur Warikoo', level: 'Rewards', length: '29:10' },
  { id: 'cjBFgiPA7vA', title: 'Build the right card portfolio for your salary', channel: 'Moneytalks by Groww', level: 'Rewards', length: '1:06:20' },
  { id: 'M4SMio3nUKs', title: 'How to pick the right credit card in 2026', channel: 'Finance With Sharan', level: 'Rewards', length: '1:07:13' },
  { id: 'Bx_T_Uo-Znw', title: 'Transfer HDFC, Axis and Amex points to airlines and hotels', channel: 'Credit Cards Sahi Hai', level: 'Travel', length: '12:34' },
  { id: 'HOIC3INnFII', title: 'Redeem credit card points for flights, step by step', channel: 'Every Paisa Matters', level: 'Travel', length: '18:14' },
  { id: 'Tuija1K1190', title: 'Beginner strategy to fly free with card points', channel: 'The Great Indian Points & Miles Show', level: 'Travel', length: '1:25:03' },
];

export const thumbnailUrl = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
export const videoUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
