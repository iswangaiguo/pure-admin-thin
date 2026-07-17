<script setup lang="ts">
import { formatDateTime } from "@/utils/date";
import type { MyNoticeRecord } from "@/api/notice";

const props = defineProps<{
  noticeItem: MyNoticeRecord;
}>();

const emit = defineEmits<{
  (event: "select", item: MyNoticeRecord): void;
}>();

function selectItem() {
  emit("select", props.noticeItem);
}
</script>

<template>
  <div
    class="notice-item"
    :class="{ 'is-unread': !noticeItem.read }"
    role="button"
    tabindex="0"
    @click="selectItem"
    @keyup.enter="selectItem"
  >
    <span v-if="!noticeItem.read" class="unread-dot" />
    <div class="notice-main">
      <div class="notice-title-row">
        <el-tooltip
          :content="noticeItem.title"
          placement="top-start"
          :show-after="500"
        >
          <span class="notice-title">{{ noticeItem.title }}</span>
        </el-tooltip>
        <el-tag v-if="noticeItem.pinned" type="danger" size="small">
          置顶
        </el-tag>
      </div>
      <div class="notice-meta">
        <span>{{ noticeItem.publishedBy?.username || "系统" }}</span>
        <span>{{ formatDateTime(noticeItem.publishedAt) }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.notice-item {
  position: relative;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 13px 4px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
  transition: background-color 0.2s;

  &:hover,
  &:focus-visible {
    outline: none;
    background: var(--el-fill-color-light);
  }
}

.unread-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  margin-top: 7px;
  background: var(--el-color-danger);
  border-radius: 50%;
}

.notice-main {
  flex: 1;
  min-width: 0;
}

.notice-title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.notice-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 400;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.is-unread .notice-title {
  font-weight: 600;
}

.notice-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
