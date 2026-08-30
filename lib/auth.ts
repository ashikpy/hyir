import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://job.ashikpy.xyz",
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    "https://*.vercel.app",
  ].filter(Boolean) as string[],
  account: {
    accountLinking: {
      enabled: false,
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "dev-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dev-google-client-secret",
      scope: ["openid", "profile", "email", "https://www.googleapis.com/auth/calendar.events"],
      accessType: "offline",
      prompt: "consent",
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || "dev-linkedin-client-id",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "dev-linkedin-client-secret",
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
