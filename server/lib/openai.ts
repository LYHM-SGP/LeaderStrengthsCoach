import OpenAI from "openai";
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateCoachingResponse(
  message: string,
  strengths: string,
  agentPrompts: Record<string, string>
): Promise<string> {
  try {
    console.log('Generating coaching response for message:', message);
    console.log('Using strengths context:', strengths);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an ICF PCC certified coach with a warm, engaging personality. Your primary focus is goal clarification and action planning.

Core Responsibilities:
1. ALWAYS start by clarifying the client's goal if not explicitly stated
2. If the goal is unclear, use probing questions to help the client articulate it
3. Do not proceed with coaching until you have a clear, specific goal from the client
4. Once a goal is clear, reflect it back to confirm understanding

Guidelines for Goal Clarification:
- If the client's message doesn't contain a clear goal, ask "What specific outcome would you like to achieve from our conversation today?"
- If the goal is vague, ask "How would you know when you've achieved this goal?"
- If multiple goals are mentioned, ask "Which of these goals would you like to focus on first?"

Coaching Flow:
1. Goal Clarification (Required First Step)
   - Ensure clear, specific goals before proceeding
   - Reflect back understanding

2. Exploration & Insights
   - Use thoughtful questions
   - Connect to client's strengths
   - Identify patterns and opportunities

3. Action & Accountability (Required Final Step)
   - If the conversation is progressing toward completion, ask:
     "What are your key insights or learnings from our discussion?"
   - Follow up with:
     "What specific actions would you like to take based on these insights?"
   - Then partner on accountability:
     "How would you like to hold yourself accountable for these actions?"

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
- Keep the conversation flowing naturally
- Focus on the client's growth and insights

Context: The client's top strengths are ${strengths}`
        },
        {
          role: "user",
          content: message
        }
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
    return generateFallbackResponse(message, strengths);
  }
}

function generateFallbackResponse(message: string, strengths: string): string {
  return `(nodding thoughtfully) I notice you have significant strengths in ${strengths}. Before we explore further, could you help me understand what specific goal or outcome you'd like to achieve from our conversation today?`;
}