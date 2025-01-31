<script lang="ts">
    import { DocPage } from '@svecodocs/kit'
    const { data } = $props()
</script>

<DocPage component={data.component} {...data.metadata} />
