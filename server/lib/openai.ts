import OpenAI from "openai";
import { COACHING_AGENTS, type ConversationPhase } from '../coaching/standards';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    const prompt = `
Phase: ${currentPhase}

Client message: ${message}

${currentPhase === 'strengths' ? `Client's top strengths:\n${strengths}` : ''}

${context.detectedEmotions?.length ? `Detected emotions: ${context.detectedEmotions.join(', ')}` : ''}
${context.keyTopics?.length ? `Key topics discussed: ${context.keyTopics.join(', ')}` : ''}

${COACHING_AGENTS[currentPhase].prompt(message)}

Remember to:
- Stay in ${currentPhase} phase
- Focus on one key question
- Use empathetic responses
- Include body language cues in (parentheses)
${currentPhase === 'ethics' ? '- Prioritize client safety and well-being\n- Provide appropriate referrals when needed' : ''}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
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
- Maintain strong ethical boundaries`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return response.choices[0].message.content || generateFallbackResponse();
  } catch (error) {
    console.error('Error generating coaching response:', error);
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