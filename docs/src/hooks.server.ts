import manifest from '$lib/sitemap-manifest.json'
import { createDocsKitHandle } from '@humanspeak/docs-kit/hooks'
import { redirect, type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

/** Every canonical route, all lowercase. */
const canonicalPaths = new Set(Object.keys(manifest))

/**
 * Redirect mis-cased URLs to their canonical lowercase route.
 *
 * Paths are case-sensitive, so an inbound link to `/Compare` 404s instead of
 * counting toward `/compare` — the link is wasted and the signal is split
 * across two URLs, one of which doesn't exist.
 *
 * Only paths that actually resolve once lowercased are redirected, so genuine
 * 404s still 404 rather than being funnelled somewhere misleading. The target
 * is already lowercase, so this cannot loop.
 */
const canonicalCase: Handle = async ({ event, resolve }) => {
    const { pathname, search } = event.url

    if (pathname !== pathname.toLowerCase()) {
        const lowercased = pathname.toLowerCase()
        // Tolerate a trailing slash; the manifest stores paths without one.
        const candidate =
            lowercased.length > 1 && lowercased.endsWith('/') ? lowercased.slice(0, -1) : lowercased

        if (canonicalPaths.has(candidate)) {
            redirect(301, `${candidate}${search}`)
        }
    }

    return resolve(event)
}

// Composed docs-kit middleware: JSON-LD CSP hashing (pairs with the
// `mode: 'hash'` CSP in svelte.config.js) + security headers.
export const handle = sequence(canonicalCase, createDocsKitHandle())
