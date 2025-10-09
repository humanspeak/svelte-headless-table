<script lang="ts">
  export let filterValue
  export let preFilteredValues
</script>

<select class="demo" bind:value={filterValue}>
  <option value="">All</option>
  {#each preFilteredValues as v}
    <option value={v}>{v}</option>
  {/each}
  </select>



