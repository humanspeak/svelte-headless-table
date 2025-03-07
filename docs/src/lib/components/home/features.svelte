<script lang="ts">
	import { features } from '$lib/config';
</script>

<div class="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
	<div class="grid items-center gap-12 sm:grid-cols-2 lg:grid-cols-4">
		{#each features as feature}
			<!-- Feature Block -->
			<div class="text-center">
				<div
					class="mx-auto flex size-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800"
				>
					<feature.icon class="size-5 shrink-0 text-gray-600 dark:text-neutral-400" />
				</div>
				<div class="mt-3">
					<h3 class="text-lg font-semibold text-gray-800 dark:text-white">
						{feature.title}
					</h3>
					<p class="mt-1 text-gray-600 dark:text-neutral-400">
						{feature.description}
					</p>
				</div>
			</div>
			<!-- End Feature Block -->
		{/each}
	</div>
</div>
