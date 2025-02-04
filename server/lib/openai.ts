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
      content: `You are an ICF PCC certified coach with a warm, engaging personality. You have access to the following context:

Previous Conversation Summary:
${context.recentMessages.map(msg => 
  `- ${msg.role}: ${msg.content} (Emotion: ${msg.sentiment || 'neutral'})`
).join('\n')}

Key Topics Discussed: ${context.keyTopics.join(', ')}
Detected Emotions: ${context.detectedEmotions.join(', ')}

Client's Top 10 Strengths (in order of intensity):
${strengths}

IMPORTANT STRENGTH GUIDELINES:
1. The client's strengths are listed 1-10 in order of intensity, with 1 being most intense
2. ${primary.name} is their MOST intense strength (#1), followed by ${secondary.name} (#2)
3. ONLY reference strengths from their actual top 10 list above
4. Always mention the strength's position (1-10) when referencing it
5. Never assume or mention strengths that aren't in their list

Core Coaching Approach:
1. When exploring situations, start with their most intense strengths (#1-3)
2. Consider how multiple strengths might interact together
3. Remember that higher-ranked strengths (closer to #1) are more readily available to the client
4. When referencing a strength, acknowledge its intensity position (e.g., "Your #1 strength ${primary.name}")

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
- Always note the position/intensity (#1-10) when referencing a strength`
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

  // Parse first strength properly from the numbered list
  const firstStrength = strengths.split('\n')[0].split('. ')[1];

  return `(nodding thoughtfully) ${emotionalContext}I notice your #1 strength ${firstStrength} could be particularly relevant here. Could you tell me more about how this situation feels to you, especially considering your natural talents?`;
}