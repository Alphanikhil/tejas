import { InsertMessage, InsertPost, Message, Post, User, InsertUser, LoginCredentials } from "@shared/schema";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import slugify from "slugify";

// Configure Cloudinary with the credentials from the .env file
cloudinary.config({
  cloud_name: 'dyoo3p50k',
  api_key: '549325776547827',
  api_secret: 'Zq6PZ56pNhCmssVPuMukPwzyUr8',
});

// MongoDB Schemas
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://squizzy143:8Y8RtvZlsI4qr49C@nikhil2.gt73u.mongodb.net/?retryWrites=true&w=majority&appName=nikhil2");
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

// Post Schema
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, required: true },
  content: { type: Object, required: true },
  featuredImage: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Message Schema
const MessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Models
const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
const PostModel = mongoose.models.Post || mongoose.model("Post", PostSchema);
const MessageModel = mongoose.models.Message || mongoose.model("Message", MessageSchema);

export interface IStorage {
  // User operations
  createUser(userData: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  login(credentials: LoginCredentials): Promise<{ user: User; token: string } | null>;
  validateToken(token: string): Promise<User | null>;
  
  // Post operations
  createPost(postData: InsertPost): Promise<Post>;
  getAllPosts(): Promise<Post[]>;
  getPostBySlug(slug: string): Promise<Post | null>;
  getPostById(id: number | string): Promise<Post | null>;
  updatePost(id: number | string, postData: Partial<InsertPost>): Promise<Post | null>;
  deletePost(id: number | string): Promise<boolean>;
  
  // Image upload
  uploadImage(file: any): Promise<string>;
  
  // Contact messages
  saveContactMessage(messageData: InsertMessage): Promise<Message>;
}

export class MongoDBStorage implements IStorage {
  constructor() {
    connectDB();
    this.initializeAdmin();
  }

  // Initialize admin user if doesn't exist
  async initializeAdmin() {
    try {
      const adminExists = await UserModel.findOne({ email: "tejash@gmail.com" });
      if (!adminExists) {
        const hashedPassword = await bcrypt.hash("tejash@123", 10);
        await UserModel.create({
          username: "tejash",
          email: "tejash@gmail.com",
          password: hashedPassword
        });
        console.log("Admin user created");
      }
    } catch (error) {
      console.error("Error initializing admin:", error);
    }
  }

  // User operations
  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = await UserModel.create({
      ...userData,
      password: hashedPassword
    });
    return this.mapUserToType(user);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await UserModel.findOne({ email });
    return user ? this.mapUserToType(user) : null;
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string } | null> {
    const user = await UserModel.findOne({ email: credentials.email });
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    if (!isPasswordValid) return null;

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.SECRET_KEY_ACCESS_TOKEN as string,
      { expiresIn: "7d" }
    );

    return { user: this.mapUserToType(user), token };
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN as string) as { id: string };
      const user = await UserModel.findById(decoded.id);
      return user ? this.mapUserToType(user) : null;
    } catch (error) {
      return null;
    }
  }

  // Post operations
  async createPost(postData: InsertPost): Promise<Post> {
    let slug = slugify(postData.title, { lower: true });
    
    // Check if slug exists, if it does, append a random string
    const existingPost = await PostModel.findOne({ slug });
    if (existingPost) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }
    
    const post = await PostModel.create({
      ...postData,
      slug
    });
    
    return this.mapPostToType(post);
  }

  async getAllPosts(): Promise<Post[]> {
    const posts = await PostModel.find().sort({ createdAt: -1 });
    return posts.map(post => this.mapPostToType(post));
  }

  async getPostBySlug(slug: string): Promise<Post | null> {
    const post = await PostModel.findOne({ slug });
    return post ? this.mapPostToType(post) : null;
  }
  
  async getPostById(id: number | string): Promise<Post | null> {
    try {
      console.log("Getting post by ID:", id);
      const post = await PostModel.findById(id);
      return post ? this.mapPostToType(post) : null;
    } catch (error) {
      console.error("Error getting post by ID:", error);
      return null;
    }
  }

  async updatePost(id: number | string, postData: Partial<InsertPost>): Promise<Post | null> {
    try {
      console.log("Updating post with ID:", id, "Data:", postData);
      
      const post = await PostModel.findByIdAndUpdate(
        id,
        { ...postData, updatedAt: new Date() },
        { new: true }
      );
      
      console.log("Update result:", post);
      return post ? this.mapPostToType(post) : null;
    } catch (error) {
      console.error("Error updating post:", error);
      return null;
    }
  }

  async deletePost(id: any): Promise<boolean> {
    try {
      console.log("Storage: Deleting post with ID:", id);
      
      // If it's a MongoDB ID, use it directly
      const result = await PostModel.findByIdAndDelete(id);
      
      console.log("Delete result:", result);
      return !!result;
    } catch (error) {
      console.error("Error deleting post:", error);
      return false;
    }
  }

  // Image upload
  async uploadImage(file: any): Promise<string> {
    try {
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: "blog" }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }).end(file.buffer);
      });
      
      return result.secure_url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image");
    }
  }

  // Contact messages
  async saveContactMessage(messageData: InsertMessage): Promise<Message> {
    const message = await MessageModel.create(messageData);
    return this.mapMessageToType(message);
  }

  // Helper methods to map MongoDB documents to our types
  private mapUserToType(user: any): User {
    return {
      id: user._id,
      username: user.username,
      email: user.email,
      password: user.password
    };
  }

  private mapPostToType(post: any): Post {
    return {
      id: post._id.toString(), // Convert MongoDB ObjectId to string for consistent handling
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      featuredImage: post.featuredImage || null, // Ensure featuredImage is never undefined
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    };
  }

  private mapMessageToType(message: any): Message {
    return {
      id: message._id,
      name: message.name,
      email: message.email,
      subject: message.subject,
      message: message.message,
      createdAt: message.createdAt
    };
  }
}

// Use in-memory storage as a fallback for development
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private posts: Map<number, Post>;
  private messages: Map<number, Message>;
  private currentUserId: number;
  private currentPostId: number;
  private currentMessageId: number;

  constructor() {
    this.users = new Map();
    this.posts = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentPostId = 1;
    this.currentMessageId = 1;
    
    // Initialize with admin user
    const adminUser = {
      id: this.currentUserId++,
      username: "tejash",
      email: "tejash@gmail.com",
      password: bcrypt.hashSync("tejash@123", 10)
    };
    this.users.set(adminUser.id, adminUser);

    // Initialize with sample posts
    const samplePosts = [
      {
        id: this.currentPostId++,
        title: "Getting Started with Web Development",
        slug: "getting-started-with-web-development",
        excerpt: "A comprehensive guide for beginners who want to start their journey in web development. Learn about HTML, CSS, and JavaScript fundamentals.",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Sample content for the first blog post." }] }] },
        featuredImage: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=350&q=80",
        createdAt: new Date("2023-06-12"),
        updatedAt: new Date("2023-06-12")
      },
      {
        id: this.currentPostId++,
        title: "10 Tips for Better JavaScript Code",
        slug: "10-tips-for-better-javascript-code",
        excerpt: "Improve your JavaScript skills with these essential tips that will help you write cleaner, more efficient, and maintainable code for your projects.",
        content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Sample content for the second blog post." }] }] },
        featuredImage: "https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=350&q=80",
        createdAt: new Date("2023-05-28"),
        updatedAt: new Date("2023-05-28")
      }
    ];
    
    samplePosts.forEach(post => this.posts.set(post.id, post));
  }

  // User operations
  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const id = this.currentUserId++;
    const user = { ...userData, id, password: hashedPassword };
    this.users.set(id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = Array.from(this.users.values()).find(user => user.email === email);
    return user || null;
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string } | null> {
    const user = await this.getUserByEmail(credentials.email);
    if (!user) return null;

    const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
    if (!isPasswordValid) return null;

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.SECRET_KEY_ACCESS_TOKEN || "dev-secret",
      { expiresIn: "7d" }
    );

    return { user, token };
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN || "dev-secret") as { id: number };
      return this.users.get(decoded.id) || null;
    } catch (error) {
      return null;
    }
  }

  // Post operations
  async createPost(postData: InsertPost): Promise<Post> {
    const id = this.currentPostId++;
    const now = new Date();
    
    let slug = slugify(postData.title, { lower: true });
    if (Array.from(this.posts.values()).some(post => post.slug === slug)) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }
    
    const post: Post = {
      ...postData,
      id,
      slug,
      createdAt: now,
      updatedAt: now
    };
    
    this.posts.set(id, post);
    return post;
  }

  async getAllPosts(): Promise<Post[]> {
    return Array.from(this.posts.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getPostBySlug(slug: string): Promise<Post | null> {
    const post = Array.from(this.posts.values()).find(post => post.slug === slug);
    return post || null;
  }
  
  async getPostById(id: number): Promise<Post | null> {
    return this.posts.get(id) || null;
  }

  async updatePost(id: number, postData: Partial<InsertPost>): Promise<Post | null> {
    const post = this.posts.get(id);
    if (!post) return null;

    const updatedPost = {
      ...post,
      ...postData,
      updatedAt: new Date()
    };
    
    this.posts.set(id, updatedPost);
    return updatedPost;
  }

  async deletePost(id: number): Promise<boolean> {
    return this.posts.delete(id);
  }

  // Mock image upload for development
  async uploadImage(file: any): Promise<string> {
    // In memory storage, we'll just return a placeholder image URL
    return "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=350&q=80";
  }

  // Contact messages
  async saveContactMessage(messageData: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message = {
      ...messageData,
      id,
      createdAt: new Date()
    };
    
    this.messages.set(id, message);
    return message;
  }
}

// Decide which storage implementation to use based on environment
export const storage = process.env.MONGODB_URI 
  ? new MongoDBStorage() 
  : new MemStorage();
