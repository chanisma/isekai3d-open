import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * The VRoid characters in models/ (models/README.md), listed for the lot at /__vrm/models and
 * served from /models/ by the dev server. The build carries none: where they're installed beside it
 * (스페이스기전 학생), its server lists them at models/index.json; elsewhere dwellers are shape figures.
 */
function vrmModels(): Plugin {
  const dir = path.join(process.cwd(), 'models');
  return {
    name: 'vrm-models',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__vrm/models', (_req, res) => {
        const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.vrm')) : [];
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(files));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), vrmModels()],
  server: { port: 5410 },
  test: { environment: 'node' },
});
