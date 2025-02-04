import { z } from "zod";

// Add progression states to track conversation phase
export type ConversationPhase = 'exploration' | 'understanding' | 'goalsetting' | 'strengths' | 'ethics';

export const COACHING_AGENTS = {
  progression: {
    name: "Progression Agent",
    description: "Determines when to progress conversation phases",
    analyzeContext: (messages: any[], currentPhase: ConversationPhase) => {
      let hasSharedEmotions = false;
      let showsFrustration = false;
      let negativeEmotionCount = 0;
      let lastQuestion = '';
      let similarQuestions = 0;
      let hasEthicalConcerns = false;

      // Analyze recent messages for progression indicators
      messages.forEach(msg => {
        const content = msg.content.toLowerCase();

        // Check for ethical concerns
        const ethicalKeywords = [
          'illegal', 'harm', 'suicide', 'self-harm', 'abuse',
          'violence', 'harassment', 'discrimination', 'fraud'
        ];

        if (ethicalKeywords.some(keyword => content.includes(keyword))) {
          hasEthicalConcerns = true;
        }

        // Check for repetitive patterns in questions
        if (msg.role === 'assistant') {
          if (content.includes('how do you feel') || content.includes('what are you feeling')) {
            if (lastQuestion.includes('feel')) similarQuestions++;
            lastQuestion = 'feel';
          }
        }

        // Check for negative emotions specifically
        const negativeEmotions = ['angry', 'sad', 'betrayed', 'hurt', 'unfair', 'lonely', 'dread'];
        negativeEmotions.forEach(emotion => {
          if (content.includes(emotion)) {
            hasSharedEmotions = true;
            negativeEmotionCount++;
          }
        });

        // Check for frustration with conversation
        if (content.includes('enough') || content.includes('already told') ||
            content.includes('again') || content.includes('what?')) {
          showsFrustration = true;
        }
      });

      // Immediately switch to ethics agent if concerns detected
      if (hasEthicalConcerns) {
        return 'ethics';
      }

      // Move to goal setting immediately if:
      // 1. Multiple negative emotions expressed
      // 2. Shows frustration with conversation
      // 3. Similar questions asked repeatedly
      if (negativeEmotionCount >= 2 || showsFrustration || similarQuestions >= 2) {
        return 'goalsetting';
      }

      // Quick phase progression for clear negative emotions
      switch(currentPhase) {
        case 'exploration':
          if (hasSharedEmotions) {
            return 'understanding';
          }
          break;
        case 'understanding':
          return 'goalsetting';
        case 'goalsetting':
          return 'strengths';
        case 'strengths':
          return currentPhase;
        case 'ethics':
          // Stay in ethics phase if ethical concerns persist
          return hasEthicalConcerns ? 'ethics' : 'exploration';
      }

      return currentPhase;
    }
  },

  ethics: {
    name: "Ethics Agent",
    description: "Ensures ethical coaching practices and handles sensitive situations",
    prompt: (context: string) => `
(Making eye contact with genuine concern) I want to ensure we handle this situation responsibly and ethically.

Remember to:
- Prioritize client safety and well-being
- Maintain professional boundaries
- Refer to appropriate professionals when needed
- Follow ICF ethical guidelines
- Document ethical concerns appropriately

Key principles:
1. Do no harm
2. Maintain confidentiality
3. Respect professional boundaries
4. Practice within competence
5. Refer when appropriate

Response Guidelines:
- Acknowledge the sensitivity of the situation
- Express appropriate concern
- Clarify your role and limitations
- Provide appropriate referrals
- Document any ethical concerns
`,
  },

  exploration: {
    name: "Exploration Agent",
    description: "Uses open-ended questions to promote self-discovery",
    prompt: (context: string) => `
(Leaning forward) What would you like to see change in this situation?

Remember to:
- Focus on desired outcomes
- Move directly to solutions
- Avoid dwelling on emotions
`,
  },

  understanding: {
    name: "Understanding Agent",
    description: "Deepens awareness and surfaces patterns",
    prompt: (context: string) => `
(Nodding thoughtfully) What specific changes would help improve this situation?

Remember to:
- Focus on actionable changes
- Stay solution-oriented
- Move forward purposefully
`,
  },

  goalsetting: {
    name: "Goal Setting Agent",
    description: "Partners with client to establish meaningful goals",
    prompt: (context: string) => `
(Making eye contact) What's the most important thing you'd like to address first?

Remember to:
- Be direct and specific
- Focus on immediate actions
- Keep momentum forward
`,
  },

  strengths: {
    name: "Strengths Integration Agent",
    description: "Uses strengths to support client's goals",
    prompt: (context: string) => `
(Showing interest) How can we use your abilities to address this?

Remember to:
- Focus on practical actions
- Build on stated goals
- Support forward momentum
`,
  },
};

export const ICF_PCC_STANDARDS = {
  foundation: [
    "Demonstrates ethical practice",
    "Embodies coaching mindset",
    "Maintains coaching presence",
  ],
  cocreating: [
    "Maintains client agenda",
    "Evokes awareness",
    "Facilitates client growth",
    "Partners for client accountability",
  ],
  communicating: [
    "Listens actively",
    "Evokes exploration",
    "Uses direct communication",
  ],
  cultivating: [
    "Facilitates client growth",
    "Celebrates client progress",
    "Promotes client autonomy",
  ],
};

export const agentSchema = z.object({
  type: z.enum(["exploration", "understanding", "goalsetting", "strengths", "ethics"]),
  message: z.string().min(1, "Message is required"),
  context: z.string(),
});

export type CoachingAgent = keyof typeof COACHING_AGENTS;
export type AgentRequest = z.infer<typeof agentSchema>;

export const MODALITY_HANDLERS = {
  text: {
    type: "text",
    prompt: (message: string, context: string) => `
You are an ICF PCC certified coach having a conversation with a client. 

Approach:
1. Start with open exploration
2. Focus on understanding before action
3. Let insights emerge naturally
4. Only bring in strengths after thorough exploration
5. Always probe for learning

Remember to:
- Explore emotions, values, and meaning first
- Ask about patterns and behaviors
- Surface beliefs and assumptions
- Partner in goal setting
- Use strengths to support goals
`,
  },

  goals: {
    type: "structured",
    prompt: (goals: string, context: string) => `
As an ICF PCC coach, help the client explore their aspirations:

Guide the process:
1. Start with open exploration of what matters
2. Understand emotions and values
3. Let goals emerge naturally
4. Connect goals to meaning
5. Consider strengths as resources

Remember to:
- Focus on understanding first
- Explore feelings and motivations
- Connect to values
- Partner in goal setting
- Support natural development
`,
  },

  reflection: {
    type: "analysis",
    prompt: (reflection: string, context: string) => `
As an ICF PCC coach, help the client reflect on their journey:

Guide the process:
1. Create space for emotional processing
2. Explore what's been learned
3. Surface new insights
4. Consider implications
5. Connect to strengths if relevant

Focus on:
- Understanding the emotional journey
- Exploring new awareness
- Connecting insights to values
- Supporting continued growth
- Learning and development
`,
  }
};