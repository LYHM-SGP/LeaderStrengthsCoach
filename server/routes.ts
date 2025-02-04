import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { strengths, coachingNotes, products, orders } from "@db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, handleWebhook } from "./stripe";
import express from 'express';
import multer from 'multer';

// Add new imports for LinkedIn OAuth
const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const LINKEDIN_REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://your-domain/api/linkedin/callback'
  : 'http://localhost:5000/api/linkedin/callback';

const upload = multer({ storage: multer.memoryStorage() });

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

  // Add LinkedIn OAuth routes
  app.get("/api/linkedin/auth", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const scope = encodeURIComponent('r_liteprofile r_emailaddress w_member_social');
    const state = Math.random().toString(36).substring(7);
    // Store state in session for validation
    req.session.linkedInState = state;

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&state=${state}&scope=${scope}`;

    res.json({ authUrl });
  });

  app.get("/api/linkedin/callback", async (req, res) => {
    const { code, state } = req.query;

    // Validate state to prevent CSRF
    if (state !== req.session.linkedInState) {
      return res.status(400).json({ error: "Invalid state parameter" });
    }

    try {
      // Exchange code for access token
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          client_id: LINKEDIN_CLIENT_ID!,
          client_secret: LINKEDIN_CLIENT_SECRET!,
          redirect_uri: LINKEDIN_REDIRECT_URI,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const data = await response.json();

      // Store the access token securely
      // In a production environment, you'd want to encrypt this
      req.session.linkedInToken = data.access_token;

      // Get user profile to store the LinkedIn user ID
      const profileResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error('Failed to fetch LinkedIn profile');
      }

      const profile = await profileResponse.json();
      req.session.linkedInUserId = profile.id;

      res.redirect('/resources');
    } catch (error) {
      console.error('LinkedIn OAuth error:', error);
      res.status(500).json({
        message: "LinkedIn authentication failed",
        details: (error as Error).message
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
        details: (error as Error).message 
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
      res.status(400).json({ message: (error as Error).message });
    }
  });

  // Update LinkedIn feed route to use stored token
  app.get("/api/linkedin-feed", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    if (!req.session.linkedInToken || !req.session.linkedInUserId) {
      return res.status(401).json({
        message: "LinkedIn authentication required",
        authUrl: "/api/linkedin/auth"
      });
    }

    try {
      const response = await fetch(
        `https://api.linkedin.com/v2/ugcPosts?q=authors&authors[0]=urn:li:person:${req.session.linkedInUserId}`,
        {
          headers: {
            'Authorization': `Bearer ${req.session.linkedInToken}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`LinkedIn API responded with ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('LinkedIn feed error:', error);
      res.status(500).json({
        message: "Failed to fetch LinkedIn feed",
        details: (error as Error).message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function getStrengthCategory(strengthName: string): string {
  for (const [category, themes] of Object.entries(THEMES)) {
    if ((themes as readonly string[]).includes(strengthName)) {
      return category;
    }
  }
  return 'UNKNOWN';
}