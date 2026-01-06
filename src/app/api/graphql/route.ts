import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { NextRequest } from 'next/server'
import { createApolloServer } from '@/lib/graphql/apollo-server'
import { createSessionMiddleware } from '@/lib/session'
import { generateAnonId, generateRandomColor } from '@/lib/session'

// Local function to avoid import issues
function initializeSession(session: any) {
  if (!session.anonId) {
    session.anonId = generateAnonId()
    session.anonTextColor = generateRandomColor()
    session.anonTextBackground = generateRandomColor()
  }
}

const server = createApolloServer()
const sessionMiddleware = createSessionMiddleware()

// Start the server and create a single handler that gets reused
const apolloHandlerPromise = startServerAndCreateNextHandler(server, {
  context: async (req, res) => ({
    req,
    res,
    session: (req as any).session,
  }),
})

async function handler(req: NextRequest): Promise<Response> {
  // Handle session
  return new Promise(async (resolve) => {
    const mockReq = {
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url,
      method: req.method,
    } as any

    const mockRes = {
      setHeader: () => {},
      end: () => {},
      writeHead: () => {},
      write: () => {},
    } as any

    sessionMiddleware(mockReq, mockRes, async () => {
      // Initialize anon properties if they don't exist
      if (!mockReq.session.anonId) {
        mockReq.session.anonId = generateAnonId()
        mockReq.session.anonTextColor = generateRandomColor()
        mockReq.session.anonTextBackground = generateRandomColor()
      }

      // Add session to the request so context can access it
      (req as any).session = mockReq.session

      try {
        const apolloHandler = await apolloHandlerPromise
        const response = await apolloHandler(req)
        resolve(response as Response)
      } catch (error) {
        console.error('Apollo handler error:', error)
        resolve(new Response('Internal Server Error', { status: 500 }))
      }
    })
  })
}

export async function GET(request: NextRequest) {
  return handler(request)
}

export async function POST(request: NextRequest) {
  return handler(request)
}

