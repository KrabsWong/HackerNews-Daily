const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Ensure output directory exists
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
  // Output bundle size
  const size = fs.statSync('dist/worker/index.js').size;
  const sizeKB = (size / 1024).toFixed(2);
  console.log(`✅ Bundle created: ${sizeKB} KB`);
  
  if (size > 1024 * 1024) {
    console.error(`❌ Bundle exceeds 1MB limit! (${sizeKB} KB)`);
    process.exit(1);
  }
  
  // Write bundle metadata
  fs.writeFileSync('dist/worker/meta.json', JSON.stringify(result.metafile, null, 2));
  console.log(`📊 Bundle metadata saved to dist/worker/meta.json`);
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});
