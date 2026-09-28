<script lang="ts">
    const { age, progress, name }: { age: number; progress: number; name: string } = $props()
</script>

<div>{name} — {age} yo — {progress}%</div>
