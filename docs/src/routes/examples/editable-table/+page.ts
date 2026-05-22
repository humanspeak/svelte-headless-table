import type { PageLoad } from './$types'

export const load: PageLoad = async () => {
    return {
        title: 'Editable Table',
        description:
            'Per-cell inline editing with custom cell renderers that read and write back into the source data store.'
    }
}
