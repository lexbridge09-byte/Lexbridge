import jwt from 'jsonwebtoken';
import { JWT_SECRET, SESSION_COOKIE_NAME } from '../config/index.js';
import { STAFF_ROLES, UserModel } from '../models/index.js';

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

/*
  Role is read from the DB, not the token, so a role change takes effect on the very next request.
  Gate layers: requireOwner ⊃ requireManager (owner) ⊃ requireStaff (manager/owner/lawyer).
*/
async function loadRole(req) {
  const session = readSession(req);
  if (!session) return { error: 401 };
  const user = await UserModel.findById(session.id).select('Role').lean();
  return { session, role: user?.Role };
}

function requireAny(...allowedRoles) {
  return async (req, res, next) => {
    const { error, session, role } = await loadRole(req);
    if (error === 401) return res.status(401).json({ error: 'Please sign in to continue' });
    if (!allowedRoles.includes(role)) return res.status(403).json({ error: 'You do not have access to this area' });
    req.user = { ...session, role };
    next();
  };
}

export const requireOwner = requireAny('owner');
export const requireManager = requireAny('owner', 'manager');
export const requireStaff = requireAny(...STAFF_ROLES);
