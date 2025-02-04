import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { strengths, coachingNotes, products, orders } from "@db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, handleWebhook } from "./stripe";
import express from 'express';
import multer from 'multer';
import { exec } from 'child_process';
import { promisify } from 'util';

const upload = multer({ storage: multer.memoryStorage() });
const execAsync = promisify(exec);

// Define modality handlers
const MODALITY_HANDLERS = {
  text: {
    type: "text",
    prompt: (message: string, context: string) => `
You are an ICF PCC certified coach specializing in CliftonStrengths. 
Context: Client's top strengths are ${context}.
Question: ${message}

Respond following ICF PCC standards:
1. Maintain coaching presence
2. Practice active listening
3. Ask powerful questions
4. Facilitate growth and learning
5. Avoid consulting or giving direct advice

Format your response to:
- Acknowledge the client's perspective
- Ask powerful, open-ended questions
- Support client's own discovery process
`,
  },

  goals: {
    type: "structured",
    prompt: (goals: string, context: string) => `
As an ICF PCC coach, help the client develop SMART goals aligned with their strengths:
Client's strengths: ${context}
Current goals: ${goals}

Provide structured guidance:
1. Support goal clarity while maintaining coaching presence
2. Connect goals to client's strengths
3. Explore potential obstacles and resources
4. Establish accountability measures
`,
  },

  reflection: {
    type: "analysis",
    prompt: (reflection: string, context: string) => `
As an ICF PCC coach, help the client reflect on their progress:
Client's strengths: ${context}
Reflection: ${reflection}

Guide the reflection process:
1. Acknowledge insights and learning
2. Explore patterns and connections
3. Support deeper awareness
4. Facilitate forward movement
`,
  }
};

// Define coaching agents
type CoachingAgent = 'exploration' | 'goalSetting' | 'reflection'; // Add more agents as needed

interface CoachingAgentDefinition {
  name: string;
  prompt: (message: string, context: string) => string;
}

const COACHING_AGENTS: { [agent in CoachingAgent]: CoachingAgentDefinition } = {
  exploration: {
    name: 'Exploration Agent',
    prompt: (message: string, context: string) => `
      You are a curious and insightful coach.  The client's strengths are ${context}.  The client said: "${message}".  Respond with open-ended questions to encourage further exploration.
    `
  },
  goalSetting: {
    name: 'Goal Setting Agent',
    prompt: (message: string, context: string) => `
      You are a coach helping the client set SMART goals.  The client's strengths are ${context}. The client said: "${message}". Help the client define specific, measurable, achievable, relevant, and time-bound goals.
    `
  },
  reflection: {
    name: 'Reflection Agent',
    prompt: (message: string, context: string) => `
      You are a coach guiding the client through a reflection exercise. The client's strengths are ${context}. The client said: "${message}". Help the client identify key learnings, insights, and areas for growth.
    `
  }
};


export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Strengths routes
  app.get("/api/strengths", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userStrengths = await db.query.strengths.findMany({
      where: eq(strengths.userId, req.user.id),
      orderBy: (strengths, { desc }) => [desc(strengths.updatedAt)],
    });

    res.json(userStrengths);
  });

  app.post("/api/strengths", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const strength = await db.insert(strengths)
      .values({
        ...req.body,
        userId: req.user.id,
      })
      .returning();

    res.json(strength[0]);
  });

  app.post("/api/strengths/bulk", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const strengthsData = req.body;

    try {
      // Delete existing strengths for the user
      await db.delete(strengths).where(eq(strengths.userId, req.user.id));

      // Insert new strengths
      const newStrengths = await db.insert(strengths)
        .values(
          strengthsData.map((strength: { name: string; score: number }) => ({
            userId: req.user.id,
            name: strength.name,
            category: getStrengthCategory(strength.name),
            score: strength.score,
          }))
        )
        .returning();

      res.json(newStrengths);
    } catch (error) {
      console.error('Error updating strengths:', error);
      res.status(500).json({
        message: "Failed to update strengths",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Coaching notes routes
  app.get("/api/notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const notes = await db.query.coachingNotes.findMany({
      where: eq(coachingNotes.userId, req.user.id),
      orderBy: (notes, { desc }) => [desc(notes.updatedAt)],
    });

    res.json(notes);
  });

  app.post("/api/notes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const note = await db.insert(coachingNotes)
      .values({
        ...req.body,
        userId: req.user.id,
      })
      .returning();

    res.json(note[0]);
  });

  // Shop routes
  app.get("/api/products", async (req, res) => {
    const allProducts = await db.query.products.findMany({
      where: eq(products.active, true),
    });
    res.json(allProducts);
  });

  app.post("/api/checkout", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { productId } = req.body;

    try {
      const [product] = await db.query.products.findMany({
        where: eq(products.id, productId),
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (!product.stripePriceId) {
        return res.status(400).json({ message: "Invalid product configuration" });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const successUrl = `${baseUrl}/shop/success`;
      const cancelUrl = `${baseUrl}/shop/cancel`;

      const session = await createCheckoutSession(
        productId,
        product,
        req.user.id,
        successUrl,
        cancelUrl
      );

      await db.insert(orders).values({
        userId: req.user.id,
        productId: productId,
        status: "pending",
        stripeSessionId: session.id,
        amount: product.price,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Checkout error:', error);
      res.status(500).json({
        message: "Checkout failed",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.post("/api/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== 'string') return res.sendStatus(400);

    try {
      const event = await handleWebhook(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        await db
          .update(orders)
          .set({ status: "completed" })
          .where(eq(orders.stripeSessionId, session.id));
      }

      res.json({ received: true });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error occurred" });
    }
  });

  // AI Coaching route
  app.post("/api/ai-coaching", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { message, agent = 'exploration' } = req.body;
    const userId = req.user.id;

    try {
      // Get user's strengths
      const userStrengths = await db.query.strengths.findMany({
        where: eq(strengths.userId, userId),
        orderBy: (strengths, { asc }) => [asc(strengths.score)],
      });

      // Format strengths for context
      const topStrengths = userStrengths
        .slice(0, 5)
        .map(s => s.name)
        .join(", ");

      // Get the appropriate agent and prompt
      const selectedAgent = COACHING_AGENTS[agent as CoachingAgent];
      if (!selectedAgent) {
        throw new Error("Unsupported coaching agent");
      }

      // TODO: Replace with actual Qwen API call once we have the details
      // For now, returning a placeholder response
      const aiResponse = "Qwen API integration pending. Please provide API details.";

      // Store the conversation in coaching notes
      await db.insert(coachingNotes).values({
        userId: req.user.id,
        title: `AI Coaching Session: ${selectedAgent.name}`,
        content: `Q: ${message}\nA: ${aiResponse}`,
        tags: { agent, strengths: topStrengths }
      });

      res.json({ response: aiResponse });
    } catch (error) {
      console.error('AI Coaching error:', error);
      res.status(500).json({
        message: "Failed to generate coaching response",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

const THEMES = {
  "Executing": ['Achiever', 'Arranger', 'Belief', 'Consistency', 'Deliberative', 'Discipline', 'Focus', 'Responsibility', 'Restorative'],
  "Influencing": ['Activator', 'Command', 'Communication', 'Competition', 'Maximizer', 'Self-Assurance', 'Significance', 'Woo'],
  "Relationship Building": ['Adaptability', 'Connectedness', 'Developer', 'Empathy', 'Harmony', 'Includer', 'Individualization', 'Positivity', 'Relator'],
  "Strategic Thinking": ['Analytical', 'Context', 'Futuristic', 'Ideation', 'Input', 'Intellection', 'Learner', 'Strategic']
} as const;

function getStrengthCategory(strengthName: string): string {
  for (const [category, themes] of Object.entries(THEMES)) {
    if ((themes as readonly string[]).includes(strengthName)) {
      return category;
    }
  }
  return 'UNKNOWN';
}