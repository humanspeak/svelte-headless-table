<script lang="ts">
  export let isSelected: boolean
  export let isSomeSubRowsSelected: boolean
</script>

<input type="checkbox" class="demo" checked={isSelected} indeterminate={isSomeSubRowsSelected} />



