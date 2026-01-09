import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'

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

