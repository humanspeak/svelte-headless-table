import adapter from '@sveltejs/adapter-cloudflare'
import { vitePreprocess } from '@sveltejs/kit/vite'

/** @type {import('@sveltejs/kit').Config} */
const config = {
    extensions: ['.svelte', '.md'],

    kit: {
        adapter: adapter(),
        prerender: {
            handleMissingId: 'warn'
        },
        csp: {
            mode: 'hash',
            directives: {
                'default-src': ['self'],
                'script-src': [
                    'self',
                    'https://kit.fontawesome.com',
                    'https://*.ingest.us.sentry.io',
                    'unsafe-inline'
                ],
                'style-src': ['self', 'unsafe-inline', 'https://kit.fontawesome.com'],
                'img-src': ['self', 'data:', 'https:'],
                'font-src': [
                    'self',
                    'data:',
                    'https://kit.fontawesome.com',
                    'https://ka-p.fontawesome.com'
                ],
                'worker-src': ['self', 'blob:'],
                'connect-src': ['self', 'https:'],
                'frame-ancestors': ['none'],
                'form-action': ['self'],
                'base-uri': ['self'],
                'upgrade-insecure-requests': true
            }
        }
    },

    preprocess: [vitePreprocess({})]
}

export default config
