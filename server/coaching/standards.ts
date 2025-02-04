import { z } from "zod";

// Add progression states to track conversation phase
export type ConversationPhase = 'exploration' | 'understanding' | 'goalsetting' | 'strengths';

export const COACHING_AGENTS = {
  progression: {
    name: "Progression Agent",
    description: "Determines when to progress conversation phases",
    analyzeContext: (messages: any[], currentPhase: ConversationPhase) => {
      let hasSharedEmotions = false;
      let hasSharedImpact = false;
      let hasSharedDesire = false;
      let showsFrustration = false;
      let repeatedPatterns = 0;
      let lastQuestion = '';
      let similarQuestions = 0;

      // Analyze recent messages for progression indicators
      messages.forEach(msg => {
        const content = msg.content.toLowerCase();

        // Check for repetitive patterns in questions
        if (msg.role === 'assistant') {
          if (content.includes('how do you feel') || content.includes('what are you feeling')) {
            if (lastQuestion.includes('feel')) similarQuestions++;
            lastQuestion = 'feel';
          } else if (content.includes('how is this affecting') || content.includes('what impact')) {
            if (lastQuestion.includes('impact')) similarQuestions++;
            lastQuestion = 'impact';
          }
        }

        // Check for emotional content
        if (content.includes('feel') || content.includes('angry') || 
            content.includes('sad') || content.includes('frustrated')) {
          hasSharedEmotions = true;
        }

        // Check for impact statements
        if (content.includes('impact') || content.includes('affect') || 
            content.includes('because')) {
          hasSharedImpact = true;
        }

        // Check for frustration or repetition indicators
        if (content.includes('enough') || content.includes('already told') ||
            content.includes('again') || content.includes('what?')) {
          showsFrustration = true;
        }

        // Count repeated themes
        if (content.includes('work') || content.includes('gossip') ||
            content.includes('performance')) {
          repeatedPatterns++;
        }
      });

      // Move to goal setting if:
      // 1. User shows frustration
      // 2. Similar questions have been asked multiple times
      // 3. Same themes are being repeated
      if (showsFrustration || similarQuestions >= 2 || repeatedPatterns >= 3) {
        return 'goalsetting';
      }

      // Quick phase progression
      switch(currentPhase) {
        case 'exploration':
          if (hasSharedEmotions) {
            return 'understanding';
          }
          break;
        case 'understanding':
          if (hasSharedImpact || messages.length >= 2) {
            return 'goalsetting';
          }
          break;
        case 'goalsetting':
          if (hasSharedDesire) {
            return 'strengths';
          }
          break;
      }

      return currentPhase;
    }
  },

  exploration: {
    name: "Exploration Agent",
    description: "Uses open-ended questions to promote self-discovery",
    prompt: (context: string) => `
(Making eye contact) What emotions are coming up for you in this situation?

Remember to:
- Move quickly to understanding
- Avoid repeating questions
- Progress when emotions are clear
`,
  },

  understanding: {
    name: "Understanding Agent",
    description: "Deepens awareness and surfaces patterns",
    prompt: (context: string) => `
(Nodding thoughtfully) What's the biggest challenge this is creating for you at work?

Remember to:
- Focus on concrete work impact
- Move quickly to goals
- Avoid repeating questions
`,
  },

  goalSetting: {
    name: "Goal Setting Agent",
    description: "Partners with client to establish meaningful goals",
    prompt: (context: string) => `
(Leaning forward) What would you like to see change?

Remember to:
- Be direct and specific
- Focus on actionable steps
- Move conversation forward
`,
  },

  strengths: {
    name: "Strengths Integration Agent",
    description: "Uses strengths to support client's goals",
    prompt: (context: string) => `
(Showing interest) How can your abilities help address this situation?

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

export const COACHING_PROMPTS = {
  establishAgreement: (context: string) => `
(Sitting forward with focused attention) Before we begin, I'd like to understand what brings you here today and what would make our conversation meaningful for you.

Let's explore:
- What's on your mind today?
- What feelings or thoughts are present?
- What would you like to explore?
- What would make this conversation valuable?

How would you like to begin?
`,

  activeListening: (context: string) => `
(Maintaining warm eye contact) I'm hearing the importance of this for you, and I'd like to understand more deeply.

Let's explore:
- What emotions are present as you share this?
- What values or beliefs are being touched?
- What aspects feel most significant?
- What meaning does this hold for you?

Tell me more about your experience with this.
`,

  powerfulQuestions: (context: string) => `
(Leaning in with genuine curiosity) As I listen to your story, I'm noticing some interesting themes.

Let's explore deeper:
- What's at the heart of this for you?
- How does this connect to what matters most?
- What new awareness is emerging?
- What possibilities are you seeing?

What insights are surfacing as we discuss this?
`,

  facilitateGrowth: (context: string) => `
(Nodding encouragingly) I notice we've explored several important aspects of your situation.

Let's integrate what's emerging:
- What new insights have you gained?
- What's becoming clearer for you?
- What learning stands out for you?
- What would you like to explore next?

How would you like to build on these insights?
`
};

export const agentSchema = z.object({
  type: z.enum(["exploration", "understanding", "goalSetting", "strengths"]),
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