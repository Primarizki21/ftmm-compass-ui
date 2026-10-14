import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import fs from "node:fs"

export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === "development"

  return {
    base: "/",
    build: {
      sourcemap: emitSourcemaps ? "inline" : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      react(),
      tailwindcss(),
      backendApiProxyPlugin(),
      assetCacheControlPlugin(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
      strictPort: true,
    },
    preview: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
    },
  }
})

/** Proxies /api requests to the backend with dynamic port detection from .backend-port */
function backendApiProxyPlugin(): Plugin {
  return {
    name: "backend-api-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api")) return next()

        let port = process.env.BACKEND_PORT || "8001"
        try {
          const portFile = path.resolve(import.meta.dirname, ".backend-port")
          if (!process.env.BACKEND_PORT && fs.existsSync(portFile)) {
            const savedPort = fs.readFileSync(portFile, "utf-8").trim()
            if (savedPort) port = savedPort
          }
        } catch {}

        const backendHost = process.env.BACKEND_HOST || "127.0.0.1"
        const targetUrl = `http://${backendHost}:${port}${req.url}`
        try {
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (v && k.toLowerCase() !== "host") {
              headers.set(k, Array.isArray(v) ? v.join(", ") : v)
            }
          }
          const init: RequestInit & { duplex?: "half" } = {
            method: req.method,
            headers,
            duplex: "half",
          }
          if (req.method !== "GET" && req.method !== "HEAD") {
            // Node IncomingMessage is accepted as fetch body stream at runtime
            init.body = (req as unknown as BodyInit)
          }
          const response = await fetch(targetUrl, init)
          res.statusCode = response.status
          response.headers.forEach((val, key) => res.setHeader(key, val))
          if (response.body) {
            const reader = response.body.getReader()
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              res.write(value)
            }
          }
          res.end()
        } catch (err: unknown) {
          res.statusCode = 502
          res.setHeader("Content-Type", "application/json")
          res.end(
            JSON.stringify({
              error: "Backend unavailable",
              detail: err instanceof Error ? err.message : String(err),
            }),
          )
        }
      })
    },
  }
}

/** Applies immutable cache headers to hashed static assets and no-cache to index.html in preview */
function assetCacheControlPlugin(): Plugin {
  return {
    name: "asset-cache-control",
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || ""
        if (url.match(/\.(webp|png|jpg|jpeg|svg|css|js|woff2?)$/)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
        } else if (url === "/" || url.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
        }
        next()
      })
    },
  }
}
