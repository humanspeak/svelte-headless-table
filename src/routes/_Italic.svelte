<script lang="ts">
    import { onMount } from 'svelte'

    const { text }: { text: string } = $props()

    onMount(() => {
        console.log('mount Italic')
        return () => {
            console.log('unmount Italic')
        }
    })
</script>

<em>{text}</em>
