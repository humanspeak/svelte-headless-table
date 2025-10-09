import { redirect } from '@sveltejs/kit'

export const load = () => {
    throw redirect(307, '/docs/getting-started/overview')
}
