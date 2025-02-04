import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { strengths, coachingNotes, products, orders } from "@db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { createCheckoutSession, handleWebhook } from "./stripe";
import express from 'express';
import multer from 'multer';
import { exec } from 'child_process';
import { promisify } from 'util';
import { COACHING_AGENTS } from './coaching/standards';
import { generateCoachingResponse } from './lib/qwen';
import sentiment from 'sentiment';

// Updated sentiment analyzer setup
const sentimentAnalyzer = new sentiment();

// Add negative emotional keywords with appropriate weights
sentimentAnalyzer.registerLanguage('en', {
  labels: {
    'betrayed': -4,
    'angry': -3,
    'sad': -3,
    'hurt': -3,
    'gossip': -2,
    'dread': -3,
    'distracted': -2,
    'unfair': -2,
    'lonely': -2
  }
});

const upload = multer({ storage: multer.memoryStorage() });
const execAsync = promisify(exec);

// Define coaching agents
type CoachingAgent = 'exploration' | 'goalSetting' | 'reflection' | 'challenge'; // Add more agents as needed

interface CoachingAgentDefinition {
  name: string;
  prompt: (message: string, context: string) => string;
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Strengths routes
  app.get("/api/strengths", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userStrengths = await db.query.strengths.findMany({
      where: eq(strengths.userId, req.user.id),
      orderBy: [desc(strengths.updatedAt)],
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
      orderBy: [desc(coachingNotes.createdAt)],
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

    const { message, conversationId } = req.body;
    const userId = req.user.id;

    try {
      // Get user's strengths for context, properly ordered by score ascending (1=highest rank)
      const userStrengths = await db.query.strengths.findMany({
        where: eq(strengths.userId, userId),
        orderBy: [asc(strengths.score)],
      });

      // Format strengths for context, ensuring correct ranking order (1-10)
      const topStrengths = userStrengths
        .slice(0, 10)
        .map((s, index) => `${index + 1}. ${s.name}`)
        .join("\n");

      // Get recent conversation history
      const recentNotes = await db.query.coachingNotes.findMany({
        where: eq(coachingNotes.userId, userId),
        orderBy: [desc(coachingNotes.createdAt)],
        limit: 5,
      });

      // Perform sentiment analysis on the current message
      const currentSentiment = sentimentAnalyzer.analyze(message);

      // Build conversation context and agent prompts
      const conversationContext = {
        recentMessages: recentNotes.map(note => {
          const { question, answer } = parseNoteContent(note.content);
          return [
            {
              role: 'user' as const,
              content: question,
              sentiment: sentimentAnalyzer.analyze(question).score.toString(),
              timestamp: note.createdAt!
            },
            {
              role: 'assistant' as const,
              content: answer,
              timestamp: note.createdAt!
            }
          ];
        }).flat(),
        detectedEmotions: getEmotionsFromSentiment(currentSentiment),
        keyTopics: extractKeyTopics(recentNotes)
      };

      try {
        // Generate response using Qwen with properly ranked strengths context
        const aiResponse = await generateCoachingResponse(
          message,
          topStrengths,
          conversationContext
        );

        // Use today's date as conversation ID if none provided
        const today = new Date();
        const dateId = today.toISOString().split('T')[0];
        const actualConversationId = conversationId || dateId;

        // Store the conversation in coaching notes with sentiment
        const [note] = await db.insert(coachingNotes).values({
          userId: req.user.id,
          title: "AI Coaching Session",
          content: `Q: ${message}\n\nA: ${aiResponse}`,
          conversationId: actualConversationId,
          tags: {
            strengths: topStrengths,
            sentiment: currentSentiment.score,
            emotions: conversationContext.detectedEmotions
          }
        }).returning();

        res.json({
          response: aiResponse,
          note,
          context: {
            sentiment: currentSentiment.score,
            emotions: conversationContext.detectedEmotions
          }
        });
      } catch (error) {
        console.error('AI Coaching error:', error);
        // Create a fallback note
        const [note] = await db.insert(coachingNotes).values({
          userId: req.user.id,
          title: "AI Coaching Session (Fallback)",
          content: `Q: ${message}\n\nA: I notice from our previous conversations that we've been exploring ${extractKeyTopics(recentNotes).join(', ')}. I'd like to understand how this connects with what you're sharing now. Could you tell me more about what's on your mind?`,
          conversationId: conversationId || new Date().toISOString().split('T')[0],
          tags: {
            strengths: topStrengths,
            sentiment: currentSentiment.score,
            emotions: conversationContext.detectedEmotions,
            fallback: true
          }
        }).returning();

        res.json({
          response: note.content,
          note,
          context: {
            sentiment: currentSentiment.score,
            emotions: conversationContext.detectedEmotions
          }
        });
      }
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({
        message: "Failed to process coaching request",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Clear coaching notes
  app.delete("/api/notes/clear", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      await db.delete(coachingNotes)
        .where(eq(coachingNotes.userId, req.user.id));

      res.json({ message: "All coaching notes cleared successfully" });
    } catch (error) {
      console.error('Error clearing notes:', error);
      res.status(500).json({
        message: "Failed to clear coaching notes",
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

// Helper functions for context analysis
function parseNoteContent(content: string) {
  const parts = content.split('\n\nA: ');
  return {
    question: parts[0]?.replace('Q: ', '').trim() || '',
    answer: parts[1]?.trim() || ''
  };
}

function getEmotionsFromSentiment(sentiment: { score: number }) {
  const emotions = [];
  if (sentiment.score > 2) emotions.push('very positive');
  else if (sentiment.score > 0) emotions.push('positive');
  else if (sentiment.score < -2) emotions.push('very negative');
  else if (sentiment.score < 0) emotions.push('negative');
  else emotions.push('neutral');
  return emotions;
}

function extractKeyTopics(notes: typeof coachingNotes.$inferSelect[]) {
  const topics = new Set<string>();
  notes.forEach(note => {
    const content = note.content.toLowerCase();
    // Add basic topic extraction logic here
    const commonTopics = ['goals', 'challenges', 'strengths', 'relationships', 'work', 'growth'];
    commonTopics.forEach(topic => {
      if (content.includes(topic)) topics.add(topic);
    });
  });
  return Array.from(topics);
}