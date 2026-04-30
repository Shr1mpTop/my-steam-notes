import { defineConfig } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dashboardSource = resolve(rootDir, 'data/dashboard.json')
const chartVendorPackages = [
  '/node_modules/recharts/',
  '/node_modules/@reduxjs/toolkit/',
  '/node_modules/react-redux/',
  '/node_modules/redux/',
  '/node_modules/immer/',
  '/node_modules/reselect/',
  '/node_modules/decimal.js-light/',
  '/node_modules/es-toolkit/',
  '/node_modules/d3-',
  '/node_modules/eventemitter3/',
  '/node_modules/use-sync-external-store/',
  '/node_modules/react-is/',
  '/node_modules/tiny-invariant/',
]

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
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          return chartVendorPackages.some((pkg) => id.includes(pkg)) ? 'recharts' : undefined
        },
      },
    },
  },
})
