import { ApolloServer } from '@apollo/server'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { generateAnonId, generateRandomColor } from '../session'

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})

export function createApolloServer() {
  return new ApolloServer({
    schema,
  })
}

export function initializeSession(session: any) {
  if (!session.anonId) {
    session.anonId = generateAnonId()
    session.anonTextColor = generateRandomColor()
    session.anonTextBackground = generateRandomColor()
  }
}

