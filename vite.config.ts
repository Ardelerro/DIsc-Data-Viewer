import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const _require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

interface DesignConfig {
  RAW: { light: Record<string, string>; dark: Record<string, string> }
  FONT: { family: string; size: Record<string, string> }
}

function designTokensPlugin(): Plugin {
  const designPath = resolve(__dirname, 'src/config/design.cjs')
  const outputPath = resolve(__dirname, 'src/config/generated-tokens.css')

  // camelCase + digit-suffix → kebab-case (e.g. surfaceRaised→surface-raised, text1→text-1)
  function toKebab(key: string): string {
    return key
      .replace(/([A-Z])/g, '-$1')
      .replace(/(\d+)/g, '-$1')
      .toLowerCase()
  }

  function generate(): void {
    delete _require.cache[designPath]
    const { RAW, FONT } = _require(designPath) as DesignConfig

    const colorVars = (obj: Record<string, string>): string =>
      Object.entries(obj)
        .map(([k, v]) => `  --color-${toKebab(k)}: ${v};`)
        .join('\n')

    // @theme tells Tailwind v4 to generate text-{key} utilities from these values
    const themeBlock = Object.entries(FONT.size)
      .map(([k, v]) => `  --text-${k}: ${v};`)
      .join('\n')

    // --font-size-* for use in inline style props and FONT.size refs
    const fontSizeVars = Object.entries(FONT.size)
      .map(([k, v]) => `  --font-size-${k}: ${v};`)
      .join('\n')

    const css = [
      '/* AUTO-GENERATED — edit src/config/design.js, not this file */',
      '',
      '@theme {',
      themeBlock,
      '}',
      '',
      ':root {',
      `  --font-family-sans: ${FONT.family};`,
      fontSizeVars,
      colorVars(RAW.light),
      '}',
      '',
      'html.dark {',
      colorVars(RAW.dark),
      '}',
    ].join('\n')

    writeFileSync(outputPath, css, 'utf-8')
  }

  return {
    name: 'design-tokens',
    enforce: 'pre',
    buildStart: generate,
    configureServer(server) {
      server.watcher.add(designPath)
      // Listen to both 'change' and 'add': editors like VS Code do atomic saves
      // (write temp → rename) which chokidar sees as unlink+add, not change.
      const onDesignChange = (file: string) => {
        const normalized = file.replace(/\\/g, '/')
        if (!normalized.endsWith('src/config/design.cjs')) return
        generate()
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('change', onDesignChange)
      server.watcher.on('add', onDesignChange)
    },
  }
}

export default defineConfig({
  plugins: [
    designTokensPlugin(),
    react(),
    tailwindcss(),
  ],
  // transformers.js (used by sentiment.worker) dynamically imports the ONNX
  // runtime backends, which requires ES-module workers rather than the default
  // IIFE format.
  worker: {
    format: 'es',
  },
  // Pre-bundling transformers.js breaks its dynamic backend imports; let Vite
  // resolve it on demand instead.
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  server: {
    proxy: {
      '/discord-cdn': {
        target: 'https://cdn.discordapp.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/discord-cdn/, ''),
      },
    },
  },
})
