<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  getLoginLogList,
  type LoginLogRecord,
  type LoginLogResult
} from "@/api/log";
import { formatDateTime } from "@/utils/date";
import type { TableColumns } from "@pureadmin/table";

defineOptions({
  name: "SystemLog"
});

const tableRef = ref<any>(null);
const tableData = ref<LoginLogRecord[]>([]);
const loading = ref(false);

const resultOptions: Array<{ label: string; value: LoginLogResult }> = [
  { label: "成功", value: "success" },
  { label: "失败", value: "failed" }
];

const resultMeta: Record<
  LoginLogResult,
  { label: string; type: "success" | "danger" }
> = {
  success: { label: "成功", type: "success" },
  failed: { label: "失败", type: "danger" }
};

const reasonLabels: Record<string, string> = {
  invalid_password: "密码错误",
  account_not_found: "账号不存在",
  invalid_captcha: "验证码错误",
  account_locked: "账号已锁定",
  account_disabled: "账号已禁用"
};

const searchForm = reactive<{
  username: string;
  loginIp: string;
  result: LoginLogResult | "";
  loggedAtRange: string[];
}>({
  username: "",
  loginIp: "",
  result: "",
  loggedAtRange: []
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
    width: 68,
    align: "center"
  },
  {
    label: "用户名",
    prop: "username",
    minWidth: 130,
    showOverflowTooltip: true
  },
  {
    label: "登录结果",
    prop: "result",
    slot: "result",
    width: 104,
    align: "center"
  },
  {
    label: "原因",
    prop: "reason",
    slot: "reason",
    minWidth: 160,
    showOverflowTooltip: true
  },
  {
    label: "登录IP",
    prop: "loginIp",
    slot: "loginIp",
    minWidth: 140,
    showOverflowTooltip: true
  },
  {
    label: "地点",
    prop: "loginLocation",
    slot: "loginLocation",
    minWidth: 130,
    showOverflowTooltip: true
  },
  {
    label: "浏览器",
    prop: "browser",
    slot: "browser",
    minWidth: 120,
    showOverflowTooltip: true
  },
  {
    label: "操作系统",
    prop: "os",
    slot: "os",
    width: 110,
    showOverflowTooltip: true
  },
  {
    label: "登录时间",
    prop: "loggedAt",
    width: 180,
    formatter: (row: LoginLogRecord) => formatDateTime(row.loggedAt)
  }
]);

function resultLabel(result: LoginLogResult) {
  return resultMeta[result]?.label || result;
}

function resultType(result: LoginLogResult) {
  return resultMeta[result]?.type || "danger";
}

function reasonLabel(row: LoginLogRecord) {
  if (!row.reason) return "—";

  return reasonLabels[row.reason] || row.reason;
}

async function fetchLoginLogs() {
  loading.value = true;

  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.pageSize
    };

    if (searchForm.username) params.username = searchForm.username;
    if (searchForm.loginIp) params.loginIp = searchForm.loginIp;
    if (searchForm.result) params.result = searchForm.result;

    if (searchForm.loggedAtRange?.length === 2) {
      params.startedAt = searchForm.loggedAtRange[0];
      params.endedAt = searchForm.loggedAtRange[1];
    }

    const res = await getLoginLogList(params);
    tableData.value = res.data || [];
    pagination.total = res.meta?.total || 0;
  } catch {
    message("获取登录日志失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  fetchLoginLogs();
}

function handleReset() {
  searchForm.username = "";
  searchForm.loginIp = "";
  searchForm.result = "";
  searchForm.loggedAtRange = [];
  pagination.page = 1;
  fetchLoginLogs();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchLoginLogs();
}

function handleSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.page = 1;
  fetchLoginLogs();
}

function onRefresh() {
  fetchLoginLogs();
}

onMounted(() => {
  fetchLoginLogs();
});
</script>

<template>
  <div class="log-container">
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="用户名" class="filter-item filter-item--input">
          <el-input
            v-model="searchForm.username"
            placeholder="请输入用户名"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="登录结果" class="filter-item filter-item--select">
          <el-select
            v-model="searchForm.result"
            placeholder="全部结果"
            clearable
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="item in resultOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="登录IP" class="filter-item filter-item--input">
          <el-input
            v-model="searchForm.loginIp"
            placeholder="请输入登录IP"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="登录时间" class="filter-item filter-item--date">
          <el-date-picker
            v-model="searchForm.loggedAtRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            clearable
          />
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
            <template #result="{ row }">
              <el-tag :type="resultType(row.result)" size="small">
                {{ resultLabel(row.result) }}
              </el-tag>
            </template>
            <template #reason="{ row }">
              <span>{{ reasonLabel(row) }}</span>
            </template>
            <template #loginIp="{ row }">
              <span>{{ row.loginIp || "—" }}</span>
            </template>
            <template #loginLocation="{ row }">
              <span>{{ row.loginLocation || "—" }}</span>
            </template>
            <template #browser="{ row }">
              <span>{{ row.browser || "—" }}</span>
            </template>
            <template #os="{ row }">
              <span>{{ row.os || "—" }}</span>
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
.log-container {
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

      .filter-item--date {
        :deep(.el-date-editor) {
          width: 500px;
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
    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
  }
}

@media (width <= 768px) {
  .log-container {
    .search-card {
      .search-form {
        gap: 12px;

        .filter-item--input,
        .filter-item--select,
        .filter-item--date {
          width: 100%;

          :deep(.el-input),
          :deep(.el-select),
          :deep(.el-date-editor) {
            width: 100%;
          }
        }
      }
    }
  }
}
</style>
