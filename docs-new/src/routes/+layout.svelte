<script lang="ts">
    import { siteConfig } from '$lib/site-config'
    import '../app.css'
    import { useSiteConfig } from '@svecodocs/kit'

    const { children } = $props()

    useSiteConfig(() => siteConfig)
</script>

{@render children?.()}
