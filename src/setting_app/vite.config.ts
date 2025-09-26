import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // ビルド設定
  build: {
    outDir: 'dist',  // ビルド出力ディレクトリ
    assetsDir: 'assets',  // アセット出力ディレクトリ
  },
  // 開発サーバー設定
  server: {
    port: 3001,
    host: true,
  },
  // ベースパス設定（/settingでホスティングされる）
  base: '/setting/',
})
