import { SignJWT, jwtVerify } from "jose";

// No fallback: a hardcoded default secret would let anyone forge tokens.
// Resolved lazily so a missing var fails the request, not the build.
function getSecret() {
  const raw = process.env.NEXTAUTH_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("NEXTAUTH_SECRET must be set (16+ chars) to sign mobile JWTs");
  }
  return new TextEncoder().encode(raw);
}

const ALG = "HS256";
const ISSUER = "dietbuddy";
const EXPIRATION = "90d"; // 90 days

export interface JwtPayload {
  sub: string; // userId
  email: string;
}

export async function signMobileJwt(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .sign(getSecret());
}

export async function verifyMobileJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret(), {
    issuer: ISSUER,
  });
  return {
    sub: payload.sub as string,
    email: payload.email as string,
  };
}
