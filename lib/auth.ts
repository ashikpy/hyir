import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
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
