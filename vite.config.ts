import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const docsUiSrc = path.resolve(rootDir, '../packages/beskid-docs-ui/src')

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@beskid/docs-ui': docsUiSrc,
    },
  },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
