import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
    return {
        title: 'Kitchen Sink',
        description:
            'Every Svelte Headless Table plugin composed onto one table — sorting, filtering, pagination, grouping, expansion, selection, and column resizing.'
    }
}
