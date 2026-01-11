import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import session from 'express-session'
import ConnectPgSimple from 'connect-pg-simple'

export interface AuthPayload {
  userId: number
  iat?: number
  exp?: number
}

export interface AnonymousData {
  anonId: string
  anonTextColor: string
  anonTextBackground: string
}

// Generate random alphanumeric ID
export function generateAnonId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Generate random color
export function generateRandomColor(): string {
  const r = Math.floor(Math.random() * 256)
  const g = Math.floor(Math.random() * 256)
  const b = Math.floor(Math.random() * 256)
  return `rgb(${r}, ${g}, ${b})`
}

// JWT token functions
export function signJWT(payload: AuthPayload): string {
  const secret = process.env.JWT_SECRET || 'feednana-jwt-secret-key-change-me'
  return jwt.sign(payload, secret, { expiresIn: '30d' })
}

export function verifyJWT(token: string): AuthPayload | null {
  try {
    const secret = process.env.JWT_SECRET || 'feednana-jwt-secret-key-change-me'
    return jwt.verify(token, secret) as AuthPayload
  } catch (error) {
    return null
  }
}

// Create session middleware for production server
export function createSessionMiddleware() {
  const PgSession = ConnectPgSimple(session)

  return session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'feednana-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
}

