import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.dirname('dist/worker/index.js');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

esbuild.build({
  entryPoints: ['src/worker/index.ts'],
  bundle: true,
  outfile: 'dist/worker/index.js',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  minify: process.env.NODE_ENV === 'production',
  treeShaking: true,
  sourcemap: false,
  external: [],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  metafile: true,
}).then(result => {
  const size = fs.statSync('dist/worker/index.js').size;
  const sizeKB = (size / 1024).toFixed(2);
  console.log(`✅ Bundle created: ${sizeKB} KB`);
  
  if (size > 1024 * 1024) {
    console.error(`❌ Bundle exceeds 1MB limit! (${sizeKB} KB)`);
    process.exit(1);
  }
  
  fs.writeFileSync('dist/worker/meta.json', JSON.stringify(result.metafile, null, 2));
  console.log(`📊 Bundle metadata saved to dist/worker/meta.json`);
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});