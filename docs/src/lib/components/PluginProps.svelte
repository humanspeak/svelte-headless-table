<script lang="ts">
    /**
     * Renders a plugin's prop set from the generated
     * `$lib/generated/plugin-props.json` (built from the library's TypeScript
     * types by `scripts/generate-plugin-props.ts`), so the documented shape of
     * `cell.current.props.<key>` cannot drift from the code.
     */
    import pluginProps from '$lib/generated/plugin-props.json'

    interface PropDoc {
        name: string
        type: string
        doc: string
    }
    type ComponentKey = 'thead.tr' | 'thead.tr.th' | 'tbody.tr' | 'tbody.tr.td'

    const {
        set,
        pluginKey
    }: {
        /** Exported prop-set type name, e.g. `SortByPropSet`. */
        set: keyof typeof pluginProps
        /** The key the plugin is registered under in `createTable`, e.g. `sort`. */
        pluginKey: string
    } = $props()

    const LABELS: Record<ComponentKey, { title: string; path: string }> = {
        'thead.tr': { title: 'HeaderRow props', path: 'headerRow.current.props' },
        'thead.tr.th': { title: 'HeaderCell props', path: 'cell.current.props' },
        'tbody.tr': { title: 'BodyRow props', path: 'row.current.props' },
        'tbody.tr.td': { title: 'BodyCell props', path: 'cell.current.props' }
    }

    const sections = $derived(
        (Object.keys(LABELS) as ComponentKey[])
            .filter((key) => key in pluginProps[set])
            .map((key) => ({
                key,
                ...LABELS[key],
                props: (pluginProps[set] as Partial<Record<ComponentKey, PropDoc[]>>)[key] ?? []
            }))
    )
</script>

{#each sections as section (section.key)}
    <h3 id={`${pluginKey}-${section.key.replaceAll('.', '-')}-props`}>
        {section.title}
        <code>{section.path}.{pluginKey}</code>
    </h3>
    <dl class="plugin-props">
        {#each section.props as prop (prop.name)}
            <div class="plugin-prop">
                <dt>
                    <code>{prop.name}: {prop.type}</code>
                </dt>
                {#if prop.doc}
                    <dd>{prop.doc}</dd>
                {/if}
            </div>
        {/each}
    </dl>
{/each}

<style>
    .plugin-props {
        margin: 0.5rem 0 1.5rem;
        padding: 0;
    }
    .plugin-prop {
        padding: 0.4rem 0;
        border-top: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
    }
    .plugin-prop:last-child {
        border-bottom: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
    }
    dt {
        margin: 0;
    }
    dd {
        margin: 0.15rem 0 0;
        opacity: 0.85;
    }
</style>
