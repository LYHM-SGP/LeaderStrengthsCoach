import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { strengths, coachingNotes, products, orders } from "@db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, handleWebhook } from "./stripe";
import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';

const upload = multer({ storage: multer.memoryStorage() });

// Keep the existing THEMES object with correct values
const THEMES = {
  EXECUTING: ['Achiever', 'Arranger', 'Belief', 'Consistency', 'Deliberative', 'Discipline', 'Focus', 'Responsibility', 'Restorative'],
  INFLUENCING: ['Activator', 'Command', 'Communication', 'Competition', 'Maximizer', 'Self-Assurance', 'Significance', 'Woo'],
  'RELATIONSHIP BUILDING': ['Adaptability', 'Connectedness', 'Developer', 'Empathy', 'Harmony', 'Includer', 'Individualization', 'Positivity', 'Relator'],
  'STRATEGIC THINKING': ['Analytical', 'Context', 'Futuristic', 'Ideation', 'Input', 'Intellection', 'Learner', 'Strategic']
} as const;

interface Ranking {
  rank: number;
  name: string;
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Add file upload endpoint for PDF strength rankings
  app.post("/api/upload-strength-rankings", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileBuffer = req.file.buffer;
      let rankings: Ranking[] = [];

      if (req.file.mimetype === 'application/pdf') {
        try {
          const pdfData = await pdfParse(fileBuffer);
          const text = pdfData.text;
          console.log('Raw PDF Text:', text);

          // Create a map of all valid strength names (case-insensitive)
          const validStrengths = Object.values(THEMES)
            .flat()
            .reduce<Record<string, string>>((acc, name) => {
              acc[name.toLowerCase()] = name;
              return acc;
            }, {});

          // Process text by sections
          const sections = text.split(/(?:YOUR TOP|SIGNATURE|EXECUTING|INFLUENCING|RELATIONSHIP BUILDING|STRATEGIC THINKING)/i);

          const foundRankings = new Map<number, string>();

          // Common patterns in CliftonStrengths reports
          const patterns = [
            /(\d+)\s*[.-]*\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)/i,  // "1. Learner" or "1 - Learner"
            /([A-Za-z]+(?:\s+[A-Za-z]+)*)\s*[-–]\s*(\d+)/i,  // "Learner - 1"
            /Theme\s*(\d+)\s*[-–]\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)/i,  // "Theme 1 - Learner"
            /(\d+)\s*\.\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)/i,  // "1. Learner"
            /([A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)/i,  // "Learner 1"
            /Your #(\d+) theme is ([A-Za-z]+(?:\s+[A-Za-z]+)*)/i,  // "Your #1 theme is Learner"
            /Theme (\d+): ([A-Za-z]+(?:\s+[A-Za-z]+)*)/i,  // "Theme 1: Learner"
            /(\d+)[.:]?\s*([A-Za-z]+(?:\s+[A-Za-z]+)*)/i  // "1:Learner" or "1.Learner"
          ];

          // Process each section of the text
          for (const section of sections) {
            const lines = section.split(/[\n\r]+/).map(line => line.trim());

            for (const line of lines) {
              if (!line) continue;

              console.log('Processing line:', line);

              for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                  let rankStr: string;
                  let nameStr: string;

                  // Handle different patterns
                  if (pattern.toString().includes('Theme')) {
                    rankStr = match[1];
                    nameStr = match[2];
                  } else if (pattern.toString().startsWith('/([A-Za-z]+')) {
                    nameStr = match[1];
                    rankStr = match[2];
                  } else {
                    rankStr = match[1];
                    nameStr = match[2];
                  }

                  const rank = parseInt(rankStr, 10);
                  const name = nameStr.trim();
                  const strengthNameLower = name.toLowerCase();

                  // Check if this is a valid strength name
                  const originalName = validStrengths[strengthNameLower];

                  if (originalName && rank >= 1 && rank <= 34 && !foundRankings.has(rank)) {
                    foundRankings.set(rank, originalName);
                    console.log(`Found ranking: ${rank} - ${originalName}`);
                    break;
                  }
                }
              }
            }
          }

          // Convert rankings to array format
          rankings = Array.from(foundRankings.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([rank, name]) => ({
              rank,
              name
            }));

          console.log('Final rankings:', rankings);

          if (rankings.length === 0) {
            throw new Error('No valid rankings found in PDF');
          }
        } catch (error) {
          console.error('PDF parsing error:', error);
          throw new Error('Failed to parse PDF file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        }
      }

      res.json({ rankings });
    } catch (error) {
      console.error('File processing error:', error);
      res.status(500).json({ 
        message: "Failed to process file", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

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
        details: (error as Error).message 
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

  // Update the checkout route with proper URL handling
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

      // Construct absolute URLs for success and cancel
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
        details: (error as Error).message 
      });
    }
  });

  // Keep raw body for Stripe webhook verification
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
      res.status(400).json({ message: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to determine strength category
function getStrengthCategory(strengthName: string): string {
  for (const [category, themes] of Object.entries(THEMES)) {
    if ((themes as readonly string[]).includes(strengthName)) {
      return category;
    }
  }
  return 'UNKNOWN';
}