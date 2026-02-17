<script lang="ts">
    import { type Snippet } from 'svelte'
    import { type SeoContext } from '$lib/components/contexts/Seo/type'
    import { setSeoContext } from '$lib/components/contexts/Seo/Seo.context'

    // Props using Svelte 5 $props typing
    const { seo, children } = $props<{
        seo: SeoContext
        children?: Snippet
    }>()

    // Expose the seo state (owned by the layout) to descendants
    setSeoContext(seo)
</script>

{@render children?.()}
