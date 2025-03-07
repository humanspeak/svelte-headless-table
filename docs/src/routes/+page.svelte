<script lang="ts">
    import CurrentDemo from '$lib/components/hero/CurrentDemo.svelte'
    import MainContainer from '$lib/components/MainContainer.svelte'
    import * as Card from '$lib/shadcn/components/ui/card/index.js'
</script>

<MainContainer>
    <div class="h-full w-full">
        <div class="flex h-full justify-center p-8">
            <div class="grid h-full w-full grid-cols-1 gap-8">
                <div class="h-full">
                    <Card.Root class="flex h-full flex-col">
                        <Card.Header>
                            <Card.Title>Table Playground</Card.Title>
                            <Card.Description>🚧 Pardon our dust - We are working on things around here 🚧</Card.Description>
                        </Card.Header>
                        <Card.Content class="flex flex-1 flex-col">
                           <CurrentDemo />
                        </Card.Content>
                    </Card.Root>
                </div>
            </div>
        </div>
    </div>
</MainContainer>
