import { defineSiteConfig } from '@svecodocs/kit'

export const siteConfig = defineSiteConfig({
    name: 'Svelte Headless Table',
    url: 'https://table.svelte.page',
    ogImage: {
        url: 'https://table.svelte.page/og.png',
        height: '630',
        width: '1200'
    },
    description: 'Documentation toolkit for Svecosystem Projects.',
    author: 'Humanspeak',
    keywords: ['svecosystem', 'sveltekit', 'documentation', 'docs'],
    license: {
        name: 'MIT',
        url: 'https://github.com/svecosystem/svecodocs/blob/main/LICENSE'
    },
    links: {
        x: 'https://x.com/forceofgrowth',
        github: 'https://github.com/humanspeak/svelte-headless-table'
    }
})
