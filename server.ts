import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initSocketServer } from './src/lib/socket/server'

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Request handling error:', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  await initSocketServer(httpServer)

  httpServer
    .once('error', (err) => { console.error('Server error:', err); process.exit(1) })
    .listen(port, () => {
      console.log(`\n🚀 Nexus ready on http://${dev ? 'localhost' : hostname}:${port}\n`)
    })
})
