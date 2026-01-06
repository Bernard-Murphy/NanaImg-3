import session from 'express-session'
import connectPgSimple from 'connect-pg-simple'
import { randomBytes } from 'crypto'

const PgSession = connectPgSimple(session)

export interface SessionData {
  userId?: number
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

export function createSessionStore() {
  return new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: false,
  })
}

export function createSessionMiddleware() {
  return session({
    store: createSessionStore(),
    secret: process.env.SESSION_SECRET || 'feednana-secret-key-change-me',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    },
  })
}

