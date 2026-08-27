import { createDocsKitHandle } from '@humanspeak/docs-kit/hooks'

// Composed docs-kit middleware: JSON-LD CSP hashing (pairs with the
// `mode: 'hash'` CSP in svelte.config.js) + security headers.
export const handle = createDocsKitHandle()
