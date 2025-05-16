import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertPostSchema, insertMessageSchema } from "@shared/schema";
import multer from "multer";
import jwt from "jsonwebtoken";

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Middleware to verify authentication
const authenticate = async (req: Request, res: Response, next: Function) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.validateToken(token);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Authentication failed" });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await storage.login(validatedData);
      
      if (!result) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const { user, token } = result;
      
      // Don't return the password in the response
      const { password, ...userWithoutPassword } = user;
      
      res.json({
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ message: "Invalid login request" });
    }
  });

  app.get("/api/auth/user", authenticate, (req: Request, res: Response) => {
    // The user has already been authenticated by the middleware
    const { password, ...userWithoutPassword } = (req as any).user;
    res.json({ user: userWithoutPassword });
  });

  // Blog post routes
  app.get("/api/posts", async (_req: Request, res: Response) => {
    try {
      const posts = await storage.getAllPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Error fetching posts" });
    }
  });

  app.get("/api/posts/:slug", async (req: Request, res: Response) => {
    try {
      // Check if the slug is a number (post ID) or a string (slug)
      const isId = !isNaN(Number(req.params.slug));
      let post;
      
      if (isId) {
        // This is for edit functionality - get post by ID
        post = await storage.getPostById(Number(req.params.slug));
      } else {
        // Normal case - get post by slug
        post = await storage.getPostBySlug(req.params.slug);
      }
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("Error fetching post:", error);
      res.status(500).json({ message: "Error fetching post" });
    }
  });

  app.post("/api/posts", authenticate, async (req: Request, res: Response) => {
    try {
      const validatedData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(validatedData);
      res.status(201).json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(400).json({ message: "Invalid post data" });
    }
  });

  app.put("/api/posts/:id", authenticate, async (req: Request, res: Response) => {
    try {
      console.log("Updating post from API with ID:", req.params.id);
      console.log("Update payload:", req.body);
      
      const validatedData = insertPostSchema.partial().parse(req.body);
      
      // Use ID directly for MongoDB compatibility
      const post = await storage.updatePost(req.params.id, validatedData);
      
      if (!post) {
        console.log("Post not found for update");
        return res.status(404).json({ message: "Post not found" });
      }
      
      console.log("Post updated successfully");
      res.json(post);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(400).json({ message: "Invalid post data" });
    }
  });

  app.delete("/api/posts/:id", authenticate, async (req: Request, res: Response) => {
    try {
      console.log("Deleting post with ID:", req.params.id);
      
      // Try both parsing as number and using as string for MongoDB compatibility
      const postId = req.params.id;
      const result = await storage.deletePost(postId);
      
      if (!result) {
        console.log("Post not found for deletion");
        return res.status(404).json({ message: "Post not found" });
      }
      
      console.log("Post successfully deleted");
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Error deleting post" });
    }
  });

  // Image upload route
  app.post("/api/upload", authenticate, upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      const imageUrl = await storage.uploadImage(req.file);
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Error uploading image" });
    }
  });

  // Contact message route
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const validatedData = insertMessageSchema.parse(req.body);
      const message = await storage.saveContactMessage(validatedData);
      res.status(201).json({ success: true, message });
    } catch (error) {
      console.error("Error saving contact message:", error);
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
