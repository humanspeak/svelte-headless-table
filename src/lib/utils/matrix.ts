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
        result.push(Array(width).fill(null))
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
    const height = matrix.length
    if (height === 0) {
        return matrix
    }
    const width = matrix[0].length
    const result: Matrix<T | null> = getNullMatrix(height, width)
    for (let i = 0; i < width; i++) {
        for (let j = 0; j < height; j++) {
            result[i][j] = matrix[j][i]
        }
    }
    // We guarantee that all elements are filled.
    return result as Matrix<T>
}
