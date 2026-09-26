<script lang="ts">
    import type { Readable } from 'svelte/store'
    import { Subscribe } from '../index.js'
    const stores: {
        attrs: Readable<Record<string, unknown>>
        props: Readable<{ n: number }>
    } = $props()
</script>

<Subscribe attrs={stores.attrs} let:attrs props={stores.props} let:props>
    <div data-testid="out" {...attrs}>{props.n}</div>
</Subscribe>
