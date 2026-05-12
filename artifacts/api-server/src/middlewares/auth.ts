import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createHash } from "crypto";

export interface AuthPayload {
  sub: string;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  auth?: AuthPayload;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function signJwt(payload: AuthPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header missing or malformed" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}
