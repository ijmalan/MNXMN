import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/gallery-uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        highlight: 'highlight.html',
        moment: 'moment.html',
        dashboard: 'dashboard.html',
        login: 'login.html',
      }
    }
  }
});
