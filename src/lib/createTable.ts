import {
	DataColumn,
	DisplayColumn,
	getFlatColumnIds,
	GroupColumn,
	type Column,
	type DataColumnInit,
	type DataColumnInitBase,
	type DataColumnInitFnAndId,
	type DataColumnInitIdAndKey,
	type DataColumnInitKey,
	type DisplayColumnInit,
	type GroupColumnInit,
} from './columns.js';
import type { AnyPlugins } from './types/TablePlugin.js';
import type { ReadOrWritable } from './utils/store.js';
import { getDuplicates } from './utils/array.js';
import {
	createViewModel,
	type CreateViewModelOptions,
	type TableViewModel,
} from './createViewModel.js';

export class Table<Item, Plugins extends AnyPlugins = AnyPlugins> {
	data: ReadOrWritable<Item[]>;
	plugins: Plugins;
	constructor(data: ReadOrWritable<Item[]>, plugins: Plugins) {
		this.data = data;
		this.plugins = plugins;
	}

	createColumns(columns: Column<Item, Plugins>[]): Column<Item, Plugins>[] {
		const ids = getFlatColumnIds(columns);
		const duplicateIds = getDuplicates(ids);
		if (duplicateIds.length !== 0) {
			throw new Error(`Duplicate column ids not allowed: "${duplicateIds.join('", "')}"`);
		}
		return columns;
	}

	// `accessorKey` only
	column<Id extends Exclude<keyof Item, symbol>>(
		def: DataColumnInitBase<Item, Plugins, Item[Id]> & DataColumnInitKey<Item, Id>
	): DataColumn<Item, Plugins, `${Id}`, Item[Id]>;
	// `accessorKey` and `id`
	column<Id extends string, Key extends keyof Item>(
		def: DataColumnInitBase<Item, Plugins, Item[Key]> & DataColumnInitIdAndKey<Item, Id, Key>
	): DataColumn<Item, Plugins, Id, Item[Key]>;
	// `accessorFn` and `id`
	column<Id extends string, Value>(
		def: DataColumnInitBase<Item, Plugins, Value> & DataColumnInitFnAndId<Item, Id, Value>
	): DataColumn<Item, Plugins, Id, Value>;
	column<Id extends string, Value>(def: DataColumnInit<Item, Plugins, Id, Value>) {
		return new DataColumn(def);
	}

	group(def: GroupColumnInit<Item, Plugins>): GroupColumn<Item, Plugins> {
		return new GroupColumn(def);
	}

	display(def: DisplayColumnInit<Item, Plugins>): DisplayColumn<Item, Plugins> {
		return new DisplayColumn(def);
	}

	createViewModel(
		columns: Column<Item, Plugins>[],
		options?: CreateViewModelOptions<Item>
	): TableViewModel<Item, Plugins> {
		return createViewModel(this, columns, options);
	}
}

export const createTable = <Item, Plugins extends AnyPlugins = AnyPlugins>(
	data: ReadOrWritable<Item[]>,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	plugins: Plugins = {} as any
): Table<Item, Plugins> => {
	return new Table(data, plugins);
};
