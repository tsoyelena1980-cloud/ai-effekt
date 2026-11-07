import fs from 'node:fs'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

const stateFile = path.resolve('data/saved-state.json')

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function isStatePayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.settings === 'object' && row.settings !== null && typeof row.stages === 'object' && row.stages !== null
}

function attach(middlewares: Connect.Server) {
  middlewares.use(async (req, res, next) => {
    const url = req.url?.split('?')[0]
    if (url !== '/api/state') {
      next()
      return
    }
    try {
      if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'no-store')
        if (!fs.existsSync(stateFile)) {
          res.statusCode = 204
          res.end()
          return
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(fs.readFileSync(stateFile))
        return
      }
      if (req.method === 'PUT') {
        const text = await readBody(req)
        if (text.length > 1_000_000) {
          res.statusCode = 413
          res.end('Слишком большой файл')
          return
        }
        const parsed = JSON.parse(text) as unknown
        if (!isStatePayload(parsed)) {
          res.statusCode = 400
          res.end('Некорректные данные')
          return
        }
        fs.mkdirSync(path.dirname(stateFile), { recursive: true })
        fs.writeFileSync(stateFile, JSON.stringify(parsed))
        res.statusCode = 204
        res.end()
        return
      }
      res.statusCode = 405
      res.end()
    } catch {
      res.statusCode = 400
      res.end('Некорректные данные')
    }
  })
}

export function stateApiPlugin(): Plugin {
  return {
    name: 'shared-state-api',
    configureServer(server) {
      attach(server.middlewares)
    },
    configurePreviewServer(server) {
      attach(server.middlewares)
    },
  }
}
