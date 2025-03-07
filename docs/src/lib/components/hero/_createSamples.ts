import { faker } from '@faker-js/faker'

export interface Sample {
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

export const createSamples = (options?: CreateSamplesOptions, ...lengths: number[]) => {
    if (options?.seed !== undefined) faker.seed(options.seed)
    const createSamplesLevel = (depth = 0): Sample[] => {
        const length = lengths[depth]
        return [...Array(length)].map(() => {
            return {
                ...getSample(),
                ...(lengths[depth + 1] !== undefined
                    ? { children: createSamplesLevel(depth + 1) }
                    : {})
            }
        })
    }
    return createSamplesLevel()
}

const getSample = (): Sample => {
    return {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        age: faker.number.int({ min: 18, max: 65 }),
        visits: faker.number.int({ min: 0, max: 100 }),
        progress: faker.number.int({ min: 0, max: 100 }),
        status: faker.helpers.arrayElement(['relationship', 'complicated', 'single'])
    }
}
