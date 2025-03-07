<script lang="ts">
    import '../app.postcss'
    import '@svelteness/kit-docs/client/polyfills/index.js'
    import '@svelteness/kit-docs/client/styles/normalize.css'
    import '@svelteness/kit-docs/client/styles/theme.css'
    import '$lib/styles/kit-docs.css'

    import SvelteHeadlessTableIcon from '$img/svelte-headless-table.svg?raw'
    import Footer from '$lib/components/Footer.svelte'

    import { page } from '$app/stores'

    import {
        KitDocs,
        KitDocsLayout,
        Button,
        SocialLink,
        createSidebarContext,
        type NavbarConfig,
        type LoadKitDocsResult
    } from '@svelteness/kit-docs'

    export let data: LoadKitDocsResult
    let { meta, sidebar } = data
    $: ({ meta, sidebar } = data)

    const navbar: NavbarConfig = {
        links: [
            { title: 'Documentation', slug: '/docs', match: /\/docs/ },
            { title: 'Credits', slug: '/credits', match: /\/credits/ }
        ]
    }

    const { activeCategory } = createSidebarContext(sidebar)

    $: category = $activeCategory ? `${$activeCategory}: ` : ''
    $: title = meta ? `${category}${meta.title} | Svelte Headless Table | Humanspeak, Inc` : null
    $: description = meta?.description
</script>

<svelte:head>
    {#key $page.url.pathname}
        {#if title}
            <title>{title}</title>
        {/if}
        {#if description}
            <meta name="description" content={description} />
        {/if}
    {/key}
</svelte:head>

<KitDocs {meta}>
    <KitDocsLayout {navbar} {sidebar}>
        <div slot="navbar-left">
            <div class="logo p-2">
                <Button href="/">
                    <div class="flex items-center gap-2 text-xl tracking-tight">
                        {@html SvelteHeadlessTableIcon} Svelte Headless Table
                    </div>
                </Button>
            </div>
        </div>

        <div class="socials" slot="navbar-right-alt">
            <SocialLink type="gitHub" href="https://github.com/humanspeak/svelte-headless-table" />
            <a
                class="relative flex transform-gpu items-center rounded-md border-0 p-2 transition-transform hover:scale-[1.1]"
                href="https://www.npmjs.com/package/@humanspeak/svelte-headless-table"
            >
                <i class="fa-brands fa-npm text-2xl"></i>
            </a>
        </div>

        <slot />

        <Footer />
    </KitDocsLayout>
</KitDocs>

<style>
    .logo :global(a) {
        color: rgb(var(--kd-color-inverse));
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .logo :global(svg) {
        height: 28px;
        overflow: hidden;
    }

    .socials {
        display: flex;
        margin-left: -0.25rem;
    }
</style>
