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

function generateFallbackResponse(message: string): string {
  // Generate a more dynamic fallback response based on the emotional content
  const emotionalPhrases = [
    'I hear how important this is to you.',
    'This sounds like a challenging situation.',
    'Thank you for sharing that with me.',
    'I can sense there\'s a lot to explore here.'
  ];

  const questions = [
    'Could you tell me more about what this means for you?',
    'What aspects of this situation feel most important to address?',
    'How are you feeling about this right now?',
    'What would you like to focus on as we discuss this?'
  ];

  const randomPhrase = emotionalPhrases[Math.floor(Math.random() * emotionalPhrases.length)];
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

  return `(leaning forward with genuine interest) ${randomPhrase} ${randomQuestion}`;
}

export async function generateCoachingResponse(
  message: string,
  strengths: string,
  context: Record<string, any>
): Promise<string> {
  try {
    // Create a coaching prompt that includes context and strengths
    const promptWithContext = `
Client message: ${message}

Client's top strengths:
${strengths}

${context.detectedEmotions?.length ? `Detected emotions: ${context.detectedEmotions.join(', ')}` : ''}
${context.keyTopics?.length ? `Key topics discussed: ${context.keyTopics.join(', ')}` : ''}

As their coach, respond with empathy and help them explore this situation further. Remember to use a coaching mindset and include body language cues in (parentheses).`;

    console.log('Generating coaching response for message:', message);
    console.log('Using strengths context:', strengths);

    const response = await callQwenApi(promptWithContext);
    return response;
  } catch (error) {
    console.error('Error generating coaching response:', error);
    throw error;
  }
}