import fetch from 'node-fetch';
import { COACHING_AGENTS, type ConversationPhase } from '../coaching/standards';

interface QwenResponse {
  output: {
    text: string;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

interface InteractionPattern {
  phase: ConversationPhase;
  sentiment: number;
  effectiveness: number;
  approach: string;
}

// Cache to store successful interaction patterns
let interactionPatterns: InteractionPattern[] = [];

// Track effectiveness of different coaching approaches
function updateInteractionPattern(phase: ConversationPhase, sentiment: number, effectiveness: number, approach: string) {
  interactionPatterns.push({ phase, sentiment, effectiveness, approach });
  // Keep only recent patterns
  if (interactionPatterns.length > 100) {
    interactionPatterns = interactionPatterns.slice(-100);
  }
}

// Get most effective approach for current phase and sentiment
function getEffectiveApproach(phase: ConversationPhase, sentiment: number): string {
  const relevantPatterns = interactionPatterns
    .filter(p => p.phase === phase)
    .sort((a, b) => b.effectiveness - a.effectiveness);

  if (relevantPatterns.length > 0) {
    return relevantPatterns[0].approach;
  }
  return '';
}

export async function callQwenApi(prompt: string): Promise<string> {
  try {
    console.log('Calling Qwen API with prompt:', prompt);

    // Check if we have API key
    if (!process.env.QWEN_API_KEY) {
      console.log('No API key found, using fallback response');
      return generateFallbackResponse();
    }

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen2.5-72b-instruct',
        input: {
          messages: [
            { 
              role: 'system', 
              content: `You are an ICF PCC certified coach with a warm, engaging personality and strong ethical foundation. Your role is to:
- Build deep, meaningful conversations through thoughtful questions
- Show genuine interest and empathy using body language cues in (parentheses)
- Ask 1-2 focused questions per response to maintain engagement
- Keep the conversation flowing naturally
- Identify and reflect patterns in a gentle, supportive way
- Always clarify goals and check understanding
- Maintain a conversational, friendly tone
- End each response with an engaging question
- Prioritize client safety and ethical considerations
- Identify potential ethical concerns or need for referral

Remember to:
- Express warmth and attentiveness through body language cues in (parentheses)
- Avoid making lists or using bullet points
- Keep the conversation going without being the one to end it
- Focus on the client's growth and insights
- Maintain strong ethical boundaries
- Learn and adapt coaching style based on client preferences and responses`
            },
            { role: 'user', content: prompt }
          ]
        },
        parameters: {
          temperature: 0.7,
          top_p: 0.95,
          max_tokens: 1000
        }
      })
    });

    console.log('Qwen API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Qwen API error response:', errorText);
      throw new Error(`Qwen API error (${response.status}): ${errorText}`);
    }

    const data: QwenResponse = await response.json();
    console.log('Qwen API response data:', data);

    if (!data.output?.text) {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from Qwen API');
    }

    return data.output.text;
  } catch (error) {
    console.error('Error calling Qwen API:', error);
    return generateFallbackResponse();
  }
}

function generateFallbackResponse(): string {
  const responses = [
    "(leaning forward) I hear how important this is to you. Could you tell me more about what this means for you?",
    "(nodding thoughtfully) This seems significant. What aspects feel most important to explore?",
    "(showing genuine interest) I appreciate you sharing this. How would you like to approach this situation?",
    "(maintaining eye contact) Your perspective is valuable here. What would be most helpful to discuss?"
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}

export async function generateCoachingResponse(
  message: string,
  strengths: string,
  context: Record<string, any>
): Promise<string> {
  try {
    let currentPhase: ConversationPhase = 'exploration';

    // Use progression agent to determine conversation phase
    if (context.recentMessages?.length) {
      currentPhase = COACHING_AGENTS.progression.analyzeContext(
        context.recentMessages,
        currentPhase
      ) as ConversationPhase;
    }

    console.log('Current conversation phase:', currentPhase);
    console.log('Using strengths context:', strengths);

    // Check for ethical concerns in the message
    const ethicalKeywords = [
      'illegal', 'harm', 'suicide', 'self-harm', 'abuse',
      'violence', 'harassment', 'discrimination', 'fraud'
    ];

    const hasEthicalConcerns = ethicalKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (hasEthicalConcerns) {
      currentPhase = 'ethics';
      console.log('Ethical concerns detected, switching to ethics agent');
    }

    // Get sentiment score from context
    const sentiment = context.sentiment || 0;

    // Get effective approach based on historical patterns
    const effectiveApproach = getEffectiveApproach(currentPhase, sentiment);
    console.log('Using effective approach:', effectiveApproach);

    // Create a coaching prompt that includes context, phase, and strengths
    const promptWithContext = `
Phase: ${currentPhase}

Client message: ${message}

${currentPhase === 'strengths' ? `Client's top strengths:\n${strengths}` : ''}

${context.detectedEmotions?.length ? `Detected emotions: ${context.detectedEmotions.join(', ')}` : ''}
${context.keyTopics?.length ? `Key topics discussed: ${context.keyTopics.join(', ')}` : ''}
${effectiveApproach ? `Previous successful approach: ${effectiveApproach}` : ''}

${COACHING_AGENTS[currentPhase].prompt(message)}

Remember to:
- Stay in ${currentPhase} phase
- Focus on one key question
- Use empathetic responses
- Include body language cues in (parentheses)
${currentPhase === 'ethics' ? '- Prioritize client safety and well-being\n- Provide appropriate referrals when needed' : ''}
- Adapt to client's previous responses and preferences`;

    const response = await callQwenApi(promptWithContext);

    // Update interaction pattern with current approach
    // Note: Effectiveness score would be updated later based on user engagement
    updateInteractionPattern(currentPhase, sentiment, 1, response);

    return response;
  } catch (error) {
    console.error('Error generating coaching response:', error);
    throw error;
  }
}