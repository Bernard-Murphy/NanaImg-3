import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { NextRequest, NextResponse } from 'next/server'
import { createApolloServer } from '@/lib/graphql/apollo-server'
import { verifyJWT, generateAnonId, generateRandomColor, AuthPayload, AnonymousData } from '@/lib/session'

const server = createApolloServer()

const apolloHandlerPromise = startServerAndCreateNextHandler(server, {
  context: async (req) => {
    // Extract JWT token from Authorization header or cookie
    const headers = req.headers as any
    const authHeader = headers.get?.('authorization') || headers.authorization
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
      const cookieHeader = headers.get?.('cookie')
      const match = cookieHeader?.match(/auth-token=([^;]+)/)
      token = match ? match[1] : null
    }
    const user = token ? verifyJWT(token) : null

    // Generate anonymous data for non-authenticated users
    const anonData: AnonymousData = {
      anonId: generateAnonId(),
      anonTextColor: generateRandomColor(),
      anonTextBackground: generateRandomColor(),
    }

    return {
      req,
      user,
      anonData,
    }
  },
})

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const apolloHandler = await apolloHandlerPromise
    const response = await apolloHandler(req)

    // Create NextResponse from the Apollo response
    const responseBody = await response.text()
    const newResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })

    return newResponse
  } catch (error) {
    console.error('Apollo handler error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handler(request)
}

export async function POST(request: NextRequest) {
  return handler(request)
}

