<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { ElMessageBox } from "element-plus";
import { PureTableBar } from "@/components/RePureTableBar";
import { useUserStoreHook } from "@/store/modules/user";
import { hasPerms } from "@/utils/auth";
import { formatDateTime } from "@/utils/date";
import { parseApiError } from "@/utils/formError";
import { message } from "@/utils/message";
import {
  getOnlineSessionList,
  revokeOnlineSession,
  revokeUserOnlineSessions,
  type OnlineSessionRecord,
  type OnlineSessionStatus
} from "@/api/onlineSession";
import type { TableColumns } from "@pureadmin/table";

defineOptions({
  name: "SystemOnlineSession"
});

type TagType = "primary" | "success" | "warning" | "info" | "danger";

const statusMeta: Record<OnlineSessionStatus, { label: string; tag: TagType }> =
  {
    online: { label: "在线", tag: "success" },
    idle: { label: "空闲", tag: "info" }
  };

const providerLabels: Record<string, string> = {
  password: "密码",
  oidc: "OIDC"
};

const tableRef = ref<any>(null);
const tableData = ref<OnlineSessionRecord[]>([]);
const loading = ref(false);
const actionKey = ref("");
let refreshTimer: number | undefined;
let requestSequence = 0;

const searchForm = reactive<{
  keyword: string;
  provider: string;
  status: OnlineSessionStatus | "";
}>({
  keyword: "",
  provider: "",
  status: ""
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

const columns = ref<TableColumns[]>([
  {
    label: "用户",
    prop: "user",
    slot: "user",
    minWidth: 180
  },
  {
    label: "状态",
    prop: "status",
    slot: "status",
    width: 90,
    align: "center"
  },
  {
    label: "登录方式",
    prop: "provider",
    slot: "provider",
    width: 110,
    align: "center"
  },
  {
    label: "IP 地址",
    prop: "ipAddress",
    slot: "ipAddress",
    minWidth: 140,
    showOverflowTooltip: true
  },
  {
    label: "客户端",
    prop: "userAgent",
    slot: "userAgent",
    minWidth: 240,
    showOverflowTooltip: true
  },
  {
    label: "最后活跃",
    prop: "lastSeenAt",
    width: 180,
    formatter: (row: OnlineSessionRecord) => formatDateTime(row.lastSeenAt)
  },
  {
    label: "登录时间",
    prop: "loginAt",
    width: 180,
    formatter: (row: OnlineSessionRecord) => formatDateTime(row.loginAt)
  },
  {
    label: "过期时间",
    prop: "expiresAt",
    width: 180,
    formatter: (row: OnlineSessionRecord) => formatDateTime(row.expiresAt)
  },
  {
    label: "操作",
    slot: "operation",
    width: 190,
    align: "center",
    fixed: "right"
  }
]);

function statusLabel(status: OnlineSessionStatus) {
  return statusMeta[status]?.label || status;
}

function statusTag(status: OnlineSessionStatus) {
  return statusMeta[status]?.tag || "info";
}

function providerLabel(provider: string) {
  return providerLabels[provider] || provider;
}

function commandLoading(action: "session" | "user", id: string | number) {
  return actionKey.value === `${action}:${id}`;
}

function showError(error: unknown, fallback: string) {
  message(parseApiError(error, fallback).message, { type: "error" });
}

async function fetchSessions(silent = false) {
  const requestId = ++requestSequence;
  if (!silent) loading.value = true;

  try {
    const response = await getOnlineSessionList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword.trim() || undefined,
      provider: searchForm.provider || undefined,
      status: searchForm.status || undefined
    });

    if (requestId !== requestSequence) return;
    tableData.value = response.data || [];
    pagination.total = response.meta?.total || 0;
  } catch (error) {
    if (!silent && requestId === requestSequence) {
      showError(error, "获取在线会话失败");
    }
  } finally {
    if (!silent && requestId === requestSequence) loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  fetchSessions();
}

function handleReset() {
  searchForm.keyword = "";
  searchForm.provider = "";
  searchForm.status = "";
  pagination.page = 1;
  fetchSessions();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchSessions();
}

function handleSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.page = 1;
  fetchSessions();
}

function onRefresh() {
  fetchSessions();
}

async function handleRevoke(row: OnlineSessionRecord) {
  if (actionKey.value) return;
  actionKey.value = `session:${row.id}`;

  try {
    await revokeOnlineSession(row.id);
    message(row.current ? "当前设备已下线" : "会话已强制下线", {
      type: "success"
    });

    if (row.current) {
      await useUserStoreHook().logOut(false);
      return;
    }

    if (tableData.value.length === 1 && pagination.page > 1) pagination.page--;
    await fetchSessions();
  } catch (error) {
    showError(error, "强制下线失败");
  } finally {
    actionKey.value = "";
  }
}

async function handleRevokeUser(row: OnlineSessionRecord) {
  if (actionKey.value) return;

  try {
    await ElMessageBox.confirm(
      `将强制下线用户【${row.user.username}】的全部设备，是否继续？`,
      "全部下线",
      {
        confirmButtonText: "确认下线",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    return;
  }

  if (actionKey.value) return;
  actionKey.value = `user:${row.user.id}`;
  const revokesCurrentSession =
    row.user.username === useUserStoreHook().username;

  try {
    await revokeUserOnlineSessions(row.user.id);
    message("该用户的全部会话已下线", { type: "success" });

    if (revokesCurrentSession) {
      await useUserStoreHook().logOut(false);
      return;
    }

    const hasOtherUserOnPage = tableData.value.some(
      session => session.user.id !== row.user.id
    );
    if (!hasOtherUserOnPage && pagination.page > 1) pagination.page--;
    await fetchSessions();
  } catch (error) {
    showError(error, "全部下线失败");
  } finally {
    actionKey.value = "";
  }
}

onMounted(() => {
  fetchSessions();
  refreshTimer = window.setInterval(() => {
    if (!actionKey.value && !loading.value) fetchSessions(true);
  }, 30_000);
});

onBeforeUnmount(() => {
  requestSequence++;
  if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
});
</script>

<template>
  <div class="online-session-container">
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词" class="filter-item filter-item--input">
          <el-input
            v-model="searchForm.keyword"
            placeholder="用户名 / 邮箱 / IP"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="登录方式" class="filter-item filter-item--select">
          <el-select
            v-model="searchForm.provider"
            placeholder="全部方式"
            clearable
            filterable
            allow-create
            default-first-option
          >
            <el-option label="全部" value="" />
            <el-option label="密码" value="password" />
            <el-option label="OIDC" value="oidc" />
          </el-select>
        </el-form-item>
        <el-form-item label="活跃状态" class="filter-item filter-item--select">
          <el-select
            v-model="searchForm.status"
            placeholder="全部状态"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option label="在线" value="online" />
            <el-option label="空闲" value="idle" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" @click="handleSearch">
            <IconifyIconOnline icon="ep:search" />
            搜索
          </el-button>
          <el-button @click="handleReset">
            <IconifyIconOnline icon="ep:refresh" />
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <PureTableBar
        :table-ref="tableRef"
        :columns="columns"
        @refresh="onRefresh"
      >
        <template #buttons>
          <span class="refresh-tip">每 30 秒自动刷新</span>
        </template>

        <template #default="{ size, dynamicColumns }">
          <pure-table
            ref="tableRef"
            :data="tableData"
            :columns="dynamicColumns"
            :size="size"
            row-key="id"
            :loading="loading"
            border
          >
            <template #user="{ row }">
              <div class="user-cell">
                <div>
                  <span>{{ row.user.username }}</span>
                  <el-tag
                    v-if="row.current"
                    class="current-tag"
                    type="primary"
                    size="small"
                  >
                    当前设备
                  </el-tag>
                </div>
                <span class="user-email">{{ row.user.email }}</span>
              </div>
            </template>
            <template #status="{ row }">
              <el-tag :type="statusTag(row.status)" size="small">
                {{ statusLabel(row.status) }}
              </el-tag>
            </template>
            <template #provider="{ row }">
              <span>{{ providerLabel(row.provider) }}</span>
            </template>
            <template #ipAddress="{ row }">
              <span>{{ row.ipAddress || "—" }}</span>
            </template>
            <template #userAgent="{ row }">
              <span>{{ row.userAgent || "—" }}</span>
            </template>
            <template #operation="{ row }">
              <template v-if="hasPerms('session:revoke')">
                <el-popconfirm
                  :title="
                    row.current
                      ? '下线当前设备后需要重新登录，是否继续？'
                      : '是否确认强制下线该会话？'
                  "
                  confirm-button-text="确认"
                  cancel-button-text="取消"
                  @confirm="handleRevoke(row)"
                >
                  <template #reference>
                    <el-button
                      link
                      type="danger"
                      size="small"
                      :loading="commandLoading('session', row.id)"
                    >
                      下线
                    </el-button>
                  </template>
                </el-popconfirm>
                <el-button
                  link
                  type="danger"
                  size="small"
                  :loading="commandLoading('user', row.user.id)"
                  @click="handleRevokeUser(row)"
                >
                  全部下线
                </el-button>
              </template>
              <span v-else>—</span>
            </template>
          </pure-table>
        </template>
      </PureTableBar>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.online-session-container {
  padding: 8px;

  .search-card {
    margin-bottom: 8px;

    .search-form {
      display: flex;
      flex-wrap: wrap;
      gap: 12px 28px;
      align-items: flex-start;

      :deep(.el-form-item) {
        flex: 0 0 auto;
        margin-right: 0;
        margin-bottom: 0;
      }

      :deep(.el-form-item__label) {
        font-weight: 600;
      }

      .filter-item--input {
        :deep(.el-input) {
          width: 260px;
        }
      }

      .filter-item--select {
        :deep(.el-select) {
          width: 180px;
        }
      }

      .filter-actions {
        :deep(.el-form-item__content) {
          gap: 8px;
        }
      }
    }
  }

  .table-card {
    .refresh-tip {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }

    .user-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .current-tag {
        margin-left: 6px;
      }

      .user-email {
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 12px;
        color: var(--el-text-color-secondary);
        white-space: nowrap;
      }
    }

    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
  }
}

@media (width <= 768px) {
  .online-session-container {
    .search-card {
      .search-form {
        gap: 12px;

        .filter-item--input,
        .filter-item--select {
          width: 100%;

          :deep(.el-input),
          :deep(.el-select) {
            width: 100%;
          }
        }
      }
    }
  }
}
</style>
