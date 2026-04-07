import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { setupGoogleResources } from "@/lib/google";

async function refreshAccessToken(token: {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  sheetId?: string;
  tasksListId?: string;
  error?: string;
  [key: string]: unknown;
}) {
  try {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken as string,
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const refreshed = await res.json();
    if (!res.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      // Keep existing refresh token if a new one wasn't provided
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive",
            "https://www.googleapis.com/auth/tasks",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in — account is present
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        // First-time setup: create Sheet + Tasks list
        if (!token.sheetId) {
          try {
            const { sheetId, tasksListId } = await setupGoogleResources(
              account.access_token!
            );
            token.sheetId = sheetId;
            token.tasksListId = tasksListId;
          } catch (err) {
            console.error("Google setup failed:", err);
          }
        }

        return token;
      }

      // Token still valid
      if (Date.now() < (token.expiresAt as number) * 1000 - 60_000) {
        return token;
      }

      // Refresh expired token
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.sheetId = token.sheetId as string;
      session.tasksListId = token.tasksListId as string;
      session.error = token.error as string | undefined;
      return session;
    },
  },

  pages: {
    signIn: "/signin",
  },
});
