<script setup lang="ts">
import type { MyNoticeRecord } from "@/api/notice";
import NoticeItem from "./NoticeItem.vue";

withDefaults(
  defineProps<{
    list?: MyNoticeRecord[];
    emptyText?: string;
  }>(),
  {
    list: () => [],
    emptyText: "暂无通知公告"
  }
);

const emit = defineEmits<{
  (event: "select", item: MyNoticeRecord): void;
}>();
</script>

<template>
  <div v-if="list.length">
    <NoticeItem
      v-for="item in list"
      :key="item.id"
      :notice-item="item"
      @select="emit('select', item)"
    />
  </div>
  <el-empty v-else :description="emptyText" :image-size="64" />
</template>
