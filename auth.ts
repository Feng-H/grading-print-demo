import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@/types";

// 预设演示账号
const DEMO_USERS = [
  {
    id: "demo-teacher",
    username: "teacher",
    password: "123456",
    name: "李老师",
    role: "teacher" as UserRole,
    avatar: "👩‍🏫",
  },
  {
    id: "demo-parent",
    username: "parent",
    password: "123456",
    name: "张明爸爸",
    role: "parent" as UserRole,
    avatar: "👨",
  },
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            return null;
          }

          const username = String(credentials.username).trim();
          const password = String(credentials.password).trim();

          const user = DEMO_USERS.find(
            (u) => u.username === username && u.password === password
          );

          if (user) {
            return {
              id: user.id,
              name: user.name,
              email: `${user.username}@local`,
              role: user.role,
              avatar: user.avatar,
            };
          }

          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET || "dev-secret-key-for-demo-only-please-change-in-production",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.avatar = user.avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).avatar = token.avatar;
      }
      return session;
    },
  },
});

// 扩展类型
declare module "next-auth" {
  interface User {
    role: UserRole;
    avatar: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      avatar: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    id: string;
    avatar: string;
  }
}
