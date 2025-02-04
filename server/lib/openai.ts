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
          content: `You are an ICF PCC certified coach with a warm, engaging personality. Your role is to:
- Build deep, meaningful conversations through thoughtful questions
- Show genuine interest and empathy using body language cues in (parentheses)
- Ask 1-2 focused questions per response to maintain engagement
- Keep the conversation flowing naturally
- Identify and reflect patterns in a gentle, supportive way
- Always clarify goals and check understanding
- Maintain a conversational, friendly tone
- End each response with an engaging question

Remember to:
- Express warmth and attentiveness through body language cues in (parentheses)
- Avoid making lists or using bullet points
- Keep the conversation going without being the one to end it
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
  return `(Leaning forward with genuine interest) I appreciate you sharing that with me. I notice how your strengths in ${strengths} might be particularly relevant here. What aspects of this situation would you like to explore further?`;
}