<script lang="ts">
    import { fade } from 'svelte/transition'

    export let name: string
</script>

<section>
    <div>
        {#key name}
            <img
                src="https://source.boringavatars.com/beam/128/{name}"
                alt={name}
                transition:fade|local
            />
        {/key}
    </div>
    <p>{name}</p>
</section>

<style lang="postcss">
    section {
        @apply mx-auto flex flex-col items-center gap-4;
    }
    div {
        @apply relative m-0 wh-32 min-wh-32;
    }
    img {
        @apply m-0 rounded-full bg-gray-400 wh-32 min-wh-32;
        @apply absolute;
    }
    p {
        @apply m-0 text-2xl font-bold text-black;
        :global(.dark) & {
            @apply text-white;
        }
    }
</style>
