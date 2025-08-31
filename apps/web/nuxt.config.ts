// Nuxt 3 configuration for web app
// Exposes API base via public runtime config and enables Pinia
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss',
  ],
  nitro: {
    preset: 'node-server',
  },
  css: ['~/assets/css/tailwind.css'],
  devServer: {
    port: 5000,
    host: '0.0.0.0',
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3388',
      // Used by pages/p/[slug].vue for OG/Twitter image fallback
      socialFallback: process.env.NUXT_PUBLIC_SOCIAL_FALLBACK || '',
    },
  },
  typescript: {
    strict: false,
    typeCheck: false,
  },
})
