<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { hasAuth } from "@/router/utils";
import { message } from "@/utils/message";
import {
  getUserList,
  createUser,
  updateUser,
  deleteUser,
  type UserRecord,
  type UserFormData
} from "@/api/user";
import { getRoleList, type RoleRecord } from "@/api/role";
import type { TableColumns } from "@pureadmin/table";

defineOptions({
  name: "UserManagement"
});

// ==================== 状态 ====================

const tableRef = ref<any>(null);
const tableData = ref<UserRecord[]>([]);
const loading = ref(false);

const searchForm = reactive({
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
    prop: "name",
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
    prop: "created_at",
    width: 180
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

const dialogVisible = ref(false);
const dialogTitle = ref("");
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const submitLoading = ref(false);

const defaultFormData: UserFormData = {
  username: "",
  email: "",
  password: "",
  is_active: true,
  roles: []
};

const formData = reactive<UserFormData>({ ...defaultFormData });

// ==================== API 调用 ====================

async function fetchUsers() {
  loading.value = true;
  try {
    const params: Record<string, any> = {
      page: pagination.page,
      pageSize: pagination.pageSize
    };
    if (searchForm.keyword) params.keyword = searchForm.keyword;
    if (searchForm.status) params.status = searchForm.status;
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

function getRoleName(key: string): string {
  return roleOptions.value.find(r => r.key === key)?.name || key;
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

// ==================== 对话框操作 ====================

function resetForm() {
  Object.assign(formData, { ...defaultFormData });
  editingId.value = null;
  isEdit.value = false;
}

function openAddDialog() {
  resetForm();
  dialogTitle.value = "新增用户";
  dialogVisible.value = true;
}

function openEditDialog(row: UserRecord) {
  resetForm();
  editingId.value = row.id;
  isEdit.value = true;
  dialogTitle.value = "修改用户";

  formData.username = row.name;
  formData.email = row.email;
  formData.password = "";
  formData.is_active = row.status === "active";
  formData.roles = row.roles || [];

  dialogVisible.value = true;
}

function handleCloseDialog() {
  dialogVisible.value = false;
}

async function handleSubmitForm() {
  if (!formData.username) {
    message("请输入用户名", { type: "warning" });
    return;
  }
  if (!formData.email) {
    message("请输入邮箱", { type: "warning" });
    return;
  }
  if (!isEdit.value && !formData.password) {
    message("请输入密码", { type: "warning" });
    return;
  }

  submitLoading.value = true;
  try {
    const data: UserFormData = {
      username: formData.username,
      email: formData.email,
      is_active: formData.is_active,
      roles: formData.roles
    };
    if (formData.password) {
      data.password = formData.password;
    }
    if (isEdit.value && editingId.value) {
      await updateUser(editingId.value, data);
      message("修改成功", { type: "success" });
    } else {
      await createUser(data);
      message("新增成功", { type: "success" });
    }
    dialogVisible.value = false;
    fetchUsers();
  } catch {
    message(isEdit.value ? "修改失败" : "新增失败", { type: "error" });
  } finally {
    submitLoading.value = false;
  }
}

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
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
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
        title="用户管理"
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
              <el-tag
                :type="row.status === 'active' ? 'success' : 'danger'"
                size="small"
              >
                {{ row.status === "active" ? "正常" : "禁用" }}
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
                :title="'是否确认删除用户【' + row.name + '】？'"
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
      @close="handleCloseDialog"
    >
      <el-form :model="formData" label-width="80px" class="user-form">
        <el-form-item label="用户名">
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input
            v-model="formData.email"
            placeholder="请输入邮箱"
            maxlength="100"
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="formData.password"
            type="password"
            :placeholder="isEdit ? '留空则不修改密码' : '请输入密码'"
            maxlength="50"
            show-password
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.is_active">
            <el-radio :value="true">正常</el-radio>
            <el-radio :value="false">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="角色">
          <el-select
            v-model="formData.roles"
            multiple
            placeholder="请选择角色"
            clearable
            style="width: 100%"
            collapse-tags
            collapse-tags-tooltip
          >
            <el-option
              v-for="item in roleOptions"
              :key="item.key"
              :label="item.name"
              :value="item.key"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button
            type="primary"
            :loading="submitLoading"
            @click="handleSubmitForm"
          >
            确 定
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.user-container {
  padding: 16px;

  .search-card {
    margin-bottom: 16px;

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

.user-form {
  padding: 10px 20px 0;

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}

.dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
