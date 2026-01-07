const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const { useServer } = require('graphql-ws/lib/use/ws');
const { schema } = require('./src/lib/graphql/apollo-server');
const { createSessionMiddleware } = require('./src/lib/session');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  // Create WebSocket server for GraphQL subscriptions
  const wss = new WebSocketServer({
    server,
    path: '/api/graphql',
  });

  // Create session middleware for WebSocket connections
  const sessionMiddleware = createSessionMiddleware();

  useServer(
    {
      schema,
      context: (ctx) => {
        // WebSocket context with session
        return {
          req: ctx.extra.request,
          session: ctx.extra.session || {},
        };
      },
      onConnect: async (ctx) => {
        // Handle session for WebSocket connections
        return new Promise((resolve, reject) => {
          const mockReq = {
            headers: ctx.extra.request.headers,
            url: ctx.extra.request.url,
            method: ctx.extra.request.method,
          };

          const mockRes = {
            setHeader: () => {},
            end: () => {},
            writeHead: () => {},
            write: () => {},
          };

          sessionMiddleware(mockReq, mockRes, () => {
            ctx.extra.session = mockReq.session;
            resolve();
          });
        });
      },
    },
    wss
  );

  const port = process.env.PORT || 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
}).catch((ex) => {
  console.error(ex.stack);
  process.exit(1);
});
