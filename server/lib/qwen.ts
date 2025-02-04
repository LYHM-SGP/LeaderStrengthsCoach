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

  // Generate appropriate responses based on whether it's an exploration, reflection, or challenge prompt
  if (prompt.includes('exploration')) {
    return `I notice you're bringing up an interesting topic. Let me ask you:
1. How do you see ${strengths} playing a role in this situation?
2. What possibilities excite you the most about this?
3. What would success look like for you in this context?`;
  } else if (prompt.includes('reflection')) {
    return `Reflecting on what you've shared, I notice:
1. There seems to be a pattern in how you approach this situation
2. Your strengths, particularly in ${strengths}, appear to be valuable here
3. What insights are you gaining as we discuss this?`;
  } else if (prompt.includes('challenge')) {
    return `Let's explore this from different angles:
1. What assumptions might you be making about the situation?
2. How might someone with different strengths approach this?
3. What if you leveraged ${strengths} in an unexpected way?`;
  }

  // Default response if prompt type isn't clear
  return `That's an interesting perspective. Let's explore how your strengths in ${strengths} might be relevant here. What aspects of this situation would you like to focus on?`;
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