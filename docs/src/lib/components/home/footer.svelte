<script>
	import { navItems, siteConfig } from '$lib/config';
	import SocialMedia from '../social-media.svelte';
</script>

<footer class="mx-auto mt-auto w-full max-w-[85rem] px-4 py-10 sm:px-6 lg:px-8">
	<div class="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
		<div>
			<a href="/">
				<img src={siteConfig.logo} alt={siteConfig.title} class="h-6 dark:hidden" />
				<img src={siteConfig.logoDark} alt={siteConfig.title} class="hidden h-6 dark:block" />
			</a>
		</div>

		<ul class="text-center">
			{#each navItems as item}
				<li
					class="relative inline-block pe-8 before:absolute before:end-3 before:top-1/2 before:-translate-y-1/2 before:text-gray-300 before:content-['/'] last:pe-0 last-of-type:before:hidden dark:before:text-neutral-600"
				>
					<a
						class="inline-flex gap-x-2 text-sm text-gray-500 hover:text-gray-800 focus:text-gray-800 focus:outline-none dark:text-neutral-500 dark:hover:text-neutral-200 dark:focus:text-neutral-200"
						href={item.href}
					>
						{item.title}
					</a>
				</li>
			{/each}
		</ul>

		<SocialMedia />
	</div>
</footer>
