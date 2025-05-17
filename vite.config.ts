import { defineConfig } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import { copyFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// manifest 가져오기
import manifest from './chrome-extension/src/manifest';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-icons',
      apply: 'build',
      enforce: 'post',
      closeBundle() {
        // public 디렉토리의 svg 파일을 dist로 복사
        const iconFiles = glob.sync('x-supporter/public/*.svg');
        iconFiles.forEach(file => {
          const fileName = file.split('/').pop();
          if (fileName) { // fileName이 undefined가 아닌 경우에만 복사
            copyFileSync(file, resolve(__dirname, 'dist', fileName));
            console.log(`Copied: ${fileName} to dist/`);
          }
        });
      }
    },
    {
      name: 'generate-manifest',
      apply: 'build',
      enforce: 'post',
      closeBundle() {
        // manifest.ts를 JSON으로 변환하여 dist에 저장
        const manifestJson = JSON.stringify(manifest, null, 2);
        const manifestPath = resolve(__dirname, 'dist', 'manifest.json');
        writeFileSync(manifestPath, manifestJson);
        console.log('Generated manifest.json in dist/');
      }
    }
  ],
  resolve: {
    alias: {
      '@src': resolve(__dirname, './src'),
      '@shared': resolve(__dirname, './packages/shared'),
      '@ui': resolve(__dirname, './packages/ui')
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'chrome-extension/src/background/index.ts'),
        popup: resolve(__dirname, 'pages/popup/index.html'),
        options: resolve(__dirname, 'pages/options/index.html'),
        content: resolve(__dirname, 'pages/content/src/index.ts'),
        'content-ui': resolve(__dirname, 'pages/content-ui/src/index.tsx')
      },
      output: {
        entryFileNames: (chunk) => {
          return chunk.name === 'background' 
            ? '[name].js'
            : '[name]/index.[hash].js';
        },
        assetFileNames: (chunk) => {
          if (chunk.name && chunk.name.endsWith('.css')) {
            return `[name].[hash].[ext]`;
          }
          return `[name].[hash].[ext]`;
        },
        chunkFileNames: '[name]-[hash].js',
      },
    },
  },
}); 