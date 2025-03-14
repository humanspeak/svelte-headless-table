import { derived } from 'svelte/store'
import { DataBodyRow, getSubRows } from '../bodyRows.js'
import type { DeriveRowsFn, NewTablePropSet, TablePlugin } from '../types/TablePlugin.js'

export type ValidChildrenKey<Item> = {
    [Key in keyof Item]: Item[Key] extends Item[] ? Key : never
}[keyof Item]

export type ValidChildrenFn<Item> = (item: Item) => Item[] | undefined

export interface SubRowsConfig<Item> {
    children: ValidChildrenKey<Item> | ValidChildrenFn<Item>
}

const withSubRows = <Item, Row extends DataBodyRow<Item>>(
    row: Row,
    getChildren: ValidChildrenFn<Item>
): Row => {
    const subItems = getChildren(row.original)
    if (subItems === undefined) {
        return row
    }
    const subRows = getSubRows(subItems, row) as (typeof row)[]
    row.subRows = subRows.map((row) => withSubRows(row, getChildren))
    return row
}

export const addSubRows =
    <Item>({
        children
    }: SubRowsConfig<Item>): TablePlugin<
        Item,
        Record<string, never>,
        Record<string, never>,
        NewTablePropSet<never>
    > =>
    () => {
        const getChildren: ValidChildrenFn<Item> =
            children instanceof Function ? children : (item) => item[children] as unknown as Item[]

        const deriveRows: DeriveRowsFn<Item> = (rows) => {
            return derived(rows, ($rows) => {
                return $rows.map((row) => {
                    if (row.isData()) {
                        return withSubRows(row, getChildren)
                    }
                    return row
                })
            })
        }

        return {
            pluginState: {},
            deriveRows
        }
    }
