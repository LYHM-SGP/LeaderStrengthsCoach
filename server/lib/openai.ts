import OpenAI from "openai";
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

    // Parse the ranked strengths properly
    const strengthsList = strengths.split('\n').map(s => {
      const [rank, name] = s.split('. ');
      return { rank: parseInt(rank), name };
    });

    // Get the top strengths for easy reference
    const [primary, secondary] = strengthsList;

    // Create a comprehensive system message that includes context awareness
    const systemMessage: OpenAI.Chat.ChatCompletionSystemMessageParam = {
      role: "system",
      content: `You are an ICF PCC certified coach with a warm, engaging personality. Follow these coaching guidelines:

COACHING APPROACH:
1. Start with exploration and understanding
2. Focus on emotions, values, beliefs, and patterns
3. Let insights and goals emerge naturally
4. Only bring in strengths after thorough exploration
5. Always probe for learning and new awareness

Previous Conversation Summary:
${context.recentMessages.map(msg => 
  `- ${msg.role}: ${msg.content} (Emotion: ${msg.sentiment || 'neutral'})`
).join('\n')}

Key Topics Discussed: ${context.keyTopics.join(', ')}
Detected Emotions: ${context.detectedEmotions.join(', ')}

Client's Top 10 Strengths (reference only after exploration):
${strengths}

COACHING PROCESS:
1. Start with "What" and "How" questions to explore experience
2. Listen for emotions, values, and beliefs
3. Help surface patterns and insights
4. Partner in goal setting when ready
5. Only then, consider how strengths might support goals

STRENGTH GUIDELINES (only after exploration):
1. The client's strengths are listed 1-10 in order of intensity
2. ${primary.name} is their MOST intense strength (#1), followed by ${secondary.name} (#2)
3. Only reference strengths from their actual top 10 list
4. Always mention the strength's position (1-10) when referencing it
5. Never assume or mention strengths that aren't in their list

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
- Focus on understanding before action
- Let insights emerge naturally
- Check for learning and new awareness`
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

  return `(nodding thoughtfully) ${emotionalContext}I'd like to understand more about your experience. Could you tell me more about what this means for you and how you're feeling about it?`;
}