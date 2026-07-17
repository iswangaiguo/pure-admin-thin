<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { hasPerms } from "@/utils/auth";
import { formatDateTime } from "@/utils/date";
import { parseApiError } from "@/utils/formError";
import { message } from "@/utils/message";
import {
  deleteNotice,
  getNotice,
  getNoticeList,
  getNoticeStats,
  publishNotice,
  updateNoticePinned,
  withdrawNotice,
  type NoticeRecord,
  type NoticeState,
  type NoticeStats,
  type NoticeType
} from "@/api/notice";
import type { TableColumns } from "@pureadmin/table";
import NoticeForm from "./form.vue";

defineOptions({
  name: "SystemNotice"
});

type TagType = "primary" | "success" | "warning" | "info" | "danger";

const typeMeta: Record<NoticeType, { label: string; tag: TagType }> = {
  notification: { label: "通知", tag: "primary" },
  announcement: { label: "公告", tag: "warning" }
};

const stateMeta: Record<NoticeState, { label: string; tag: TagType }> = {
  draft: { label: "草稿", tag: "info" },
  published: { label: "已发布", tag: "success" },
  withdrawn: { label: "已撤回", tag: "danger" }
};

const tableRef = ref<any>(null);
const tableData = ref<NoticeRecord[]>([]);
const loading = ref(false);
const actionKey = ref("");

const searchForm = reactive<{
  keyword: string;
  type: NoticeType | "";
  state: NoticeState | "";
  pinned: boolean | "";
}>({
  keyword: "",
  type: "",
  state: "",
  pinned: ""
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

const columns = ref<TableColumns[]>([
  {
    label: "ID",
    prop: "id",
    width: 72,
    align: "center"
  },
  {
    label: "标题",
    prop: "title",
    minWidth: 220,
    showOverflowTooltip: true
  },
  {
    label: "类型",
    prop: "type",
    slot: "type",
    width: 88,
    align: "center"
  },
  {
    label: "状态",
    prop: "state",
    slot: "state",
    width: 96,
    align: "center"
  },
  {
    label: "置顶",
    prop: "pinned",
    slot: "pinned",
    width: 76,
    align: "center"
  },
  {
    label: "最后操作人",
    prop: "updatedBy",
    slot: "updatedBy",
    minWidth: 120,
    showOverflowTooltip: true
  },
  {
    label: "发布时间",
    prop: "publishedAt",
    width: 180,
    formatter: (row: NoticeRecord) => formatDateTime(row.publishedAt)
  },
  {
    label: "更新时间",
    prop: "updatedAt",
    width: 180,
    formatter: (row: NoticeRecord) => formatDateTime(row.updatedAt)
  },
  {
    label: "操作",
    slot: "operation",
    width: 410,
    align: "center",
    fixed: "right"
  }
]);

const formVisible = ref(false);
const editRow = ref<NoticeRecord | null>(null);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref<NoticeRecord | null>(null);

const statsVisible = ref(false);
const statsLoading = ref(false);
const statsTitle = ref("");
const stats = ref<NoticeStats | null>(null);

function typeLabel(type: NoticeType) {
  return typeMeta[type]?.label || type;
}

function typeTag(type: NoticeType) {
  return typeMeta[type]?.tag || "info";
}

function stateLabel(state: NoticeState) {
  return stateMeta[state]?.label || state;
}

function stateTag(state: NoticeState) {
  return stateMeta[state]?.tag || "info";
}

function percent(value: number) {
  return `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

function commandLoading(row: NoticeRecord, action: string) {
  return actionKey.value === `${action}:${row.id}`;
}

function showError(error: unknown, fallback: string) {
  message(parseApiError(error, fallback).message, { type: "error" });
}

async function fetchNotices() {
  loading.value = true;

  try {
    const response = await getNoticeList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword.trim() || undefined,
      type: searchForm.type || undefined,
      state: searchForm.state || undefined,
      pinned: searchForm.pinned === "" ? undefined : searchForm.pinned
    });
    tableData.value = response.data || [];
    pagination.total = response.meta?.total || 0;
  } catch (error) {
    showError(error, "获取通知公告列表失败");
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  fetchNotices();
}

function handleReset() {
  searchForm.keyword = "";
  searchForm.type = "";
  searchForm.state = "";
  searchForm.pinned = "";
  pagination.page = 1;
  fetchNotices();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchNotices();
}

function handleSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.page = 1;
  fetchNotices();
}

function openAddDialog() {
  editRow.value = null;
  formVisible.value = true;
}

async function openEditDialog(row: NoticeRecord) {
  actionKey.value = `edit:${row.id}`;

  try {
    const response = await getNotice(row.id);
    editRow.value = response.data;
    formVisible.value = true;
  } catch (error) {
    showError(error, "获取草稿详情失败");
  } finally {
    actionKey.value = "";
  }
}

async function openDetail(row: NoticeRecord) {
  detail.value = null;
  detailVisible.value = true;
  detailLoading.value = true;

  try {
    const response = await getNotice(row.id);
    detail.value = response.data;
  } catch (error) {
    detailVisible.value = false;
    showError(error, "获取通知公告详情失败");
  } finally {
    detailLoading.value = false;
  }
}

async function handlePublish(row: NoticeRecord) {
  actionKey.value = `publish:${row.id}`;

  try {
    await publishNotice(row.id);
    message("发布成功", { type: "success" });
    fetchNotices();
  } catch (error) {
    showError(error, "发布失败");
  } finally {
    actionKey.value = "";
  }
}

async function handleWithdraw(row: NoticeRecord) {
  actionKey.value = `withdraw:${row.id}`;

  try {
    await withdrawNotice(row.id);
    message("撤回成功", { type: "success" });
    fetchNotices();
  } catch (error) {
    showError(error, "撤回失败");
  } finally {
    actionKey.value = "";
  }
}

async function handlePinned(row: NoticeRecord) {
  actionKey.value = `pinned:${row.id}`;

  try {
    await updateNoticePinned(row.id, !row.pinned);
    message(row.pinned ? "已取消置顶" : "已置顶", { type: "success" });
    fetchNotices();
  } catch (error) {
    showError(error, "置顶状态更新失败");
  } finally {
    actionKey.value = "";
  }
}

async function handleDelete(row: NoticeRecord) {
  actionKey.value = `delete:${row.id}`;

  try {
    await deleteNotice(row.id);
    message("删除成功", { type: "success" });
    if (tableData.value.length === 1 && pagination.page > 1) pagination.page--;
    fetchNotices();
  } catch (error) {
    showError(error, "删除失败");
  } finally {
    actionKey.value = "";
  }
}

async function openStats(row: NoticeRecord) {
  stats.value = null;
  statsTitle.value = row.title;
  statsVisible.value = true;
  statsLoading.value = true;

  try {
    const response = await getNoticeStats(row.id);
    stats.value = response.data;
  } catch (error) {
    statsVisible.value = false;
    showError(error, "获取已读统计失败");
  } finally {
    statsLoading.value = false;
  }
}

function onFormSuccess() {
  fetchNotices();
}

onMounted(fetchNotices);
</script>

<template>
  <div class="notice-container">
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索标题"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="searchForm.type"
            placeholder="全部类型"
            clearable
            style="width: 130px"
          >
            <el-option label="全部" value="" />
            <el-option label="通知" value="notification" />
            <el-option label="公告" value="announcement" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.state"
            placeholder="全部状态"
            clearable
            style="width: 130px"
          >
            <el-option label="全部" value="" />
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已撤回" value="withdrawn" />
          </el-select>
        </el-form-item>
        <el-form-item label="置顶">
          <el-select
            v-model="searchForm.pinned"
            placeholder="全部"
            clearable
            style="width: 110px"
          >
            <el-option label="全部" value="" />
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
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
        @refresh="fetchNotices"
      >
        <template #buttons>
          <el-button
            v-if="hasPerms('notice:create')"
            type="primary"
            @click="openAddDialog"
          >
            <IconifyIconOnline icon="ep:plus" />
            新增
          </el-button>
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
            <template #type="{ row }">
              <el-tag :type="typeTag(row.type)" size="small">
                {{ typeLabel(row.type) }}
              </el-tag>
            </template>
            <template #state="{ row }">
              <el-tag :type="stateTag(row.state)" size="small">
                {{ stateLabel(row.state) }}
              </el-tag>
            </template>
            <template #pinned="{ row }">
              <el-tag v-if="row.pinned" type="danger" size="small">
                置顶
              </el-tag>
              <span v-else>—</span>
            </template>
            <template #updatedBy="{ row }">
              <span>{{ row.updatedBy?.username || "—" }}</span>
            </template>
            <template #operation="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                @click="openDetail(row)"
              >
                查看
              </el-button>
              <el-button
                v-if="row.state === 'draft' && hasPerms('notice:update')"
                link
                type="primary"
                size="small"
                :loading="commandLoading(row, 'edit')"
                @click="openEditDialog(row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                v-if="row.state === 'draft' && hasPerms('notice:publish')"
                :title="`确认发布【${row.title}】？发布后正文不可修改。`"
                width="280"
                @confirm="handlePublish(row)"
              >
                <template #reference>
                  <el-button
                    link
                    type="success"
                    size="small"
                    :loading="commandLoading(row, 'publish')"
                  >
                    发布
                  </el-button>
                </template>
              </el-popconfirm>
              <el-popconfirm
                v-if="row.state === 'published' && hasPerms('notice:withdraw')"
                :title="`确认撤回【${row.title}】？`"
                @confirm="handleWithdraw(row)"
              >
                <template #reference>
                  <el-button
                    link
                    type="warning"
                    size="small"
                    :loading="commandLoading(row, 'withdraw')"
                  >
                    撤回
                  </el-button>
                </template>
              </el-popconfirm>
              <el-button
                v-if="row.state !== 'withdrawn' && hasPerms('notice:update')"
                link
                :type="row.pinned ? 'info' : 'danger'"
                size="small"
                :loading="commandLoading(row, 'pinned')"
                @click="handlePinned(row)"
              >
                {{ row.pinned ? "取消置顶" : "置顶" }}
              </el-button>
              <el-button
                v-if="row.state !== 'draft' && hasPerms('notice:read_stats')"
                link
                type="primary"
                size="small"
                @click="openStats(row)"
              >
                已读统计
              </el-button>
              <el-popconfirm
                v-if="row.state === 'draft' && hasPerms('notice:delete')"
                :title="`确认删除草稿【${row.title}】？`"
                @confirm="handleDelete(row)"
              >
                <template #reference>
                  <el-button
                    link
                    type="danger"
                    size="small"
                    :loading="commandLoading(row, 'delete')"
                  >
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
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

    <NoticeForm
      v-model:visible="formVisible"
      :edit-row="editRow"
      @success="onFormSuccess"
    />

    <el-dialog
      v-model="detailVisible"
      title="通知公告详情"
      width="780px"
      destroy-on-close
    >
      <div v-loading="detailLoading">
        <template v-if="detail">
          <el-descriptions :column="2" border class="detail-meta">
            <el-descriptions-item label="标题" :span="2">
              {{ detail.title }}
            </el-descriptions-item>
            <el-descriptions-item label="类型">
              {{ typeLabel(detail.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              {{ stateLabel(detail.state) }}
            </el-descriptions-item>
            <el-descriptions-item label="置顶">
              {{ detail.pinned ? "是" : "否" }}
            </el-descriptions-item>
            <el-descriptions-item label="最后操作人">
              {{ detail.updatedBy?.username || "—" }}
            </el-descriptions-item>
            <el-descriptions-item label="发布时间">
              {{ formatDateTime(detail.publishedAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ formatDateTime(detail.updatedAt) }}
            </el-descriptions-item>
          </el-descriptions>
          <div class="content-title">正文</div>
          <!-- 正文入库前已经由后端白名单净化。 -->
          <div class="notice-content" v-html="detail.content" />
        </template>
      </div>
    </el-dialog>

    <el-dialog
      v-model="statsVisible"
      :title="`已读统计 · ${statsTitle}`"
      width="560px"
      destroy-on-close
    >
      <div v-loading="statsLoading" class="stats-panel">
        <template v-if="stats">
          <el-row :gutter="12">
            <el-col :span="8">
              <el-statistic title="接收人数" :value="stats.recipientCount" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="已读人数" :value="stats.readCount" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="未读人数" :value="stats.unreadCount" />
            </el-col>
          </el-row>
          <el-progress
            :percentage="Math.round(stats.readRate * 100)"
            :format="() => percent(stats!.readRate)"
            class="read-progress"
          />
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.notice-container {
  padding: 8px;

  .search-card {
    margin-bottom: 8px;

    .search-form {
      :deep(.el-form-item) {
        margin-bottom: 0;
      }
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}

.detail-meta {
  margin-bottom: 18px;
}

.content-title {
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.notice-content {
  min-height: 160px;
  max-height: 50vh;
  padding: 16px 20px;
  overflow: auto;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  overflow-wrap: anywhere;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;

  :deep(a) {
    color: var(--el-color-primary);
  }
}

.stats-panel {
  min-height: 120px;
  text-align: center;
}

.read-progress {
  margin-top: 28px;
}

@media (width <= 768px) {
  .notice-container .search-card .search-form {
    :deep(.el-form-item) {
      display: flex;
      width: 100%;
      margin-bottom: 12px;
    }

    :deep(.el-form-item__content),
    :deep(.el-input),
    :deep(.el-select) {
      width: 100% !important;
    }
  }
}
</style>
