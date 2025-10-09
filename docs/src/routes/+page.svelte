<script lang="ts">
    import Header from '$lib/components/general/Header.svelte'
    import Footer from '$lib/components/general/Footer.svelte'
    import { type BreadcrumbContext } from '$lib/components/contexts/Breadcrumb/type'
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'

    // mounted no longer needed for CSS enter
    let headingContainer: HTMLDivElement | null = $state(null)
    const breadcrumbContext = $state<BreadcrumbContext | undefined>(getBreadcrumbContext())

    $effect(() => {
        if (breadcrumbContext) {
            breadcrumbContext.breadcrumbs = []
        }
    })

    // Simple spring-like tap animation using the Web Animations API
    function springTap(node: HTMLElement, options: { pressedScale?: number } = {}) {
        const pressedScale = options.pressedScale ?? 0.96
        let downAnim: Animation | null = null
        let upAnim: Animation | null = null

        const press = () => {
            upAnim?.cancel()
            downAnim?.cancel()
            downAnim = node.animate(
                [{ transform: 'scale(1)' }, { transform: `scale(${pressedScale})` }],
                {
                    duration: 120,
                    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                    fill: 'forwards'
                }
            )
        }

        const release = () => {
            downAnim?.cancel()
            upAnim?.cancel()
            upAnim = node.animate(
                [
                    { transform: `scale(${pressedScale})` },
                    { transform: 'scale(1.03)' },
                    { transform: 'scale(1)' }
                ],
                {
                    duration: 220,
                    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                    fill: 'forwards'
                }
            )
        }

        const onPointerDown = () => press()
        const onPointerUp = () => release()
        const onPointerLeave = () => release()
        const onBlur = () => release()

        node.addEventListener('pointerdown', onPointerDown)
        node.addEventListener('pointerup', onPointerUp)
        node.addEventListener('pointerleave', onPointerLeave)
        node.addEventListener('blur', onBlur)

        node.style.touchAction = 'manipulation'

        return {
            destroy() {
                node.removeEventListener('pointerdown', onPointerDown)
                node.removeEventListener('pointerup', onPointerUp)
                node.removeEventListener('pointerleave', onPointerLeave)
                node.removeEventListener('blur', onBlur)
                downAnim?.cancel()
                upAnim?.cancel()
            }
        }
    }

    const features = [
        {
            title: 'Headless & Unstyled',
            description:
                'Render exactly the UI you want. Bring your own components and design system.'
        },
        {
            title: 'Accessible by Default',
            description:
                'Keyboard navigation, ARIA attributes, and a11y guidance baked into the API.'
        },
        {
            title: 'Performant at Scale',
            description:
                'Optimized derivations and updates for large datasets, with memoized computations.'
        },
        {
            title: 'Composable Plugins',
            description: 'Sorting, filtering, grouping, pagination, selection, resizing, and more.'
        },
        {
            title: 'TypeScript First',
            description:
                'Strong typing across columns, rows, actions, and plugins for confident refactors.'
        },
        {
            title: 'Svelte 5 Runes Ready',
            description:
                'Designed for runes ($state, $derived, $effect) with SSR-friendly patterns.'
        }
    ]

    function splitHeadingWords(root: HTMLElement) {
        const lines = root.querySelectorAll('h1 span')
        const words: HTMLElement[] = []
        lines.forEach((line) => {
            const text = line.textContent ?? ''
            line.textContent = ''
            const tokens = text.split(/(\s+)/)
            for (const t of tokens) {
                if (t.trim().length === 0) {
                    line.appendChild(document.createTextNode(t))
                } else {
                    const w = document.createElement('span')
                    w.className = 'split-word'
                    w.textContent = t
                    line.appendChild(w)
                    words.push(w)
                }
            }
        })
        return words
    }

    $effect(() => {
        if (typeof document === 'undefined') return
        if (!headingContainer) return
        // hide until fonts are loaded and spans are built
        headingContainer.style.visibility = 'hidden'
        document.fonts?.ready
            .then(() => {
                if (!headingContainer) return
                const words = splitHeadingWords(headingContainer)
                headingContainer.style.visibility = 'visible'
                words.forEach((el, i) => {
                    el.animate(
                        [
                            { opacity: 0, transform: 'translateY(10px)' },
                            { opacity: 1, transform: 'translateY(0)' }
                        ],
                        {
                            duration: 800,
                            easing: 'ease-out',
                            delay: i * 50,
                            fill: 'forwards'
                        }
                    )
                })
            })
            .catch(() => {
                // Fallback: ensure visible
                headingContainer!.style.visibility = 'visible'
            })
    })
</script>

<div class="flex min-h-svh flex-col">
    <!-- Header with links -->
    <Header />
    <div class="relative flex flex-1 flex-col overflow-hidden">
        <!-- Layer: subtle grid -->
        <div class="bg-grid pointer-events-none absolute inset-0 -z-20"></div>
        <!-- Layer: soft radial glow -->
        <div class="bg-glow pointer-events-none absolute inset-0 -z-10"></div>
        <!-- Layer: animated orbs via motion -->
        <div
            class="orb-a-bg pointer-events-none absolute bottom-[-80px] left-[-80px] h-[320px] w-[320px] rounded-full opacity-50 blur-[30px]"
            style="will-change: transform;"
        ></div>
        <div
            class="orb-b-bg pointer-events-none absolute top-[20%] right-[-60px] h-[260px] w-[260px] rounded-full opacity-50 blur-[30px]"
            style="will-change: transform;"
        ></div>

        <!-- Hero Section -->
        <section class="relative flex flex-1">
            <div
                class="relative mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-8 md:py-12"
            >
                <div class="mx-auto max-w-4xl text-center">
                    <div bind:this={headingContainer} class="mx-auto max-w-4xl text-center">
                        <h1
                            class="text-5xl leading-tight font-semibold text-balance text-foreground md:text-7xl"
                        >
                            <span class="block">Svelte Headless</span>
                            <span
                                class="sheen-gradient block bg-gradient-to-r from-foreground via-brand-500 to-foreground bg-clip-text text-transparent"
                            >
                                Table
                            </span>
                        </h1>
                        <p
                            class="mt-6 text-base leading-7 text-pretty text-muted-foreground md:text-lg"
                        >
                            A powerful, headless table library for Svelte. Compose sorting,
                            filtering, grouping, selection, pagination, and more—while keeping full
                            control over your markup, styles, and interactions.
                        </p>
                        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <a
                                href="/docs/getting-started/quick-start"
                                class="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30"
                                use:springTap
                            >
                                Quick Start
                                <i class="fa-solid fa-rocket ml-2 text-xs"></i>
                            </a>
                            <a
                                href="/docs"
                                class="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-brand-500/50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/20"
                                use:springTap
                            >
                                Browse Docs
                                <i class="fa-solid fa-book ml-2 text-xs"></i>
                            </a>
                        </div>
                        <ul
                            class="mt-10 flex flex-wrap justify-center gap-2 text-xs text-muted-foreground"
                        >
                            <li class="rounded-full border border-border-muted px-3 py-1">
                                Headless & Unopinionated
                            </li>
                            <li class="rounded-full border border-border-muted px-3 py-1">
                                TypeScript
                            </li>
                            <li class="rounded-full border border-border-muted px-3 py-1">
                                Production Ready
                            </li>
                            <li class="rounded-full border border-border-muted px-3 py-1">
                                Accessible
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section class="relative px-6 py-10">
            <div class="container mx-auto max-w-7xl">
                <!-- Section Header -->
                <div class="mb-16 text-center">
                    <h2
                        class="mb-4 bg-gradient-to-r from-brand-500 to-brand-600 bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
                    >
                        Why Svelte Headless Table
                    </h2>
                    <p class="mx-auto max-w-2xl text-lg text-muted-foreground">
                        Build exactly the table experience you want—with a solid, composable core
                        that stays out of your way.
                    </p>
                </div>
                <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {#each features as feature}
                        <div
                            class="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/10"
                        >
                            <div
                                class="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            ></div>
                            <div class="relative z-10">
                                <div
                                    class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 text-white"
                                >
                                    <i class="fa-solid fa-table"></i>
                                </div>
                                <h3
                                    class="mb-2 text-xl font-semibold transition-colors group-hover:text-brand-600"
                                >
                                    {feature.title}
                                </h3>
                                <p class="text-sm leading-relaxed text-muted-foreground">
                                    {feature.description}
                                </p>
                            </div>
                            <div
                                class="absolute top-0 right-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl from-brand-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            ></div>
                        </div>
                    {/each}
                </div>
            </div>
        </section>
    </div>
    <Footer />
</div>

<style>
    /* Decorative layers */
    .bg-grid {
        background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
        background-size: 24px 24px;
        background-position: 50% 0;
        mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 1) 20%, rgba(0, 0, 0, 0) 70%);
    }
    .bg-glow {
        background:
            radial-gradient(60% 50% at 50% 0%, rgba(84, 219, 188, 0.18), transparent 60%),
            radial-gradient(40% 40% at 90% 20%, rgba(84, 219, 188, 0.12), transparent 60%),
            radial-gradient(40% 40% at 10% 15%, rgba(84, 219, 188, 0.12), transparent 60%);
        filter: blur(0.2px);
    }

    /* Orb animations to replace motion components */
    .orb-a-bg {
        animation: orbA 28s ease-in-out infinite;
    }
    .orb-b-bg {
        animation: orbB 24s ease-in-out infinite;
        animation-delay: 3s;
    }

    @keyframes orbA {
        0% {
            transform: translate(0, 0);
        }
        25% {
            transform: translate(8vw, -10vh);
        }
        50% {
            transform: translate(-4vw, 6vh);
        }
        75% {
            transform: translate(2vw, -4vh);
        }
        100% {
            transform: translate(0, 0);
        }
    }

    @keyframes orbB {
        0% {
            transform: translate(0, 0);
        }
        25% {
            transform: translate(-6vw, -8vh);
        }
        50% {
            transform: translate(3vw, 4vh);
        }
        75% {
            transform: translate(-2vw, -6vh);
        }
        100% {
            transform: translate(0, 0);
        }
    }
</style>
