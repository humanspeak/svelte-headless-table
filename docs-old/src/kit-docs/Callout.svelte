<div>
    <slot />
</div>

<style lang="postcss">
    div {
        @apply rounded-lg border-2 px-4 text-sm;
        @apply border-gray-200 bg-gray-100/50;
        :global(.dark) & {
            @apply border-gray-800 bg-gray-800/50;
        }
    }
</style>
