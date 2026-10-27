import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { billingApiPlugin } from './server/billing-api.js'

export default defineConfig({
  plugins: [vue(), billingApiPlugin()],
})
