<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { hasAuth } from "@/router/utils";
import { message } from "@/utils/message";
import { getUserList, deleteUser, type UserRecord } from "@/api/user";
import { getRoleList, type RoleRecord } from "@/api/role";
import { formatDateTime } from "@/utils/date";
import type { TableColumns } from "@pureadmin/table";
import UserForm from "./form.vue";

defineOptions({
  name: "UserManagement"
});

// ==================== 状态 ====================

const tableRef = ref<any>(null);
const tableData = ref<UserRecord[]>([]);
const loading = ref(false);

const searchForm = reactive<{
  keyword: string;
  status: "" | boolean;
}>({
  keyword: "",
  status: ""
});

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
});

const roleOptions = ref<RoleRecord[]>([]);

// ==================== 表格列定义 ====================

const columns = ref<TableColumns[]>([
  {
    label: "ID",
    prop: "id",
    width: 80,
    align: "center"
  },
  {
    label: "用户名",
    prop: "username",
    minWidth: 120
  },
  {
    label: "邮箱",
    prop: "email",
    minWidth: 180,
    showOverflowTooltip: true
  },
  {
    label: "状态",
    prop: "status",
    slot: "status",
    width: 80,
    align: "center"
  },
  {
    label: "角色",
    prop: "role",
    slot: "role",
    width: 100,
    align: "center"
  },
  {
    label: "创建时间",
    prop: "createdAt",
    width: 180,
    formatter: (row: UserRecord) => formatDateTime(row.createdAt)
  },
  {
    label: "操作",
    slot: "operation",
    width: 180,
    align: "center",
    fixed: "right"
  }
]);

// ==================== 对话框表单 ====================

const formVisible = ref(false);
const editRow = ref<UserRecord | null>(null);

function openAddDialog() {
  editRow.value = null;
  formVisible.value = true;
}

function openEditDialog(row: UserRecord) {
  editRow.value = row;
  formVisible.value = true;
}

function onFormSuccess() {
  formVisible.value = false;
  fetchUsers();
}

// ==================== API 调用 ====================

async function fetchUsers() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.pageSize
    };
    if (searchForm.keyword) params.keyword = searchForm.keyword;
    if (searchForm.status !== "") params.status = searchForm.status;
    const res = await getUserList(params);
    tableData.value = res.data || [];
    pagination.total = res.meta?.total || 0;
  } catch {
    message("获取用户列表失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function fetchRoles() {
  try {
    const res = await getRoleList();
    roleOptions.value = res.data || [];
  } catch {
    // ignore
  }
}

function getRoleName(code: string): string {
  return roleOptions.value.find(r => r.code === code)?.name || code;
}

// ==================== 搜索操作 ====================

function handleSearch() {
  pagination.page = 1;
  fetchUsers();
}

function handleReset() {
  searchForm.keyword = "";
  searchForm.status = "";
  pagination.page = 1;
  fetchUsers();
}

function handlePageChange(page: number) {
  pagination.page = page;
  fetchUsers();
}

function handleSizeChange(size: number) {
  pagination.pageSize = size;
  pagination.page = 1;
  fetchUsers();
}

function onRefresh() {
  fetchUsers();
  fetchRoles();
}

// ==================== 删除操作 ====================

async function handleDelete(row: UserRecord) {
  try {
    await deleteUser(row.id);
    message("删除成功", { type: "success" });
    if (tableData.value.length === 1 && pagination.page > 1) {
      pagination.page--;
    }
    fetchUsers();
  } catch {
    message("删除失败", { type: "error" });
  }
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchUsers();
  fetchRoles();
});
</script>

<template>
  <div class="user-container">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="用户名 / 邮箱"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="用户状态"
            clearable
            style="width: 140px"
          >
            <el-option label="全部" value="" />
            <el-option label="正常" :value="true" />
            <el-option label="禁用" :value="false" />
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

    <!-- 表格区域 -->
    <el-card shadow="never" class="table-card">
      <PureTableBar
        :table-ref="tableRef"
        :columns="columns"
        @refresh="onRefresh"
      >
        <template #buttons>
          <el-button
            v-if="hasAuth('user:create')"
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
            <template #status="{ row }">
              <el-tag :type="row.status ? 'success' : 'danger'" size="small">
                {{ row.status ? "正常" : "禁用" }}
              </el-tag>
            </template>
            <template #role="{ row }">
              <template v-if="row.roles && row.roles.length">
                <el-tag
                  v-for="roleKey in row.roles"
                  :key="roleKey"
                  size="small"
                  class="mr-1"
                >
                  {{ getRoleName(roleKey) }}
                </el-tag>
              </template>
              <span v-else class="text-gray-400">—</span>
            </template>
            <template #operation="{ row }">
              <el-button
                v-if="hasAuth('user:update')"
                link
                type="primary"
                size="small"
                @click="openEditDialog(row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                v-if="hasAuth('user:delete')"
                :title="'是否确认删除用户【' + row.username + '】？'"
                @confirm="handleDelete(row)"
              >
                <template #reference>
                  <el-button link type="danger" size="small"> 删除 </el-button>
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

    <UserForm
      v-model:visible="formVisible"
      :role-options="roleOptions"
      :edit-row="editRow"
      @success="onFormSuccess"
    />
  </div>
</template>

<style scoped lang="scss">
.user-container {
  padding: 8px;

  .search-card {
    margin-bottom: 8px;

    .search-form {
      :deep(.el-form-item) {
        margin-bottom: 0;
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
</style>
