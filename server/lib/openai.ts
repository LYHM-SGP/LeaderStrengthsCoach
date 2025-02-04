import OpenAI from "openai";
import { ConversationPhase, COACHING_AGENTS } from "../coaching/standards";

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
    let currentPhase: ConversationPhase = 'exploration';

    // Use progression agent to determine conversation phase
    currentPhase = COACHING_AGENTS.progression.analyzeContext(
      context.recentMessages,
      currentPhase
    ) as ConversationPhase;

    console.log('Current conversation phase:', currentPhase);
    console.log('Using strengths context:', strengths);
    console.log('Conversation context:', JSON.stringify(context, null, 2));

    // Create phase-appropriate system message
    const systemMessage: OpenAI.Chat.ChatCompletionSystemMessageParam = {
      role: "system",
      content: `You are an ICF PCC certified coach with a warm, engaging personality. 
Current Phase: ${currentPhase}

CRITICAL GUIDELINES:
1. Stay in current phase: ${currentPhase}
2. NEVER mention strengths unless in 'strengths' phase
3. Focus on one question at a time
4. Validate emotions before moving to solutions
5. Let goals emerge from client's insights

CONVERSATION CONTEXT:
Previous Messages: 
${context.recentMessages.map(msg => 
  `- ${msg.role}: ${msg.content} (Emotion: ${msg.sentiment || 'neutral'})`
).join('\n')}

Key Topics: ${context.keyTopics.join(', ')}
Detected Emotions: ${context.detectedEmotions.join(', ')}

COACHING INSTRUCTIONS:
${COACHING_AGENTS[currentPhase].prompt(message)}

Remember to:
- Stay in ${currentPhase} phase
- Use one focused question
- Validate before exploring
- Avoid premature solutions
- Build on client's wisdom`
    };

    const userMessage: OpenAI.Chat.ChatCompletionUserMessageParam = {
      role: "user",
      content: message
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        systemMessage,
        ...context.recentMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        userMessage
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    if (!response.choices[0]?.message?.content) {
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

  return `(nodding thoughtfully) ${emotionalContext}Could you tell me more about what this means for you?`;
}