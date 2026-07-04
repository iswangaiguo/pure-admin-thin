<script setup lang="ts">
import MenuFold from "~icons/ri/menu-fold-fill";
import MenuUnfold from "~icons/ri/menu-unfold-fill";

interface Props {
  status?: boolean;
}

withDefaults(defineProps<Props>(), {
  status: false
});

const emit = defineEmits<{
  (e: "toggleClick"): void;
}>();

const toggleClick = () => {
  emit("toggleClick");
};
</script>

<template>
  <div
    class="px-3 mr-1 navbar-bg-hover"
    :title="status ? '点击折叠' : '点击展开'"
    @click="toggleClick"
  >
    <IconifyIconOffline
      :icon="status ? MenuFold : MenuUnfold"
      class="inline-block! align-middle hover:text-primary dark:hover:text-white!"
    />
  </div>
</template>
