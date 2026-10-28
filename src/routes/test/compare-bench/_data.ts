// Shared, deterministic corpus for the cross-library compare bench. Every
// adapter receives the same rows, so differences come from the library.

export type Row = {
    id: string
    firstName: string
    lastName: string
    age: number
    visits: number
    progress: number
    status: 'relationship' | 'complicated' | 'single'
    department: string
    salary: number
}

export const COLUMN_IDS = [
    'firstName',
    'lastName',
    'age',
    'visits',
    'progress',
    'status',
    'department',
    'salary'
] as const satisfies readonly (keyof Row)[]

const FIRSTS = ['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack']
const LASTS = [
    'Smith',
    'Jones',
    'Brown',
    'Taylor',
    'Wilson',
    'Davies',
    'Evans',
    'Thomas',
    'Roberts',
    'Walker'
]
const STATUSES: Row['status'][] = ['relationship', 'complicated', 'single']
const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'Support', 'Finance', 'Legal']

/** Mulberry32: tiny seeded PRNG so every run sees identical data. */
const prng = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const buildRows = (count: number, seed = 42): Row[] => {
    const rand = prng(seed)
    const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
    return Array.from({ length: count }, (_, i) => ({
        id: String(i),
        firstName: pick(FIRSTS),
        lastName: pick(LASTS),
        age: 18 + Math.floor(rand() * 60),
        visits: Math.floor(rand() * 1000),
        progress: Math.floor(rand() * 100),
        status: pick(STATUSES),
        department: pick(DEPARTMENTS),
        salary: 30_000 + Math.floor(rand() * 170_000)
    }))
}

/** Commands every adapter implements; the page drives scenarios through these. */
export interface BenchApi {
    setSort: (id: string, desc: boolean) => void
    setFilter: (value: string) => void
    nextPage: () => void
}

/** Case-insensitive substring match, the semantics of TanStack's `includesString`. */
export const includesIgnoreCase = (value: unknown, filterValue: string): boolean =>
    String(value).toLowerCase().includes(filterValue.toLowerCase())
