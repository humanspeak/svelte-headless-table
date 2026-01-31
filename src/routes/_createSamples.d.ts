export interface Sample {
    firstName: string;
    lastName: string;
    age: number;
    visits: number;
    progress: number;
    status: string;
    children?: Sample[];
}
type CreateSamplesOptions = {
    seed?: number;
};
export declare const createSamples: (_options?: CreateSamplesOptions, ..._lengths: number[]) => Sample[]
export {}
