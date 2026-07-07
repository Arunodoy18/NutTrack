import { NextResponse } from "next/server";
import { verifyMobileJwt, JwtPayload } from "./jwt";

/**
 * Extracts and verifies the JWT from the Authorization header.
 * Returns the decoded payload { sub (userId), email } or a NextResponse error.
 */
export async function authenticateMobile(
  req: Request
): Promise<JwtPayload | NextResponse> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header" },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = await verifyMobileJwt(token);
    if (!payload.sub) {
      return NextResponse.json(
        { error: "Invalid token: missing user ID" },
        { status: 401 }
      );
    }
    return payload;
  } catch (err: any) {
    console.error("Mobile auth error:", err.message);
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}

/**
 * Type guard: returns true if the result is a valid JwtPayload (not an error response).
 */
export function isAuthenticated(
  result: JwtPayload | NextResponse
): result is JwtPayload {
  return !(result instanceof NextResponse);
}
