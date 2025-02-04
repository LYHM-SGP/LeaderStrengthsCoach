import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { strengths, coachingNotes } from "@db/schema";
import { eq } from "drizzle-orm";

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

  const httpServer = createServer(app);
  return httpServer;
}
