import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcrypt";
import { prisma } from "./prisma";

// Import the Role type from your Prisma client
import type { Role } from '@prisma/client';

// Define the base URL for the application
const getBaseUrl = () => {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-here",
  theme: {
    colorScheme: "light",
  },
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/error",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl = getBaseUrl() }) {
      // Handle relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Handle absolute URLs
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) return url;
      } catch (e) {
        // Invalid URL, return base URL
      }
      return baseUrl;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        console.log('JWT Callback - Initial sign in:', { userId: user.id, role: user.role });
        return {
          ...token,
          id: user.id,
          role: user.role as Role,
        };
      }
      return token;
    },
  },
};
