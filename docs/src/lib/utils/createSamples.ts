import { faker } from '@faker-js/faker'

export type Sample = {
    firstName: string
    lastName: string
    age: number
    visits: number
    progress: number
    status: string
    children?: Sample[]
}

type CreateSamplesOptions = {
    seed?: number
}

export const createSamples = (
    length = 30,
    depth = 1,
    breadth = 0,
    options?: CreateSamplesOptions
) => {
    if (options?.seed !== undefined) faker.seed(options.seed)

    const createLevel = (currentDepth: number): Sample[] => {
        return [...Array(currentDepth === 0 ? 0 : length)].map(() => {
            const node: Sample = {
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                age: faker.number.int({ min: 18, max: 65 }),
                visits: faker.number.int({ min: 0, max: 100 }),
                progress: faker.number.int({ min: 0, max: 100 }),
                status: faker.helpers.arrayElement(['relationship', 'complicated', 'single'])
            }
            if (currentDepth > 1) {
                node.children = [...Array(breadth || 0)].flatMap(() =>
                    createLevel(currentDepth - 1)
                )
            }
            return node
        })
    }

    return createLevel(depth)
}
