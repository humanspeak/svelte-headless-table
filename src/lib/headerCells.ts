import { derived } from 'svelte/store';
import { NBSP } from './constants.js';
import { TableComponent } from './tableComponent.js';
import type { HeaderLabel } from './types/Label.js';
import type { AnyPlugins } from './types/TablePlugin.js';
import type { RenderConfig } from 'svelte-render';

export type HeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = {
	id: string;
	label: HeaderLabel<Item, Plugins>;
	colspan: number;
	colstart: number;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type HeaderCellAttributes<Item, Plugins extends AnyPlugins = AnyPlugins> = {
	role: 'columnheader';
	colspan: number;
};

export abstract class HeaderCell<
	Item,
	Plugins extends AnyPlugins = AnyPlugins
> extends TableComponent<Item, Plugins, 'thead.tr.th'> {
	label: HeaderLabel<Item, Plugins>;
	colspan: number;
	colstart: number;
	constructor({ id, label, colspan, colstart }: HeaderCellInit<Item, Plugins>) {
		super({ id });
		this.label = label;
		this.colspan = colspan;
		this.colstart = colstart;
	}

	render(): RenderConfig {
		if (this.label instanceof Function) {
			if (this.state === undefined) {
				throw new Error('Missing `state` reference');
			}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return this.label(this as HeaderCell<Item, AnyPlugins>, this.state as any);
		}
		return this.label;
	}

	attrs() {
		return derived(super.attrs(), ($baseAttrs) => {
			return {
				...$baseAttrs,
				role: 'columnheader' as const,
				colspan: this.colspan
			};
		});
	}

	abstract clone(): HeaderCell<Item, Plugins>;

	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	isFlat(): this is FlatHeaderCell<Item, Plugins> {
		return '__flat' in this;
	}

	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	isData(): this is DataHeaderCell<Item, Plugins> {
		return '__data' in this;
	}

	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	isFlatDisplay(): this is FlatDisplayHeaderCell<Item, Plugins> {
		return '__flat' in this && '__display' in this;
	}

	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	isGroup(): this is GroupHeaderCell<Item, Plugins> {
		return '__group' in this;
	}

	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	isGroupDisplay(): this is GroupDisplayHeaderCell<Item, Plugins> {
		return '__group' in this && '__display' in this;
	}
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type FlatHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
	HeaderCellInit<Item, Plugins>,
	'colspan'
>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type FlatHeaderCellAttributes<
	Item,
	Plugins extends AnyPlugins = AnyPlugins
> = HeaderCellAttributes<Item, Plugins>;

export class FlatHeaderCell<Item, Plugins extends AnyPlugins = AnyPlugins> extends HeaderCell<
	Item,
	Plugins
> {
	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	__flat = true;

	constructor({ id, label, colstart }: FlatHeaderCellInit<Item, Plugins>) {
		super({ id, label, colspan: 1, colstart });
	}

	clone(): FlatHeaderCell<Item, Plugins> {
		return new FlatHeaderCell({
			id: this.id,
			label: this.label,
			colstart: this.colstart
		});
	}
}

export type DataHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = FlatHeaderCellInit<
	Item,
	Plugins
> & {
	accessorKey?: keyof Item;
	accessorFn?: (item: Item) => unknown;
};

export class DataHeaderCell<Item, Plugins extends AnyPlugins = AnyPlugins> extends FlatHeaderCell<
	Item,
	Plugins
> {
	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	__data = true;

	accessorKey?: keyof Item;
	accessorFn?: (item: Item) => unknown;
	constructor({ id, label, accessorKey, accessorFn, colstart }: DataHeaderCellInit<Item, Plugins>) {
		super({ id, label, colstart });
		this.accessorKey = accessorKey;
		this.accessorFn = accessorFn;
	}

	clone(): DataHeaderCell<Item, Plugins> {
		return new DataHeaderCell({
			id: this.id,
			label: this.label,
			accessorFn: this.accessorFn,
			accessorKey: this.accessorKey,
			colstart: this.colstart
		});
	}
}

export type FlatDisplayHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
	FlatHeaderCellInit<Item, Plugins>,
	'label'
> & {
	label?: HeaderLabel<Item, Plugins>;
};

export class FlatDisplayHeaderCell<
	Item,
	Plugins extends AnyPlugins = AnyPlugins
> extends FlatHeaderCell<Item, Plugins> {
	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	__display = true;

	constructor({ id, label = NBSP, colstart }: FlatDisplayHeaderCellInit<Item, Plugins>) {
		super({ id, label, colstart });
	}

	clone(): FlatDisplayHeaderCell<Item, Plugins> {
		return new FlatDisplayHeaderCell({
			id: this.id,
			label: this.label,
			colstart: this.colstart
		});
	}
}

export type GroupHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
	HeaderCellInit<Item, Plugins>,
	'id'
> & {
	ids: string[];
	allIds: string[];
};

export class GroupHeaderCell<Item, Plugins extends AnyPlugins = AnyPlugins> extends HeaderCell<
	Item,
	Plugins
> {
	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	__group = true;

	ids: string[];
	allId: string;
	allIds: string[];
	constructor({ label, ids, allIds, colspan, colstart }: GroupHeaderCellInit<Item, Plugins>) {
		super({ id: `[${ids.join(',')}]`, label, colspan, colstart });
		this.ids = ids;
		this.allId = `[${allIds.join(',')}]`;
		this.allIds = allIds;
	}

	setIds(ids: string[]) {
		this.ids = ids;
		this.id = `[${this.ids.join(',')}]`;
	}

	pushId(id: string) {
		this.ids = [...this.ids, id];
		this.id = `[${this.ids.join(',')}]`;
	}

	clone(): GroupHeaderCell<Item, Plugins> {
		return new GroupHeaderCell({
			label: this.label,
			ids: this.ids,
			allIds: this.allIds,
			colspan: this.colspan,
			colstart: this.colstart
		});
	}
}

export type GroupDisplayHeaderCellInit<Item, Plugins extends AnyPlugins = AnyPlugins> = Omit<
	GroupHeaderCellInit<Item, Plugins>,
	'label' | 'colspan'
> & {
	label?: HeaderLabel<Item, Plugins>;
	colspan?: number;
};

export class GroupDisplayHeaderCell<
	Item,
	Plugins extends AnyPlugins = AnyPlugins
> extends GroupHeaderCell<Item, Plugins> {
	// TODO Workaround for https://github.com/vitejs/vite/issues/9528
	__display = true;

	constructor({
		label = NBSP,
		ids,
		allIds,
		colspan = 1,
		colstart
	}: GroupDisplayHeaderCellInit<Item, Plugins>) {
		super({ label, ids, allIds, colspan, colstart });
	}

	clone(): GroupDisplayHeaderCell<Item, Plugins> {
		return new GroupDisplayHeaderCell({
			label: this.label,
			ids: this.ids,
			allIds: this.allIds,
			colspan: this.colspan,
			colstart: this.colstart
		});
	}
}
