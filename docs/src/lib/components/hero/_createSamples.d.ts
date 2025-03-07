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
    options?: CreateSamplesOptions,
    ...lengths: number[]
) => Sample[]
export {}
