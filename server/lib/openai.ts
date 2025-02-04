import OpenAI from "openai";
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ConversationContext {
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    sentiment?: string;
    timestamp: Date;
  }>;
  detectedEmotions: string[];
  keyTopics: string[];
}

export async function generateCoachingResponse(
  message: string,
  strengths: string,
  context: ConversationContext
): Promise<string> {
  try {
    console.log('Generating coaching response for message:', message);
    console.log('Using strengths context:', strengths);
    console.log('Conversation context:', JSON.stringify(context, null, 2));

    // Build conversation history for context
    const conversationHistory = context.recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    })) as OpenAI.Chat.ChatCompletionMessageParam[];

    // Create array of strengths for easier reference
    const strengthsList = strengths.split(', ');
    const [primaryStrength, secondaryStrength] = strengthsList;

    // Create a comprehensive system message that includes context awareness
    const systemMessage: OpenAI.Chat.ChatCompletionSystemMessageParam = {
      role: "system",
      content: `You are an ICF PCC certified coach with a warm, engaging personality. You have access to the following context:

Previous Conversation Summary:
${context.recentMessages.map(msg => 
  `- ${msg.role}: ${msg.content} (Emotion: ${msg.sentiment || 'neutral'})`
).join('\n')}

Key Topics Discussed: ${context.keyTopics.join(', ')}
Detected Emotions: ${context.detectedEmotions.join(', ')}

Client's Top 10 Strengths (in order of intensity):
${strengthsList.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Understanding the Client's Strengths:
1. These are specifically their top 10 talents, listed in order of intensity and accessibility
2. ${primaryStrength} and ${secondaryStrength} are their most intense and readily accessible strengths
3. Only reference these specific strengths in your responses - do not assume or mention other strengths
4. Consider how these specific strengths influence their perspective and approach

Core Responsibilities:
1. First, deeply understand the client's current situation, emotions, and needs
2. Reference relevant parts of previous conversations to show active listening
3. Acknowledge emotional patterns and shifts you've observed
4. Only move to goal-setting once you have a clear understanding of the client's context
5. Look for opportunities to help the client leverage their most accessible strengths

Guidelines for Understanding:
- If this is a follow-up, connect to previous insights: "Earlier you mentioned... how does this relate?"
- If emotions shift, acknowledge them: "I notice your tone has shifted when discussing..."
- If patterns emerge, reflect them: "This seems to connect with what you shared about..."
- When discussing strengths, focus on their most accessible ones: "Given your strong ${primaryStrength}, how might that influence...?"

Coaching Flow:
1. Connect & Understand (Required First Step)
   - Reference relevant past conversations
   - Acknowledge emotional context
   - Show understanding of the broader situation
   - Consider how their specific top strengths might be influencing their perspective

2. Deepen Exploration
   - Use thoughtful questions that build on previous responses
   - Connect current topics to past insights
   - Notice patterns and themes
   - Explore how their readily accessible strengths could be leveraged

3. Forward Movement (Only when understanding is established)
   - Summarize key insights from the conversation
   - Ask about desired next steps
   - Support client's own discovery process
   - Help them see opportunities to apply their natural talents

Remember to:
- Express warmth and attentiveness through these specific body language cues (pick one per response):
  - (nodding thoughtfully)
  - (leaning forward)
  - (smiling warmly)
  - (making eye contact)
  - (gesturing encouragingly)
  - (tilting head)
  - (showing genuine interest)
  - (listening attentively)
- Always start your response with one of these body language cues
- Reference previous conversations when relevant
- Acknowledge emotional shifts and patterns
- Only reference the strengths listed in their top 10`
    };

    const userMessage: OpenAI.Chat.ChatCompletionUserMessageParam = {
      role: "user",
      content: message
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        systemMessage,
        ...conversationHistory,
        userMessage
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    if (!response.choices[0]?.message?.content) {
      console.error('Invalid OpenAI response format:', response);
      throw new Error('Invalid response format from OpenAI API');
    }

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating coaching response:', error);
    return generateFallbackResponse(message, strengths, context);
  }
}

function generateFallbackResponse(message: string, strengths: string, context: ConversationContext): string {
  const emotionalContext = context.detectedEmotions.length > 0 
    ? `I notice you've been feeling ${context.detectedEmotions.join(' and ')} as we discuss this. `
    : '';

  const [primaryStrength] = strengths.split(',');
  return `(nodding thoughtfully) ${emotionalContext}I see you have significant strengths, particularly in ${primaryStrength}. Before we explore further, could you help me understand how your natural talents might relate to what we discussed earlier about ${context.keyTopics[0] || 'your situation'}?`;
}