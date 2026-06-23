import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initSocketServer } from './src/lib/socket/server'

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  initSocketServer(httpServer)

  httpServer
    .once('error', (err) => { console.error('[server] error:', err); process.exit(1) })
    .listen(port, () => {
      console.log(`[server] Ready on http://localhost:${port} (${dev ? 'dev' : 'prod'})`)
    })
})
