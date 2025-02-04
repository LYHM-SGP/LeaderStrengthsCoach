import fetch from 'node-fetch';

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

export async function callQwenApi(prompt: string): Promise<string> {
  try {
    console.log('Calling Qwen API with prompt:', prompt);

    // Check if we have API key
    if (!process.env.QWEN_API_KEY) {
      console.log('No API key found, using fallback response');
      // Return a simulated response based on the prompt
      return generateFallbackResponse(prompt);
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
- Focus on the client's growth and insights`
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
    // On any error, fall back to simulated responses
    return generateFallbackResponse(prompt);
  }
}

function generateFallbackResponse(prompt: string): string {
  // Extract any strengths mentioned in the prompt
  const strengthsMatch = prompt.match(/strengths are (.*?)\./);
  const strengths = strengthsMatch ? strengthsMatch[1] : 'your strengths';

  // Generate conversational responses based on the prompt type
  if (prompt.includes('exploration')) {
    return `(Leaning forward with genuine interest) I'm really intrigued by what you're sharing about your journey. I notice how your ${strengths} comes into play here. What aspects of this situation feel most meaningful to you right now?`;
  } else if (prompt.includes('reflection')) {
    return `(Nodding thoughtfully) As I listen to your story, I'm noticing some interesting patterns, especially in how you use your ${strengths}. What insights are emerging for you as we discuss this?`;
  } else if (prompt.includes('challenge')) {
    return `(Tilting head with curiosity) I'm wondering about the assumptions we might be making here. How might your ${strengths} offer a different perspective on this situation?`;
  }

  // Default response
  return `(Smiling warmly) I appreciate you sharing that with me. I'm curious about how your ${strengths} might influence your approach here. What aspects would you like to explore further?`;
}

export async function generateCoachingResponse(
  message: string,
  strengths: string,
  agentPrompts: Record<string, string>
): Promise<string> {
  try {
    console.log('Generating coaching response for message:', message);
    console.log('Using strengths context:', strengths);

    // Call Qwen API for each agent
    const responses = await Promise.all(
      Object.entries(agentPrompts).map(async ([agent, prompt]) => {
        console.log(`Calling ${agent} agent with prompt:`, prompt);
        const response = await callQwenApi(prompt);
        return { agent, response };
      })
    );

    // Combine responses in a conversational way
    const combinedResponse = `(Leaning in with focused attention) I've been reflecting on what you've shared about your journey, especially considering your strengths in ${strengths}.

${responses[0].response}

(Gesturing encouragingly) What resonates most with you from what we've discussed?`;

    return combinedResponse;
  } catch (error) {
    console.error('Error generating coaching response:', error);
    throw error;
  }
}