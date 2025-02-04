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

    // Create array of strengths in order of intensity
    const strengthsList = strengths.split(', ');
    const topFiveStrengths = strengthsList.slice(0, 5);
    const [primaryStrength, secondaryStrength] = topFiveStrengths;

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

IMPORTANT STRENGTH GUIDELINES:
1. The client's top 5 most intense and readily accessible strengths are: ${topFiveStrengths.join(', ')}
2. ${primaryStrength} is their MOST intense strength, followed by ${secondaryStrength}
3. ONLY reference strengths from their actual top 10 list above
4. Focus primarily on their top 5 strengths as these are most readily accessible
5. Never assume or mention strengths that aren't in their list

Core Coaching Approach:
1. Start with their most intense strengths (${primaryStrength}, ${secondaryStrength}) when exploring situations
2. Consider how their top 5 strengths might interact and influence their perspective
3. Only bring in lower-ranked strengths (6-10) when directly relevant or mentioned by the client
4. Always verify that any strength you reference is actually in their top 10 list

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
- Double-check that any strength you mention is actually in their top 10 list
- Focus primarily on their top 5 most intense strengths: ${topFiveStrengths.join(', ')}`
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
  return `(nodding thoughtfully) ${emotionalContext}I notice your ${primaryStrength} strength could be particularly relevant here. Could you tell me more about how this situation feels to you, especially considering your natural talents?`;
}