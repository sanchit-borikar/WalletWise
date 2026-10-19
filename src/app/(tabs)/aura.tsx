import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { typography } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useCardStore } from '../../store/useCardStore';
import { answerAura, AURA_SUGGESTIONS } from '../../utils/auraBrain';
import type { AuraAction } from '../../utils/auraBrain';

// Aura runs on the device with the WalletWise engine (src/utils/auraBrain.ts).
// No API key is needed and no data leaves the phone.

type Message = {
  role: 'user' | 'assistant';
  content: string;
  actions?: AuraAction[];
};

// Short pause so the reply feels like a response rather than a page change.
const THINKING_MS = 350;

export default function AuraScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { cards, profile, profileSaved, isDemo } = useCardStore();
  const scrollViewRef = useRef<ScrollView>(null);
  const handledQuery = useRef<string | undefined>(undefined);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi, I'm Aura. Ask me which of your cards to use for a purchase, how to use your points, whether a new card is worth it, or anything about how credit cards work." }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Animations
  const aiGlowOpacity = useSharedValue(0.1);

  useEffect(() => {
    aiGlowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.1, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
  }, []);

  const aiGlowStyle = useAnimatedStyle(() => ({ opacity: aiGlowOpacity.value }));

  const ask = useCallback((text: string) => {
    const question = text.trim();
    if (!question) return;
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInputText('');
    setIsLoading(true);
    setTimeout(() => {
      const reply = answerAura(question, { cards, profile, profileSaved, isDemo });
      setMessages((prev) => [...prev, { role: 'assistant', content: reply.text, actions: reply.actions }]);
      setIsLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, THINKING_MS);
  }, [cards, profile, profileSaved, isDemo]);

  // Questions sent from other screens (Home suggestion pills).
  useEffect(() => {
    if (q && handledQuery.current !== q) {
      handledQuery.current = q;
      ask(q);
    }
  }, [q, ask]);

  const handleSend = () => ask(inputText);

  const handleSuggestion = (text: string) => ask(text);

  const openAction = (action: AuraAction) => {
    router.push({ pathname: action.route as never, params: action.params });
  };

  // --- RENDER ---
  const displayMessages = messages;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Background ambient glow */}
        <Animated.View style={[styles.ambientGlow, aiGlowStyle]} />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.auraIconWrapper}>
            <Text style={styles.auraIcon}>✦</Text>
          </View>
          <Text style={styles.headerTitle}>AURA</Text>
          <Text style={styles.headerSubtitle}>Financial Intelligence</Text>
        </View>

        {/* Chat Area */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatArea}
          contentContainerStyle={{ paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {displayMessages.map((msg, index) => (
            <View 
              key={index} 
              style={[
                styles.messageRow,
                msg.role === 'user' ? styles.messageRowUser : styles.messageRowAi
              ]}
            >
              {msg.role === 'assistant' && (
                <View style={styles.messageAvatar}>
                  <Text style={styles.messageAvatarIcon}>✦</Text>
                </View>
              )}
              <View style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAi
              ]}>
                <Text style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.messageTextUser : styles.messageTextAi
                ]}>
                  {msg.content}
                </Text>
                {msg.actions && msg.actions.length > 0 && (
                  <View style={styles.actionRow}>
                    {msg.actions.map((a) => (
                      <Pressable key={a.label} style={styles.actionChip} onPress={() => openAction(a)}>
                        <Text style={styles.actionChipText}>{a.label} →</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>
          ))}
          
          {isLoading && (
            <View style={[styles.messageRow, styles.messageRowAi]}>
              <View style={styles.messageAvatar}>
                <Text style={styles.messageAvatarIcon}>✦</Text>
              </View>
              <View style={[styles.messageBubble, styles.messageBubbleAi, { paddingVertical: 14 }]}>
                <ActivityIndicator color="#F5D06F" size="small" />
              </View>
            </View>
          )}

          {displayMessages.length === 1 && !isLoading && (
            <View style={styles.suggestionsContainer}>
              {AURA_SUGGESTIONS.map((suggestion, i) => (
                <Pressable key={i} style={styles.suggestionPill} onPress={() => handleSuggestion(suggestion)}>
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 84 }]}>
          <LinearGradient
            colors={['rgba(7,7,7,0)', 'rgba(7,7,7,0.9)', '#070707']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.inputWrapper}>
            <TextInput 
              style={styles.textInput}
              placeholder="Ask Aura anything..."
              placeholderTextColor="#6F6F6F"
              keyboardAppearance="dark"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
            />
            <Pressable style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendIcon}>↑</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionChip: {
    borderWidth: 1,
    borderColor: 'rgba(245, 208, 111, 0.4)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(245, 208, 111, 0.08)',
  },
  actionChipText: {
    fontFamily: typography.fontFamily,
    color: '#F5D06F',
    fontSize: 13,
    fontWeight: '600',
  },
  container: { 
    flex: 1, 
    backgroundColor: '#070707',
  },
  ambientGlow: {
    position: 'absolute',
    top: -100,
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#F5D06F',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    zIndex: 10,
  },
  auraIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 208, 111, 0.4)',
  },
  auraIcon: {
    fontSize: 20,
    color: '#F5D06F',
  },
  headerTitle: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: '700',
    color: '#F5D06F',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 11,
    color: '#A0A0A0',
    marginTop: 2,
    letterSpacing: 1,
  },
  chatArea: {
    flex: 1,
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(245, 208, 111, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  messageAvatarIcon: {
    color: '#F5D06F',
    fontSize: 12,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 20,
    maxWidth: '85%',
  },
  messageBubbleAi: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 208, 111, 0.14)',
  },
  messageBubbleUser: {
    backgroundColor: '#2A2A2A',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontFamily: typography.fontFamily,
    fontSize: 15,
    lineHeight: 24,
  },
  messageTextAi: {
    color: '#F5F5F5',
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
    paddingLeft: 40,
  },
  suggestionPill: {
    backgroundColor: '#171717',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(245, 208, 111, 0.2)',
  },
  suggestionText: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: '#F5D06F',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 208, 111, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  textInput: {
    flex: 1,
    fontFamily: typography.fontFamily,
    color: '#F5F5F5',
    fontSize: 15,
    maxHeight: 100,
    minHeight: 36,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 208, 111, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sendIcon: {
    color: '#F5D06F',
    fontSize: 18,
    fontWeight: '700',
  },
});
