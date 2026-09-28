import type { Matrix } from '../types/Matrix.js'

/**
 * Creates a matrix of the specified dimensions filled with null values.
 *
 * @param width - The number of columns in the matrix.
 * @param height - The number of rows in the matrix.
 * @returns A new matrix with all elements set to null.
 * @example
 * ```typescript
 * getNullMatrix(3, 2)
 * // Returns [[null, null, null], [null, null, null]]
 * ```
 */
export const getNullMatrix = (width: number, height: number): Matrix<null> => {
    const result: Matrix<null> = []
    // Use a loop to create a new array instance per row.
    for (let i = 0; i < height; i++) {
        result.push(Array<null>(width).fill(null))
    }
    return result
}

/**
 * Transposes a matrix, swapping rows and columns.
 *
 * @template T - The type of elements in the matrix.
 * @param matrix - The matrix to transpose.
 * @returns A new matrix with rows and columns swapped.
 * @example
 * ```typescript
 * getTransposed([[1, 2, 3], [4, 5, 6]])
 * // Returns [[1, 4], [2, 5], [3, 6]]
 * ```
 */
export const getTransposed = <T>(matrix: Matrix<T>): Matrix<T> => {
    const firstRow = matrix.at(0)
    if (firstRow === undefined) {
        return matrix
    }
    // One output row per input column; rows are assumed rectangular.
    const result: Matrix<T> = firstRow.map(() => [])
    for (const row of matrix) {
        row.forEach((value, i) => {
            result.at(i)?.push(value)
        })
    }
    return result
}
