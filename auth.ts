import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { UserRole } from "@/types";

// 预设演示账号 - 后续连接数据库后替换为数据库查询
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
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = credentials.username as string;
        const password = credentials.password as string;

        // TODO: 数据库连通后替换为prisma.user.findUnique查询
        const user = DEMO_USERS.find(
          (u) => u.username === username && u.password === password
        );

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: `${user.username}@demo.com`,
            role: user.role,
            avatar: user.avatar,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as UserRole;
        token.id = user.id;
        token.avatar = user.avatar as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).avatar = token.avatar;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || "dev-secret-change-me-in-production",
});

// 扩展NextAuth类型定义
declare module "next-auth" {
  interface User {
    role: UserRole;
    avatar: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      avatar: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: UserRole;
    id: string;
    avatar: string;
  }
}
