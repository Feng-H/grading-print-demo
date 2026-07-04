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

// 生成默认AUTH_SECRET用于开发，生产环境必须配置环境变量
const NEXTAUTH_SECRET = process.env.AUTH_SECRET || "dev-insecure-secret-change-this-in-production-please";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
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

          // TODO: 数据库连通后替换为prisma查询
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
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7天
  },
  secret: NEXTAUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
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
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.avatar = token.avatar as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // 确保重定向只到同源URL，防止开放重定向
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
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
