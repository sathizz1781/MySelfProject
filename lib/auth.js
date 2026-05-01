import jwt from 'jsonwebtoken';
import cookie from 'cookie';

const TOKEN_COOKIE = 'auth_token';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not defined. Add it to your Vercel environment variables.');
  return secret;
}

/** Sign a JWT and return it */
export function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '7d' });
}

/** Verify a JWT — returns decoded payload or null */
export function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

/** Set the auth cookie on a response */
export function setAuthCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  );
}

/** Clear the auth cookie */
export function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize(TOKEN_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })
  );
}

/** Extract and verify the token from an incoming request */
export function getAuthUser(req) {
  const cookies = cookie.parse(req.headers.cookie || '');
  const token = cookies[TOKEN_COOKIE];
  if (!token) return null;
  return verifyToken(token);
}
