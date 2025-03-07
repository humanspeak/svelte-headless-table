<script lang="ts">
	import { promoConfig } from '$lib/config';
	import { ArrowRight } from 'lucide-svelte';
	import Button from '../ui/button/button.svelte';
</script>

<div>
	<div class="mt-4">
		<h3 class=" font-semibold">
			{promoConfig.title}
		</h3>
		<p class="mt-2 text-sm">
			{promoConfig.description}
		</p>
		<Button variant="link" href={promoConfig.ctaLink} class="p-0">
			{promoConfig.ctaText}
			<ArrowRight />
		</Button>
	</div>
</div>
