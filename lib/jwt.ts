import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-change-me"
);

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
    .sign(SECRET);
}

export async function verifyMobileJwt(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, SECRET, {
    issuer: ISSUER,
  });
  return {
    sub: payload.sub as string,
    email: payload.email as string,
  };
}
