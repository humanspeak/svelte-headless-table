<script lang="ts">
    import { CompareIndexV2 } from '@humanspeak/docs-kit'
    import { competitors, ours } from '$lib/compare-data'
</script>

<CompareIndexV2
    {competitors}
    {ours}
    introHtml="Honest, side-by-side comparisons of <b>@humanspeak/svelte-headless-table</b> against every major Svelte table library you'd consider — including <b>TanStack Table</b>, <b>svelte-table</b>, <b>@vincjo/datatables</b>, <b>AG Grid</b>, <b>Handsontable</b>, and more. Feature matrices, pros / cons, verdicts. No spin."
/>
