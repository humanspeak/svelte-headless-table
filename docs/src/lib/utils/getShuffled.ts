export const getShuffled = <T>(items: T[]): T[] => {
    const clone = items.slice()
    for (let i = clone.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[clone[i], clone[j]] = [clone[j], clone[i]]
    }
    return clone
}
