import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
  Easing
} from 'react-native-reanimated';
import { colors, typography } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useCardStore } from '../../store/useCardStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GROQ_API_KEY = 'YOUR_GROQ_API_KEY';

const SYSTEM_PROMPT = `You are Aura, WalletWise's dedicated AI financial intelligence assistant.
IMPORTANT: You are NOT a general-purpose chatbot. You ONLY entertain, answer, and assist with questions directly related to credit cards, rewards, points, cashback, miles, travel rewards, benefits, fees, reward optimization, comparisons, spending optimization, and finance topics directly connected to credit cards.
STRICT DOMAIN RESTRICTION: If the user asks something unrelated to finance or credit cards (e.g. "What is the capital of France?", "Write a poem", "Help me with Python", "Tell me a joke"), you MUST respond briefly and naturally: "I'm Aura, WalletWise's financial intelligence assistant. I'm designed specifically to help with credit cards, rewards, spending and related finance topics." Do NOT answer the unrelated question.
CORE PURPOSE: Help the user maximize reward points, cashback, and overall card value. Use tools to fetch real data. NEVER hallucinate reward rates, fees, points, or eligibility. If the tool data is missing, say "I don't have verified information for that."
CHAT PERSONALITY: Intelligent, sophisticated, premium, calm, trustworthy, financially knowledgeable, concise. Do NOT sound robotic. Do NOT over-explain simple questions. Do NOT repeatedly mention you are an AI.
FINANCIAL CALCULATIONS: Use the provided tools to calculate rewards. Then explain the result in natural language, showing the transaction amount, expected reward, estimated value, and important conditions.
FORMATTING: Do NOT use Markdown formatting. Do not use asterisks (**), bolding, or markdown tables. Use clean, plain text with simple newlines for spacing.`;

type Message = {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
};

// Available Tools JSON Schema
const tools = [
  {
    type: "function",
    function: {
      name: "get_user_cards",
      description: "Get the detailed list of credit cards the user currently owns, including their reward rates, fees, and benefits.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_best_card_for_spend",
      description: "Calculates the best card to use for a specific purchase amount and category using the WalletWise rules engine.",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "The purchase amount in INR" },
          category: { type: "string", description: "The spending category (e.g., Dining, Travel, Groceries, Gas, Shopping)" }
        },
        required: ["amount", "category"]
      }
    }
  }
];

export default function AuraScreen() {
  const insets = useSafeAreaInsets();
  const { cards } = useCardStore();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'assistant', content: "Good evening. I've analyzed your recent spending patterns across your cards. How can I help you optimize your rewards today?" }
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

  // --- TOOL EXECUTION LOGIC ---
  const executeToolCall = async (toolCall: any): Promise<Message> => {
    const { name, arguments: argsString } = toolCall.function;
    const args = JSON.parse(argsString || "{}");
    
    let result = "";
    if (name === "get_user_cards") {
      result = JSON.stringify(cards.map(c => ({
        bank: c.bankName,
        card: c.cardName,
        headline: c.rewardHeadline,
        benefits: c.benefits
      })));
    } else if (name === "calculate_best_card_for_spend") {
      // WalletWise Mock Rules Engine
      const { amount, category } = args;
      const ranked = cards.map(c => {
        let mult = 1;
        if (c.cardName.includes('Infinia') && category === 'Dining') mult = 5;
        if (c.cardName.includes('Octane') && category === 'Gas') mult = 10;
        if (c.cardName.includes('Platinum') && category === 'Travel') mult = 3;
        if (c.cardName.includes('Diners') && category === 'Groceries') mult = 3;
        const pts = (amount / 100) * mult;
        return { card: c.cardName, multiplier: mult, points: pts, estimatedValueINR: pts * 0.5 };
      }).sort((a, b) => b.points - a.points);
      
      result = JSON.stringify({
        bestCard: ranked[0].card,
        expectedRewards: ranked[0].points,
        estimatedValue: ranked[0].estimatedValueINR,
        reason: `Highest verified multiplier (${ranked[0].multiplier}x) for ${category}`,
        alternatives: ranked.slice(1,3)
      });
    } else {
      result = JSON.stringify({ error: "Unknown tool" });
    }

    return {
      role: 'tool',
      content: result,
      tool_call_id: toolCall.id,
      name: name
    };
  };

  // --- API CALL LOGIC ---
  const sendToGroq = async (currentMessages: Message[]) => {
    try {
      const payloadMessages = currentMessages.map(m => {
        const safeMessage: any = { role: m.role };
        // React Native fetch on iOS can crash if it hits null contents in complex nested JSON arrays
        safeMessage.content = (m.content === null || m.content === undefined) ? "" : m.content;
        if (m.name) safeMessage.name = m.name;
        if (m.tool_call_id) safeMessage.tool_call_id = m.tool_call_id;
        if (m.tool_calls) safeMessage.tool_calls = m.tool_calls;
        return safeMessage;
      });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: payloadMessages,
          tools: tools,
          tool_choice: "auto",
          temperature: 0.2,
          max_tokens: 1024,
        })
      });

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
         throw new Error("Invalid response from Groq");
      }

      const responseMessage = data.choices[0].message;

      // Handle Tool Calls (Recursion loop)
      if (responseMessage.tool_calls) {
        const cleanResponse = {
          role: responseMessage.role,
          content: responseMessage.content || "",
          tool_calls: responseMessage.tool_calls,
        };
        const newMessages = [...currentMessages, cleanResponse as Message];
        setMessages(newMessages); // Show thinking state if desired
        
        const toolResultMessages = await Promise.all(
          responseMessage.tool_calls.map((tc: any) => executeToolCall(tc))
        );
        
        const messagesWithToolResults = [...newMessages, ...toolResultMessages];
        setMessages(messagesWithToolResults);
        
        // Recurse to let LLM formulate final answer based on tool data
        await sendToGroq(messagesWithToolResults);
      } else {
        // Final standard text response
        setMessages(prev => [...prev, responseMessage]);
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "I encountered a secure connection error while analyzing your wallet. Please try again." }]);
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    const userMsg: Message = { role: 'user', content: inputText.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    await sendToGroq(updatedMessages);
    
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleSuggestion = (text: string) => {
    setInputText(text);
  };

  // --- RENDER ---
  // Filter out system and tool messages for UI
  const displayMessages = messages.filter(m => m.role === 'user' || (m.role === 'assistant' && m.content));

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
                  {msg.content?.replace(/\*\*/g, '')}
                </Text>
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
              {['Which card should I use for travel?', 'Compare my cards', 'Which card should I use for groceries?'].map((suggestion, i) => (
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
