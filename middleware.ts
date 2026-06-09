export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/sync/:path*", // Protect API routes if needed, though they might need separate token verification
  ],
};
