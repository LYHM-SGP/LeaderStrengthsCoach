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
      let emotionalDepth = 0;

      // Analyze recent messages for progression indicators
      messages.forEach(msg => {
        const content = msg.content.toLowerCase();

        // Check for emotional content and depth
        if (content.includes('feel') || content.includes('angry') || 
            content.includes('sad') || content.includes('happy') ||
            content.includes('frustrated') || content.includes('betrayed')) {
          hasSharedEmotions = true;
          emotionalDepth++;
        }

        // Check for impact statements
        if (content.includes('impact') || content.includes('affect') || 
            content.includes('because') || content.includes('leads to') ||
            content.includes('makes me')) {
          hasSharedImpact = true;
        }

        // Check for explicit desire to change or take action
        if (content.includes('want to') || content.includes('wish') || 
            content.includes('would like') || content.includes('need to') ||
            content.includes('have to') || content.includes('should')) {
          hasSharedDesire = true;
        }
      });

      // More strict phase progression rules
      switch(currentPhase) {
        case 'exploration':
          // Only move to understanding after sufficient emotional sharing
          if (hasSharedEmotions && emotionalDepth >= 2) {
            return 'understanding';
          }
          break;
        case 'understanding':
          // Require both emotional awareness and impact understanding
          if (hasSharedEmotions && hasSharedImpact && messages.length >= 4) {
            return 'goalsetting';
          }
          break;
        case 'goalsetting':
          // Only move to strengths after clear desire for change
          if (hasSharedDesire && hasSharedImpact) {
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
(Making eye contact with genuine interest) What are you feeling about this situation?

Remember to:
- Listen for emotional content
- Acknowledge feelings without solutions
- Stay with emotions
- Validate experiences
`,
  },

  understanding: {
    name: "Understanding Agent",
    description: "Deepens awareness and surfaces patterns",
    prompt: (context: string) => `
(Nodding thoughtfully) How is this situation affecting you?

Remember to:
- Surface patterns and insights
- Connect to values
- Deepen understanding
- Stay with impact
`,
  },

  goalSetting: {
    name: "Goal Setting Agent",
    description: "Partners with client to establish meaningful goals",
    prompt: (context: string) => `
(Leaning forward with interest) What would you like to see change in this situation?

Remember to:
- Focus on client's desires
- Be specific and actionable
- Connect to values
- Avoid mentioning strengths
`,
  },

  strengths: {
    name: "Strengths Integration Agent",
    description: "Uses strengths to support client's goals",
    prompt: (context: string) => `
(Showing genuine interest) How might your natural abilities help you move toward this goal?

Remember to:
- Connect strengths to stated goals
- Focus on client insights
- Support practical application
- Build on client's wisdom
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