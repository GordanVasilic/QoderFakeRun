import { db } from './prisma';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

// Constants
const JWT_SECRET = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

// Types
export interface UserSession {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  role: string;
  tokenBalance: number;
  isPublic?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export const authService = {
  // Hash a password before storing
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  // Verify a password against a hash
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  // Generate a JWT token
  generateToken(user: UserSession): string {
    return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  },

  // Verify a JWT token
  verifyToken(token: string): UserSession | null {
    try {
      console.log('🔍 verifyToken: Attempting to verify token...');
      console.log('🔑 verifyToken: JWT_SECRET exists:', !!JWT_SECRET);
      console.log('🔑 verifyToken: JWT_SECRET value:', JWT_SECRET);
      console.log('🎫 verifyToken: Token to verify:', token);
      const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
      console.log('✅ verifyToken: Token successfully verified for user:', decoded.email);
      return decoded;
    } catch (error) {
      console.error('❌ verifyToken error:', error);
      return null;
    }
  },

  // Register a new user
  async register(data: RegisterData): Promise<{ user: UserSession; token: string } | { error: string }> {
    try {
      // Check if user already exists
      const orConditions: Array<{ email: string } | { username: string }> = [{ email: data.email }];
      if (data.username) {
        orConditions.push({ username: data.username });
      }
      
      const existingUser = await db.user.findFirst({
        where: {
          OR: orConditions,
        },
      });

      if (existingUser) {
        return { error: 'User with this email or username already exists' };
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const user = await db.user.create({
        data: {
          email: data.email,
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          passwordHash,
          tokenBalance: 0, // Start with 0 tokens
          role: 'USER', // Default role
        },
      });

      // Generate token
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        username: user.username || undefined,
        role: user.role,
        tokenBalance: user.tokenBalance,
      });

      // Update last login
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return { 
        user: {
          id: user.id,
          email: user.email,
          username: user.username || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: user.role,
          tokenBalance: user.tokenBalance,
        }, 
        token 
      };
    } catch (error) {
      console.error('Registration error:', error);
      return { error: 'Failed to register user' };
    }
  },

  // Login a user
  async login(credentials: LoginCredentials): Promise<{ user: UserSession; token: string } | { error: string }> {
    try {
      // Find user by email
      const user = await db.user.findUnique({
        where: { email: credentials.email },
      });
      
      if (!user || !user.passwordHash) {
        return { error: 'Invalid email or password' };
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(
        credentials.password,
        user.passwordHash
      );
      
      if (!isPasswordValid) {
        return { error: 'Invalid email or password' };
      }

      // Generate token
      const token = this.generateToken({
        id: user.id,
        email: user.email,
        username: user.username || undefined,
        role: user.role,
        tokenBalance: user.tokenBalance,
      });

      // Update last login
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return { 
        user: {
          id: user.id,
          email: user.email,
          username: user.username || undefined,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: user.role,
          tokenBalance: user.tokenBalance,
        }, 
        token 
      };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Failed to login' };
    }
  },

  // Get user from token
  async getUserFromToken(token: string): Promise<UserSession | null> {
    try {
      console.log('🔍 getUserFromToken: Starting token verification...');
      const decoded = this.verifyToken(token);
      if (!decoded) {
        console.log('❌ getUserFromToken: Token verification failed');
        return null;
      }

      console.log('✅ getUserFromToken: Token verified, user ID:', decoded.id);
      
      // Admin bypass - use real admin user ID from database
      if (decoded.id === 'cmeu1kwjg0000w5zgh3xdrxma' && decoded.email === 'admin@qoderfakerun.com') {
        console.log('✅ getUserFromToken: Admin bypass activated');
        return {
          id: 'cmeu1kwjg0000w5zgh3xdrxma',
          email: 'admin@qoderfakerun.com',
          username: 'gogo',
          firstName: 'Admin',
          lastName: 'User',
          avatar: null,
          role: 'ADMIN',
          tokenBalance: 9999,
          isPublic: false
        };
      }
      
      const user = await db.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          tokenBalance: true,
          isPublic: true,
        },
      });

      if (user) {
        console.log('✅ getUserFromToken: User found in database:', user.email);
      } else {
        console.log('❌ getUserFromToken: User not found in database for ID:', decoded.id);
      }

      return user as UserSession;
    } catch (error) {
      console.error('❌ getUserFromToken error:', error);
      return null;
    }
  },

  // Initialize admin user if it doesn't exist
  async initAdminUser(): Promise<void> {
    try {
      const adminUser = await db.user.findFirst({
        where: { 
          OR: [
            { username: 'gogo' },
            { email: 'admin@qoderfakerun.com' }
          ],
          role: 'ADMIN'
        },
      });

      if (!adminUser) {
        const passwordHash = await this.hashPassword('gogo');
        await db.user.create({
          data: {
            email: 'admin@qoderfakerun.com',
            username: 'gogo',
            passwordHash,
            role: 'ADMIN',
            tokenBalance: 9999, // Admin has unlimited tokens essentially
          },
        });
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Failed to initialize admin user:', error);
    }
  },
};

// Helper middleware for API routes
export async function isAuthenticated(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  return await authService.getUserFromToken(token);
}

export async function isAdmin(request: Request) {
  const user = await isAuthenticated(request);
  return user && user.role === 'ADMIN' ? user : null;
}

// Initialize admin user on server start
authService.initAdminUser().catch(console.error);