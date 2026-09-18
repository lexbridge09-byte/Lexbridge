import jwt from 'jsonwebtoken';
import { JWT_SECRET, SESSION_COOKIE_NAME } from '../config/index.js';
import { UserModel } from '../models/index.js';

function readSession(req) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return { id: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Please sign in to continue' });
  req.user = session;
  next();
}

export function attachUserIfPresent(req, res, next) {
  req.user = readSession(req);
  next();
}

// Role is read from the DB, not the token, so demoting an admin takes effect immediately
export async function requireAdmin(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Please sign in to continue' });
  const user = await UserModel.findById(session.id).select('Role').lean();
  if (user?.Role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  req.user = { ...session, role: 'admin' };
  next();
}
