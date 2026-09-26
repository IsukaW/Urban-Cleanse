import { createHash } from 'node:crypto' //V07
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ServerResponse } from 'node:http'
import type { Plugin, ViteDevServer } from 'vite'

// V07 - security headers for the frontend
// dev server (5173) and `vite preview` (4173) get real response headers.
// the production build also gets the CSP as a <meta> tag in index.html so it
// still applies wherever dist/ ends up hosted. X-Frame-Options, nosniff and
// frame-ancestors can't be set from a meta tag, the host has to send those.

// same fallback as src/services/api.ts uses when VITE_API_URL isn't set
const DEFAULT_API_URL = 'http://localhost:5001/api'
const GOOGLE_SIGN_IN = 'https://accounts.google.com/gsi/'

const apiOriginFrom = (apiUrl?: string) => {
  try {
    return new URL(apiUrl || DEFAULT_API_URL).origin
  } catch {
    // relative url like "/api" is same origin, 'self' already covers it
    return undefined
  }
}

interface CspOptions {
  apiUrl?: string
  // dev only: hashes for the inline scripts vite adds + the HMR websocket
  devScriptHashes?: string[]
  hmrOrigin?: string
  // browsers ignore frame-ancestors in a <meta> CSP (and warn about it)
  forMetaTag?: boolean
}

export const buildCsp = ({ apiUrl, devScriptHashes = [], hmrOrigin, forMetaTag = false }: CspOptions) => {
  const apiOrigin = apiOriginFrom(apiUrl)
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // our bundle + the google sign-in script (OAuth/OIDC login). no inline scripts in the build
    'script-src': ["'self'", `${GOOGLE_SIGN_IN}client`, ...devScriptHashes.map((hash) => `'${hash}'`)],
    // had to keep unsafe-inline for styles only - react-hot-toast adds a <style> tag
    // at runtime and vite injects css as <style> tags in dev
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', `${GOOGLE_SIGN_IN}style`],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    // osm + esri map tiles, leaflet marker icons, and small assets vite inlines as data: urls
    'img-src': [
      "'self'",
      'data:',
      'https://*.tile.openstreetmap.org',
      'https://server.arcgisonline.com',
      'https://cdnjs.cloudflare.com',
      'https://raw.githubusercontent.com'
    ],
    // backend api, nominatim address lookup, google sign-in
    'connect-src': [
      "'self'",
      ...(apiOrigin ? [apiOrigin] : []),
      'https://nominatim.openstreetmap.org',
      GOOGLE_SIGN_IN,
      ...(hmrOrigin ? [hmrOrigin] : [])
    ],
    // osm map preview iframes + the google sign-in button iframe
    'frame-src': ['https://www.openstreetmap.org', GOOGLE_SIGN_IN],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"]
  }
  if (!forMetaTag) {
    directives['frame-ancestors'] = ["'none'"]
  }
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(' ')}`)
    .join('; ')
}

// no HSTS here on purpose, this is plain http on localhost
const setSecurityHeaders = (res: ServerResponse, csp: string) => {
  res.setHeader('Content-Security-Policy', csp)
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  // not no-referrer: osm tiles and google sign-in both need to see our origin
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
}

// sha256 of each inline <script> in the html vite serves in dev (the react refresh one)
const inlineScriptHashes = (html: string) =>
  [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attrs, body]) => !/\bsrc\s*=/i.test(attrs) && body.trim() !== '')
    .map(([, , body]) => `sha256-${createHash('sha256').update(body).digest('base64')}`)

const devInlineScriptHashes = async (server: ViteDevServer) => {
  const indexPath = resolve(server.config.root, 'index.html')
  const html = await server.transformIndexHtml('/', await readFile(indexPath, 'utf-8'))
  return inlineScriptHashes(html)
}

export const securityHeaders = (apiUrl?: string): Plugin => {
  let devHashes: Promise<string[]> | undefined

  return {
    name: 'urbancleanse-security-headers',

    configureServer(server) {
      // work the hashes out again if index.html gets edited while dev is running
      server.watcher.on('change', (file) => {
        if (file.endsWith('index.html')) devHashes = undefined
      })
      server.middlewares.use(async (req, res, next) => {
        try {
          devHashes ??= devInlineScriptHashes(server)
          const hmrOrigin = req.headers.host ? `ws://${req.headers.host}` : undefined
          setSecurityHeaders(res, buildCsp({ apiUrl, devScriptHashes: await devHashes, hmrOrigin }))
          next()
        } catch (err) {
          next(err)
        }
      })
    },

    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        setSecurityHeaders(res, buildCsp({ apiUrl }))
        next()
      })
    },

    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        // dev server already sends the header version
        if (ctx.server) return html
        const csp = buildCsp({ apiUrl, forMetaTag: true }).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
        const metaTags =
          `\n    <meta http-equiv="Content-Security-Policy" content="${csp}">` +
          '\n    <meta name="referrer" content="strict-origin-when-cross-origin">'
        // right after <meta charset> - the charset has to stay in the first 1024 bytes,
        // and the CSP has to come before any <script> for it to apply to them
        if (/<meta charset[^>]*>/i.test(html)) {
          return html.replace(/<meta charset[^>]*>/i, (charset) => charset + metaTags)
        }
        return html.replace(/<head[^>]*>/i, (head) => head + metaTags)
      }
    }
  }
}
