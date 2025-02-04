import fetch from 'node-fetch';

interface QwenResponse {
  response: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callQwenApi(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.QWEN_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            { role: 'system', content: 'You are an ICF PCC certified coach following strict coaching standards.' },
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.output.text;
  } catch (error) {
    console.error('Error calling Qwen API:', error);
    throw new Error(error instanceof Error ? error.message : 'Unknown error occurred while calling Qwen API');
  }
}

export async function generateCoachingResponse(
  message: string,
  strengths: string,
  agentPrompts: Record<string, string>
): Promise<string> {
  try {
    // Call Qwen API for each agent
    const responses = await Promise.all(
      Object.entries(agentPrompts).map(async ([agent, prompt]) => {
        const response = await callQwenApi(prompt);
        return { agent, response };
      })
    );

    // Combine responses intelligently
    const combinedResponse = `I notice you're exploring an interesting topic, especially given your strengths in ${strengths}. Let me help you explore this from multiple perspectives:

${responses.map(({ agent, response }) => `
From ${agent === 'exploration' ? 'an exploration' : agent === 'reflection' ? 'a reflection' : 'a challenge'} perspective:
${response}
`).join('\n')}

What resonates most with you from these different perspectives?`;

    return combinedResponse;
  } catch (error) {
    console.error('Error generating coaching response:', error);
    throw error;
  }
}