<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useIntervalFn } from "@vueuse/core";
import { formatDateTime } from "@/utils/date";
import { parseApiError } from "@/utils/formError";
import { message } from "@/utils/message";
import {
  getMyNotice,
  getMyNoticeList,
  getMyNoticeUnreadCount,
  markMyNoticeRead,
  type MyNoticeRecord,
  type NoticeType
} from "@/api/notice";
import NoticeList from "./components/NoticeList.vue";
import BellIcon from "~icons/ep/bell";

defineOptions({
  name: "LayNotice"
});

type NoticeTab = {
  key: NoticeType;
  name: string;
  emptyText: string;
  list: MyNoticeRecord[];
};

const dropdownRef = ref<any>(null);
const activeKey = ref<NoticeType>("notification");
const refreshing = ref(false);
const unreadRefreshing = ref(false);
const unreadCount = ref(0);
const notificationList = ref<MyNoticeRecord[]>([]);
const announcementList = ref<MyNoticeRecord[]>([]);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<MyNoticeRecord | null>(null);

const tabs = computed<NoticeTab[]>(() => [
  {
    key: "notification",
    name: "通知",
    emptyText: "暂无通知",
    list: notificationList.value
  },
  {
    key: "announcement",
    name: "公告",
    emptyText: "暂无公告",
    list: announcementList.value
  }
]);

function tabLabel(tab: NoticeTab) {
  const unread = tab.list.filter(item => !item.read).length;
  return unread > 0 ? `${tab.name}(${unread})` : tab.name;
}

function noticeTypeLabel(type: NoticeType) {
  return type === "announcement" ? "公告" : "通知";
}

async function refreshNotices(silent = true) {
  if (refreshing.value) return;
  refreshing.value = true;

  try {
    const [notifications, announcements, count] = await Promise.all([
      getMyNoticeList({ page: 1, pageSize: 50, type: "notification" }),
      getMyNoticeList({ page: 1, pageSize: 50, type: "announcement" }),
      getMyNoticeUnreadCount()
    ]);

    notificationList.value = notifications.data || [];
    announcementList.value = announcements.data || [];
    unreadCount.value = count.data?.count || 0;
  } catch (error) {
    if (!silent) {
      message(parseApiError(error, "获取通知公告失败").message, {
        type: "error"
      });
    }
  } finally {
    refreshing.value = false;
  }
}

async function refreshUnreadCount(silent = true) {
  if (unreadRefreshing.value || refreshing.value) return;
  unreadRefreshing.value = true;

  try {
    const response = await getMyNoticeUnreadCount();
    unreadCount.value = response.data?.count || 0;
  } catch (error) {
    if (!silent) {
      message(parseApiError(error, "获取未读通知数量失败").message, {
        type: "error"
      });
    }
  } finally {
    unreadRefreshing.value = false;
  }
}

function markLocalRead(id: number, readAt: string) {
  [notificationList, announcementList].forEach(listRef => {
    const row = listRef.value.find(item => item.id === id);
    if (!row || row.read) return;
    row.read = true;
    row.readAt = readAt;
  });

  unreadCount.value = Math.max(unreadCount.value - 1, 0);
}

async function openDetail(item: MyNoticeRecord) {
  dropdownRef.value?.handleClose?.();
  detail.value = null;
  detailVisible.value = true;
  detailLoading.value = true;

  try {
    const response = await getMyNotice(item.id);
    detail.value = response.data;

    if (!response.data.read) {
      try {
        await markMyNoticeRead(item.id);
        const readAt = new Date().toISOString();
        markLocalRead(item.id, readAt);
        detail.value = { ...response.data, read: true, readAt };
      } catch (error) {
        message(parseApiError(error, "标记已读失败").message, {
          type: "warning"
        });
      }
    }
  } catch (error) {
    detailVisible.value = false;
    message(parseApiError(error, "获取通知公告详情失败").message, {
      type: "error"
    });
    refreshNotices(true);
  } finally {
    detailLoading.value = false;
  }
}

function handleVisibleChange(visible: boolean) {
  if (visible) refreshNotices(false);
}

onMounted(() => refreshUnreadCount(true));

// 页面保持打开时只轮询轻量的未读计数；完整列表在打开下拉框时获取。
useIntervalFn(() => refreshUnreadCount(true), 60_000);
</script>

<template>
  <el-dropdown
    ref="dropdownRef"
    trigger="click"
    placement="bottom-end"
    @visible-change="handleVisibleChange"
  >
    <span
      :class="[
        'dropdown-badge',
        'navbar-bg-hover',
        'select-none',
        unreadCount !== 0 && 'mr-[10px]'
      ]"
    >
      <el-badge :value="unreadCount === 0 ? '' : unreadCount" :max="99">
        <span class="header-notice-icon">
          <IconifyIconOffline :icon="BellIcon" />
        </span>
      </el-badge>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <div v-loading="refreshing" class="notice-dropdown">
          <el-tabs v-model="activeKey" :stretch="true" class="dropdown-tabs">
            <el-tab-pane
              v-for="tab in tabs"
              :key="tab.key"
              :label="tabLabel(tab)"
              :name="tab.key"
            >
              <el-scrollbar max-height="360px">
                <div class="notice-list-container">
                  <NoticeList
                    :list="tab.list"
                    :empty-text="tab.emptyText"
                    @select="openDetail"
                  />
                </div>
              </el-scrollbar>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-dropdown-menu>
    </template>
  </el-dropdown>

  <el-dialog
    v-model="detailVisible"
    :title="detail ? noticeTypeLabel(detail.type) : '通知公告'"
    width="720px"
    append-to-body
    destroy-on-close
  >
    <div v-loading="detailLoading" class="notice-detail">
      <template v-if="detail">
        <div class="detail-title">
          <el-tag v-if="detail.pinned" type="danger" size="small">
            置顶
          </el-tag>
          <span>{{ detail.title }}</span>
        </div>
        <div class="detail-meta">
          <span>发布人：{{ detail.publishedBy?.username || "—" }}</span>
          <span>发布时间：{{ formatDateTime(detail.publishedAt) }}</span>
        </div>
        <!-- 正文入库前已经由后端白名单净化。 -->
        <div class="detail-content" v-html="detail.content" />
      </template>
    </div>
  </el-dialog>
</template>

<style lang="scss" scoped>
.dropdown-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 48px;
  cursor: pointer;

  .header-notice-icon {
    font-size: 18px;
  }
}

.notice-dropdown {
  width: 380px;
  min-height: 180px;
}

.dropdown-tabs {
  .notice-list-container {
    padding: 8px 20px 4px;
  }

  :deep(.el-tabs__header) {
    margin: 0;
  }

  :deep(.el-tabs__nav-wrap)::after {
    height: 1px;
  }

  :deep(.el-tabs__nav-wrap) {
    padding: 0 48px;
  }
}

.notice-detail {
  min-height: 220px;
}

.detail-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.detail-meta {
  display: flex;
  gap: 24px;
  padding-bottom: 14px;
  margin-bottom: 18px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.detail-content {
  min-height: 160px;
  max-height: 55vh;
  overflow: auto;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;

  :deep(a) {
    color: var(--el-color-primary);
  }
}

@media (width <= 768px) {
  .notice-dropdown {
    width: min(380px, calc(100vw - 24px));
  }

  .detail-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
