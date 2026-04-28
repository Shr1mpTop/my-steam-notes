import { defineConfig } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dashboardSource = resolve(rootDir, 'data/dashboard.json')

function dashboardDataPlugin(): Plugin {
  return {
    name: 'dashboard-data',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.split('?')[0].endsWith('/data/dashboard.json')) {
          next()
          return
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        res.end(readFileSync(dashboardSource, 'utf-8'))
      })
    },
    writeBundle() {
      const target = resolve(rootDir, 'web/dist/data/dashboard.json')
      mkdirSync(dirname(target), { recursive: true })
      copyFileSync(dashboardSource, target)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dashboardDataPlugin()],
  base: '/my-steam-notes/',
})
