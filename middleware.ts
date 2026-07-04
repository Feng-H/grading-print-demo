import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isTeacherRoute = nextUrl.pathname.startsWith("/teacher");
  const isParentRoute = nextUrl.pathname.startsWith("/parent");
  const isLoginPage = nextUrl.pathname === "/login";
  const isPublicRoute = nextUrl.pathname === "/" || nextUrl.pathname.startsWith("/api/auth");
  const isApiRoute = nextUrl.pathname.startsWith("/api/");

  // API auth路由放行
  if (nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 公开路由放行
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // 已登录访问登录页，根据角色跳转
  if (isLoggedIn && isLoginPage) {
    if (userRole === "teacher") {
      return NextResponse.redirect(new URL("/teacher", nextUrl));
    }
    if (userRole === "parent") {
      return NextResponse.redirect(new URL("/parent", nextUrl));
    }
  }

  // 未登录访问受保护路由
  if (!isLoggedIn && (isTeacherRoute || isParentRoute || isLoginPage === false)) {
    // 非登录页且未登录，重定向到登录页
    if (isTeacherRoute || isParentRoute) {
      const callbackUrl = encodeURIComponent(nextUrl.pathname + nextUrl.search);
      return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl));
    }
  }

  // 角色不匹配跳转
  if (isLoggedIn) {
    if (isTeacherRoute && userRole !== "teacher") {
      return NextResponse.redirect(new URL("/parent", nextUrl));
    }
    if (isParentRoute && userRole !== "parent") {
      return NextResponse.redirect(new URL("/teacher", nextUrl));
    }
  }

  return NextResponse.next();
});

// 只匹配需要保护的路由，减少middleware执行
export const config = {
  matcher: [
    /*
     * 匹配所有路径除了：
     * - _next/static (静态资源)
     * - _next/image (图片优化)
     * - favicon.ico
     * - public文件夹
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
