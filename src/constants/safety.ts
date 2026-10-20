/**
 * Plain-language text for the "Your rights" and "Is this a scam?" screens.
 * Rights come from the RBI (Commercial Banks - Credit Cards and Debit Cards: Issuance and Conduct)
 * Directions, 2025, updated as on 1 October 2026. Each paragraph number below was checked against
 * research/sources/rbi-text.txt. Summary only, not legal advice.
 */

export const RBI_DIRECTIONS_NAME = 'RBI Credit Cards and Debit Cards Directions, 2025 (updated 1 Oct 2026)';
export const RBI_OMBUDSMAN_URL = 'https://cms.rbi.org.in';
export const CYBERCRIME_URL = 'https://cybercrime.gov.in';
export const CYBERCRIME_HELPLINE = '1930';

export type Right = { key: string; title: string; body: string; para: string };

export const RIGHTS: Right[] = [
  {
    key: 'unsolicited',
    title: 'A card or upgrade you did not ask for',
    body:
      'Banks may not send you a card or upgrade your card without your clear consent. If you are billed for one, the bank must reverse the charges and pay you a penalty of twice the amount reversed. Do not activate it or share an OTP for it. If you do not consent, the bank must close it at no cost.',
    para: 'Para 11(4), 34',
  },
  {
    key: 'close',
    title: 'Close a card within 7 working days',
    body:
      'Once your dues are paid, the bank must close your card within 7 working days. If it is late, it pays you ₹500 for every day of delay. You can ask by phone, email, app or website: the bank cannot insist on a letter by post.',
    para: 'Para 19',
  },
  {
    key: 'adverse-change',
    title: 'Close free after a change that hurts you',
    body:
      'A change in charges needs at least one month’s notice and applies only from then on. If the change is to your disadvantage, you can close the card without any extra closure charge, once your dues are paid.',
    para: 'Para 23(7)',
  },
  {
    key: 'kfs',
    title: 'Key Fact Statement, and a reason if you are rejected',
    body:
      'With every application the bank must give you a one-page Key Fact Statement with the interest rate and charges. If it rejects your application, it must tell you the specific reason in writing.',
    para: 'Para 11(1)',
  },
  {
    key: 'dispute',
    title: 'A wrong bill must be answered in 30 days',
    body:
      'If you dispute a bill, the bank must explain it, with documents where needed, within 30 days of your complaint.',
    para: 'Para 25',
  },
  {
    key: 'fraud',
    title: 'No charges on a disputed fraud',
    body: 'If you report a transaction as fraud, the bank cannot charge you for it until the dispute is resolved.',
    para: 'Para 27',
  },
  {
    key: 'billing-date',
    title: 'Change your billing date',
    body:
      'You can change your card’s billing cycle at least once, to any date that suits you. Many people set it so the bill is due a few days after salary day.',
    para: 'Para 29',
  },
  {
    key: 'lost',
    title: 'A lost card is blocked at once',
    body:
      'The bank must block a lost card as soon as you tell it, and must give you several ways to report loss or misuse, such as a helpline, SMS, email, website and app.',
    para: 'Para 68, 69',
  },
  {
    key: 'ombudsman',
    title: 'RBI Ombudsman if the bank does not help',
    body:
      'Complain to the bank first. If it does not reply within 30 days, rejects your complaint, or you are not happy with its answer, complain to the RBI Ombudsman online at cms.rbi.org.in. It is free.',
    para: 'Para 85',
  },
];

/** One line for every devaluation or adverse-change alert. */
export const CLOSE_FREE_LINE =
  'Your right: once dues are paid, you can close this card within 7 working days (RBI para 19), with no extra closure charge if a change in charges hurts you (para 23(7)).';

/** Small finance bank cards follow a separate set of RBI Directions. */
export const SFB_NOTE =
  'These rules cover commercial banks and SBI. Small finance bank cards (such as AU, Utkarsh and Unity) follow a separate set of RBI Directions that WalletWise has not read yet, so check with your bank.';

export type ScamTrick = { key: string; title: string; sign: string; doThis: string };

export const SCAM_TRICKS: ScamTrick[] = [
  {
    key: 'points-expiry',
    title: '“Your points expire today” SMS',
    sign: 'A message with a link says your reward points expire today and you must redeem now.',
    doThis: 'Do not tap the link. Check your points in the bank’s own app or website, which you open yourself.',
  },
  {
    key: 'apk',
    title: 'An app file (APK) sent on WhatsApp or SMS',
    sign: 'Someone sends a file ending in .apk to “update KYC”, “redeem points” or “activate a card”.',
    doThis: 'Never install it. These apps read your SMS and steal OTPs. Install bank apps only from the Play Store or App Store.',
  },
  {
    key: 'fake-care',
    title: '“Customer care” number from a search',
    sign: 'You searched for the bank’s helpline and called a number from a search result, ad or social media post.',
    doThis: 'Use only the number printed on the back of your card or shown in the bank’s own app.',
  },
  {
    key: 'screen-share',
    title: 'Asked to install a screen-sharing app',
    sign: 'A caller asks you to install AnyDesk, TeamViewer, QuickSupport or a similar app “to help you”.',
    doThis: 'Hang up. With screen sharing they can see your OTPs and your bank app.',
  },
  {
    key: 'upgrade-otp',
    title: 'Upgrade or limit-increase call asking for an OTP',
    sign: 'A caller offers a free upgrade, a higher limit or a lower fee, then asks for the OTP you just received.',
    doThis: 'Never share it. An OTP is how you approve a payment. Banks need your consent for upgrades, and never ask for an OTP on a call.',
  },
  {
    key: 'fake-kyc',
    title: 'Fake KYC or “card blocked” alert',
    sign: 'A message says your card will be blocked unless you update KYC through a link or a call.',
    doThis: 'Ignore the link. Call the number on the back of your card, or visit a branch, to check.',
  },
  {
    key: 'refund',
    title: 'A “refund” that needs you to pay or scan',
    sign: 'Someone says you are owed a refund or cashback and asks you to scan a QR code or enter your UPI PIN.',
    doThis: 'You never need to scan a code or enter a PIN to receive money. Only to pay.',
  },
];

export const NEVER_SHARE = ['OTP', 'CVV', 'card PIN', 'UPI PIN', 'full card number', 'net banking password'];

export const IF_SCAMMED = [
  'Block the card at once in your bank’s app, or call the number on the back of the card.',
  `Call ${CYBERCRIME_HELPLINE} (national cybercrime helpline) as soon as possible. The sooner you report, the better the chance of stopping the money.`,
  'Report it at cybercrime.gov.in too.',
  'Tell the bank in writing that the transactions are fraud. It cannot charge you for them until the dispute is resolved (RBI para 27).',
  'Keep screenshots of messages, call logs and the bank’s complaint number.',
];

export type LetterFields = { bank: string; card: string; lastFour: string; issue: string; date: string; complaintNo?: string };

const sign = 'Name:\nRegistered mobile number:\nEmail:';

/** Complaint letter to the bank. The user fills in the blanks; nothing is sent by the app. */
export function bankComplaintLetter(f: LetterFields): string {
  return [
    `To: The Grievance Redressal Officer, ${f.bank || '[bank name]'}`,
    `Date: ${f.date}`,
    '',
    `Subject: Complaint about my ${f.card || '[card name]'} credit card${f.lastFour ? ` ending ${f.lastFour}` : ''}`,
    '',
    'Dear Sir or Madam,',
    '',
    `I am writing to complain about the following: ${f.issue || '[describe what happened, with dates and amounts]'}`,
    '',
    'I request you to resolve this and reply in writing. Under the RBI Credit Cards and Debit Cards Directions, 2025, a disputed bill must be explained within 30 days (para 25), no charges may be levied on a transaction disputed as fraud until it is resolved (para 27), and if I do not receive a reply within 30 days I may approach the RBI Ombudsman (para 85).',
    '',
    'Please share a complaint reference number.',
    '',
    'Yours faithfully,',
    sign,
    '',
    '(Do not include your full card number, CVV, PIN or OTP.)',
  ].join('\n');
}

/** Complaint to the RBI Ombudsman, for pasting into cms.rbi.org.in after 30 days without a fair answer. */
export function ombudsmanComplaint(f: LetterFields): string {
  return [
    'Complaint against: ' + (f.bank || '[bank name]'),
    `Product: ${f.card || '[card name]'} credit card${f.lastFour ? ` ending ${f.lastFour}` : ''}`,
    `Date: ${f.date}`,
    '',
    `What happened: ${f.issue || '[describe what happened, with dates and amounts]'}`,
    '',
    `I complained to the bank on [date]${f.complaintNo ? ` (reference ${f.complaintNo})` : ' (reference [number])'}. ` +
      'It did not reply within 30 days / rejected my complaint / gave a reply I am not satisfied with (keep the one that applies).',
    '',
    'Under para 85 of the RBI Credit Cards and Debit Cards Directions, 2025, I request the Ombudsman to direct the bank to resolve this and to compensate me for the loss, time and harassment caused.',
    '',
    sign,
    '',
    '(Do not include your full card number, CVV, PIN or OTP.)',
  ].join('\n');
}
