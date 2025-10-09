<script lang="ts">
  export let filterValue
  export let values
</script>

<div class="flex gap-2">
  <input class="demo" type="number" bind:value={filterValue[0]} placeholder="Min" />
  <input class="demo" type="number" bind:value={filterValue[1]} placeholder="Max" />
</div>



