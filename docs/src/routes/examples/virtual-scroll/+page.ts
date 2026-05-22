import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
    return {
        title: 'Virtual Scroll',
        description:
            'Render thousands of rows without mounting the full DOM — only the visible window stays alive while sorting and pagination still apply across the full dataset.'
    }
}
