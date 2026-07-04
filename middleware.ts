import { auth } from "@/../auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isTeacherRoute = nextUrl.pathname.startsWith("/teacher");
  const isParentRoute = nextUrl.pathname.startsWith("/parent");
  const isLoginPage = nextUrl.pathname === "/login";
  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute = nextUrl.pathname === "/";

  // API认证路由放行
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // 已登录访问登录页，根据角色跳转到对应首页
  if (isLoggedIn && isLoginPage) {
    if (userRole === "teacher") {
      return NextResponse.redirect(new URL("/teacher", nextUrl));
    } else if (userRole === "parent") {
      return NextResponse.redirect(new URL("/parent", nextUrl));
    }
  }

  // 未登录访问受保护路由，跳转到登录页
  if (!isLoggedIn && (isTeacherRoute || isParentRoute)) {
    let callbackUrl = nextUrl.pathname;
    if (nextUrl.search) {
      callbackUrl += nextUrl.search;
    }
    const encodedCallbackUrl = encodeURIComponent(callbackUrl);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallbackUrl}`, nextUrl));
  }

  // 已登录，角色不匹配时跳转到对应角色首页
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

export const config = {
  matcher: [
    "/login",
    "/teacher/:path*",
    "/parent/:path*",
  ],
};
