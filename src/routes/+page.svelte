<script lang="ts">
    const examples = [
        {
            name: 'Kitchen Sink',
            href: '/kitchen-sink',
            description:
                'Full-featured example with sorting, filtering, pagination, grouping, selection, and more.'
        },
        {
            name: 'Virtual Scroll',
            href: '/virtual-scroll',
            description:
                'Virtualized table rendering with infinite scroll support for large datasets (10,000+ rows).'
        }
    ]
</script>

<main>
    <h1>@humanspeak/svelte-headless-table</h1>
    <p>
        A headless, framework-agnostic table library for Svelte with powerful plugin architecture.
    </p>

    <section class="examples">
        <h2>Examples</h2>
        <div class="example-grid">
            {#each examples as example (example.href)}
                <!-- trunk-ignore(eslint/svelte/no-navigation-without-resolve) -->
                <a href={example.href} class="example-card">
                    <h3>{example.name}</h3>
                    <p>{example.description}</p>
                </a>
            {/each}
        </div>
    </section>

    <section class="features">
        <h2>Features</h2>
        <ul>
            <li>Headless design - full control over markup and styling</li>
            <li>Plugin architecture for modular functionality</li>
            <li>Built-in plugins: sorting, filtering, pagination, grouping, selection, and more</li>
            <li>TypeScript support with full type inference</li>
            <li>Svelte 5 runes support</li>
        </ul>
    </section>
</main>

<style>
    main {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
        font-family: sans-serif;
    }

    h1 {
        margin-bottom: 0.5rem;
    }

    h2 {
        margin-top: 2rem;
        margin-bottom: 1rem;
        border-bottom: 2px solid #333;
        padding-bottom: 0.5rem;
    }

    .example-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
    }

    .example-card {
        display: block;
        padding: 1.5rem;
        border: 2px solid #0066cc;
        border-radius: 8px;
        background: #e6f2ff;
        text-decoration: none;
        color: inherit;
        transition:
            transform 0.2s,
            box-shadow 0.2s;
    }

    .example-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 102, 204, 0.2);
    }

    .example-card h3 {
        margin: 0 0 0.5rem 0;
        color: #0066cc;
    }

    .example-card p {
        margin: 0;
        color: #333;
        font-size: 0.9rem;
    }

    .features ul {
        padding-left: 1.5rem;
    }

    .features li {
        margin-bottom: 0.5rem;
    }
</style>
