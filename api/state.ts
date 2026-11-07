import { get, put } from '@vercel/blob'
import type { IncomingMessage, ServerResponse } from 'node:http'

type RequestWithBody = IncomingMessage & { body?: unknown }

const BLOB_PATH = 'finblok/state.json'

function isStatePayload(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.settings === 'object' && row.settings !== null && typeof row.stages === 'object' && row.stages !== null
}

function allow(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

async function readPayload(req: RequestWithBody): Promise<unknown> {
  if (typeof req.body === 'string' && req.body.length > 0) return JSON.parse(req.body) as unknown
  if (req.body && typeof req.body === 'object') return req.body
  const text = await readBody(req)
  return JSON.parse(text) as unknown
}

export default async function handler(req: RequestWithBody, res: ServerResponse) {
  allow(res)
  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204
      res.end()
      return
    }
    if (req.method === 'GET') {
      const stored = await get(BLOB_PATH, { access: 'private', useCache: false })
      if (!stored || stored.statusCode !== 200 || !stored.stream) {
        res.statusCode = 204
        res.end()
        return
      }
      const text = await new Response(stored.stream).text()
      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(text)
      return
    }
    if (req.method === 'PUT') {
      const parsed = await readPayload(req)
      const text = JSON.stringify(parsed)
      if (text.length > 1_000_000) {
        res.statusCode = 413
        res.end('Слишком большой файл')
        return
      }
      if (!isStatePayload(parsed)) {
        res.statusCode = 400
        res.end('Некорректные данные')
        return
      }
      await put(BLOB_PATH, text, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 60,
      })
      res.statusCode = 204
      res.end()
      return
    }
    res.statusCode = 405
    res.end()
  } catch {
    res.statusCode = 500
    res.end('Не удалось обратиться к общему сохранению')
  }
}
