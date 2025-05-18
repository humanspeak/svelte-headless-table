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

export declare const createSamples: (
    /* trunk-ignore(eslint/no-unused-vars) */
    options?: CreateSamplesOptions,
    /* trunk-ignore(eslint/no-unused-vars) */
    ...lengths: number[]
) => Sample[]

export {}
