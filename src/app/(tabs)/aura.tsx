import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon } from '../../components/Icon';
import { AuraError, askAura } from '../../services/auraApi';
import type { AuraCta, AuraTurn } from '../../services/auraApi';
import { useCardStore } from '../../store/useCardStore';
import { theme } from '../../theme';

// Aura answers on the WalletWise server (server/): a Groq model that calls the app's
// engine and a verified card knowledge base. These are shortcuts that send a question.
const SUGGESTIONS = ['Which card for ₹1,500 at Swiggy?', 'Tell me about Diners Black International', 'Any changes to my cards?', 'How should I use my points?'];

const WELCOME =
  "Hi, I'm Aura. Ask me which of your cards to use, what your points are worth, about any Indian credit card, or how credit cards work.";

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cta?: AuraCta | null;
  state?: 'streaming' | 'done' | 'error';
  /** For error bubbles: the question to send again. */
  retryQuestion?: string;
};

let nextId = 0;
const newId = () => `m${++nextId}`;

/** Three gold dots that pulse while Aura is working. */
function TypingDots() {
  const dots = [useSharedValue(0.3), useSharedValue(0.3), useSharedValue(0.3)];
  useEffect(() => {
    dots.forEach((d, i) =>
      d.set(withDelay(i * 150, withRepeat(withSequence(withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }), withTiming(0.3, { duration: 400 })), -1))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const s0 = useAnimatedStyle(() => ({ opacity: dots[0].get() }));
  const s1 = useAnimatedStyle(() => ({ opacity: dots[1].get() }));
  const s2 = useAnimatedStyle(() => ({ opacity: dots[2].get() }));
  return (
    <View style={styles.dots} accessibilityLabel="Aura is typing">
      {[s0, s1, s2].map((s, i) => (
        <Animated.View key={i} style={[styles.dot, s]} />
      ))}
    </View>
  );
}

export default function AuraScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { userId, holdings, profile } = useCardStore();
  const scrollRef = useRef<ScrollView>(null);
  const handledQuery = useRef<string | undefined>(undefined);

  const [messages, setMessages] = useState<Message[]>([{ id: 'welcome', role: 'assistant', content: WELCOME, state: 'done' }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const patch = (id: string, change: Partial<Message> | ((m: Message) => Partial<Message>)) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...(typeof change === 'function' ? change(m) : change) } : m)));

  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  const ask = useCallback(
    async (text: string, options: { retryOf?: string } = {}) => {
      const question = text.trim();
      if (!question || busy) return;
      setInput('');
      setBusy(true);
      setStatus(null);

      // History for the server: finished messages only, plus this question.
      const history: AuraTurn[] = messages
        .filter((m) => m.id !== 'welcome' && m.state !== 'error' && m.id !== options.retryOf && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }));
      const replyId = newId();
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== options.retryOf),
        ...(options.retryOf ? [] : [{ id: newId(), role: 'user' as const, content: question, state: 'done' as const }]),
        { id: replyId, role: 'assistant', content: '', state: 'streaming' },
      ]);
      scrollToEnd();

      try {
        const result = await askAura(
          {
            userId,
            messages: [...history, { role: 'user' as const, content: question }].slice(-12),
            wallet: {
              cards: holdings.map((h) => ({ catalogId: h.catalogId, points: h.points })),
              profile: { experience: profile.experience, repayment: profile.repayment, monthlySpend: profile.monthlySpend as Record<string, number> },
            },
          },
          {
            onStatus: setStatus,
            onText: (delta) => {
              setStatus(null);
              patch(replyId, (m) => ({ content: m.content + delta }));
            },
          },
        );
        patch(replyId, { content: result.text, cta: result.cta, state: 'done' });
      } catch (error) {
        const message = error instanceof AuraError ? error.message : 'Something went wrong. Please try again.';
        patch(replyId, { content: message, state: 'error', retryQuestion: question });
      } finally {
        setBusy(false);
        setStatus(null);
        scrollToEnd();
      }
    },
    [busy, messages, userId, holdings, profile],
  );

  // Questions sent from other screens (for example the Home Aura bar).
  useEffect(() => {
    if (q && handledQuery.current !== q) {
      handledQuery.current = q;
      ask(q);
    }
  }, [q, ask]);

  const openCta = (cta: AuraCta) => {
    // Card details open by wallet entry; the server refers to cards by catalog id.
    if (cta.route === '/card-detail' && cta.params?.catalogId) {
      const holding = holdings.find((h) => h.catalogId === cta.params?.catalogId);
      if (holding) router.push({ pathname: '/card-detail', params: { id: holding.id } });
      return;
    }
    router.push({ pathname: cta.route as never, params: cta.params });
  };

  const showSuggestions = messages.length === 1 && !busy;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="sparkle" color={theme.colors.gold} size={theme.sizes.icon} />
          </View>
          <Text style={[theme.text.body, styles.headerTitle]} accessibilityRole="header">
            AURA
          </Text>
          <Text style={theme.text.caption}>Your credit card assistant</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={{ paddingBottom: theme.sizes.tabBarHeight * 2 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => {
            const isUser = m.role === 'user';
            const streamingEmpty = m.state === 'streaming' && !m.content;
            return (
              <View key={m.id} style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}>
                {!isUser && (
                  <View style={styles.avatar}>
                    <Icon name="sparkle" color={theme.colors.gold} size={theme.fontSize.caption} />
                  </View>
                )}
                <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi, m.state === 'error' && styles.bubbleError]}>
                  {streamingEmpty ? (
                    <View>
                      <TypingDots />
                      {!!status && <Text style={[theme.text.caption, styles.status]}>{status}</Text>}
                    </View>
                  ) : (
                    <Text style={[theme.text.body, styles.text]} accessibilityLiveRegion={m.state === 'streaming' ? 'polite' : 'none'}>
                      {m.content}
                    </Text>
                  )}
                  {m.state === 'done' && m.cta && (
                    <Pressable
                      onPress={() => openCta(m.cta!)}
                      accessibilityRole="button"
                      accessibilityLabel={m.cta.label}
                      style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                    >
                      <Text style={[theme.text.body, styles.ctaText]}>{m.cta.label} →</Text>
                    </Pressable>
                  )}
                  {m.state === 'error' && m.retryQuestion && (
                    <Pressable
                      onPress={() => ask(m.retryQuestion!, { retryOf: m.id })}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel="Try again"
                      style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                    >
                      <Text style={[theme.text.body, styles.ctaText]}>Try again ↻</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}

          {showSuggestions && (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => ask(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask: ${s}`}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                >
                  <Text style={[theme.text.body, styles.chipText]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputArea, { paddingBottom: insets.bottom + theme.sizes.tabBarHeight + theme.spacing.sm }]}>
          <LinearGradient colors={['rgba(10,10,10,0)', theme.colors.background]} style={StyleSheet.absoluteFill} />
          <View style={styles.inputBox}>
            <TextInput
              style={[theme.text.body, styles.input]}
              placeholder="Ask Aura anything about cards…"
              placeholderTextColor={theme.colors.textMuted}
              keyboardAppearance="dark"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => ask(input)}
              returnKeyType="send"
              multiline
              maxLength={1000}
              accessibilityLabel="Message to Aura"
            />
            <Pressable
              onPress={() => ask(input)}
              disabled={busy || !input.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: busy || !input.trim() }}
              style={({ pressed }) => [styles.send, (busy || !input.trim()) && styles.sendDisabled, pressed && styles.pressed]}
            >
              <Text style={styles.sendIcon}>↑</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pressed: { opacity: 0.8 },
  header: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: theme.sizes.hairline,
    borderBottomColor: theme.colors.border,
  },
  headerIcon: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.sizes.touch / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.goldBorder,
  },
  headerTitle: { color: theme.colors.gold, fontWeight: '700', letterSpacing: 2 },
  chat: { flex: 1, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.md },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  avatar: {
    width: theme.sizes.badgeSmall,
    height: theme.sizes.badgeSmall,
    borderRadius: theme.sizes.badgeSmall / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.goldBorder,
  },
  bubble: { maxWidth: '85%', padding: theme.spacing.md, borderRadius: theme.radius.lg + theme.spacing.xs },
  bubbleAi: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.spacing.xs, borderWidth: 1, borderColor: theme.colors.border },
  bubbleUser: { backgroundColor: theme.colors.surfaceRaised, borderTopRightRadius: theme.spacing.xs },
  bubbleError: { borderColor: theme.colors.warning, backgroundColor: theme.colors.warningSoft },
  text: { color: theme.colors.textPrimary },
  status: { marginTop: theme.spacing.sm },
  dots: { flexDirection: 'row', gap: theme.spacing.xs, paddingVertical: theme.spacing.xs },
  dot: { width: theme.sizes.dot, height: theme.sizes.dot, borderRadius: theme.sizes.dot / 2, backgroundColor: theme.colors.gold },
  cta: {
    alignSelf: 'flex-start',
    minHeight: theme.sizes.touch,
    justifyContent: 'center',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.goldBorder,
    backgroundColor: theme.colors.goldSoft,
  },
  ctaText: { color: theme.colors.gold, fontWeight: '700' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, paddingLeft: theme.sizes.badgeSmall + theme.spacing.sm },
  chip: {
    minHeight: theme.sizes.touch,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.goldBorder,
  },
  chipText: { color: theme.colors.gold },
  inputArea: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.lg },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.lg + theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.goldBorder,
  },
  input: { flex: 1, color: theme.colors.textPrimary, minHeight: theme.sizes.touch, maxHeight: theme.sizes.touch * 3, paddingVertical: theme.spacing.sm },
  send: {
    width: theme.sizes.touch,
    height: theme.sizes.touch,
    borderRadius: theme.sizes.touch / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.gold,
  },
  sendDisabled: { backgroundColor: theme.colors.goldSoft },
  sendIcon: { color: theme.colors.onGold, fontSize: theme.fontSize.title, fontWeight: '800' },
});
