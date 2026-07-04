import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
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

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
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
          } as any;
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret-key",
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
        token.avatar = (user as any).avatar;
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
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
};

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
