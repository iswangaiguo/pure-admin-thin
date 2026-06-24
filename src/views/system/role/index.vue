<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { hasAuth } from "@/router/utils";
import { message } from "@/utils/message";
import {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  type RoleRecord,
  type RoleFormData
} from "@/api/role";
import { getMenuTree, type MenuRecord } from "@/api/menu";
import type { TableColumns } from "@pureadmin/table";

defineOptions({
  name: "RoleManagement"
});

// ==================== 状态 ====================

const tableRef = ref<any>(null);
const tableData = ref<RoleRecord[]>([]);
const loading = ref(false);
const treeRef = ref<any>(null);

const searchForm = reactive({
  keyword: ""
});

// ==================== 表格列定义 ====================

const columns = ref<TableColumns[]>([
  {
    label: "ID",
    prop: "id",
    width: 80,
    align: "center"
  },
  {
    label: "角色标识",
    prop: "key",
    minWidth: 120
  },
  {
    label: "角色名称",
    prop: "name",
    minWidth: 140
  },
  {
    label: "状态",
    prop: "status",
    slot: "status",
    width: 80,
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

const defaultFormData: RoleFormData = {
  key: "",
  name: "",
  status: "1",
  menus: []
};

const formData = reactive<RoleFormData>({ ...defaultFormData });

/** 菜单树数据 */
const menuTreeData = ref<MenuRecord[]>([]);

// ==================== API 调用 ====================

async function fetchRoles() {
  loading.value = true;
  try {
    const res = await getRoleList();
    tableData.value = (res.data || []).filter(row => {
      if (!searchForm.keyword) return true;
      const kw = searchForm.keyword.toLowerCase();
      return (
        row.key.toLowerCase().includes(kw) ||
        row.name.toLowerCase().includes(kw)
      );
    });
  } catch {
    message("获取角色列表失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function fetchMenuTree() {
  try {
    const res = await getMenuTree({ menuTypes: ["M", "C"] });
    menuTreeData.value = res.data || [];
  } catch {
    // ignore
  }
}

// ==================== 对话框操作 ====================

function resetForm() {
  Object.assign(formData, { ...defaultFormData });
  editingId.value = null;
  isEdit.value = false;
  treeRef.value?.setCheckedKeys([]);
}

function openAddDialog() {
  resetForm();
  dialogTitle.value = "新增角色";
  dialogVisible.value = true;
  nextTick(() => {
    treeRef.value?.setCheckedKeys([]);
  });
}

function openEditDialog(row: RoleRecord) {
  resetForm();
  editingId.value = row.id;
  isEdit.value = true;
  dialogTitle.value = "修改角色";

  formData.key = row.key;
  formData.name = row.name;
  formData.status = row.status;
  formData.menus = row.menus || [];

  dialogVisible.value = true;
  nextTick(() => {
    treeRef.value?.setCheckedKeys(row.menus || []);
  });
}

function handleCloseDialog() {
  dialogVisible.value = false;
}

async function handleSubmitForm() {
  if (!formData.key) {
    message("请输入角色标识", { type: "warning" });
    return;
  }
  if (!formData.name) {
    message("请输入角色名称", { type: "warning" });
    return;
  }

  submitLoading.value = true;
  try {
    const checkedKeys = treeRef.value?.getCheckedKeys() || [];
    const data: RoleFormData = {
      key: formData.key,
      name: formData.name,
      status: formData.status,
      menus: checkedKeys
    };

    if (isEdit.value && editingId.value) {
      await updateRole(editingId.value, data);
      message("修改成功", { type: "success" });
    } else {
      await createRole(data);
      message("新增成功", { type: "success" });
    }
    dialogVisible.value = false;
    fetchRoles();
  } catch {
    message(isEdit.value ? "修改失败" : "新增失败", { type: "error" });
  } finally {
    submitLoading.value = false;
  }
}

async function handleDelete(row: RoleRecord) {
  try {
    await deleteRole(row.id);
    message("删除成功", { type: "success" });
    fetchRoles();
  } catch {
    message("删除失败", { type: "error" });
  }
}

// ==================== 搜索操作 ====================

function handleSearch() {
  fetchRoles();
}

function handleReset() {
  searchForm.keyword = "";
  fetchRoles();
}

function onRefresh() {
  fetchRoles();
  fetchMenuTree();
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchRoles();
  fetchMenuTree();
});
</script>

<template>
  <div class="role-container">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="角色标识 / 角色名称"
            clearable
            @keyup.enter="handleSearch"
          />
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
        title="角色管理"
        :table-ref="tableRef"
        :columns="columns"
        @refresh="onRefresh"
      >
        <template #buttons>
          <el-button
            v-if="hasAuth('role:create')"
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
                :type="row.status === '1' ? 'success' : 'danger'"
                size="small"
              >
                {{ row.status === "1" ? "正常" : "停用" }}
              </el-tag>
            </template>
            <template #operation="{ row }">
              <el-button
                v-if="hasAuth('role:update')"
                link
                type="primary"
                size="small"
                @click="openEditDialog(row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                v-if="hasAuth('role:delete')"
                :title="'是否确认删除角色【' + row.name + '】？'"
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
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
      @close="handleCloseDialog"
    >
      <el-form :model="formData" label-width="80px" class="role-form">
        <el-form-item label="角色标识">
          <el-input
            v-model="formData.key"
            placeholder="请输入角色标识，如 admin"
            :disabled="isEdit"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item label="角色名称">
          <el-input
            v-model="formData.name"
            placeholder="请输入角色名称"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="formData.status"
            active-value="1"
            inactive-value="0"
            active-text="启用"
            inactive-text="停用"
          />
        </el-form-item>
        <el-form-item label="菜单权限">
          <el-tree
            ref="treeRef"
            :data="menuTreeData"
            :props="{ label: 'title', children: 'children' }"
            node-key="id"
            show-checkbox
            default-expand-all
            style="max-height: 300px; overflow-y: auto"
          />
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
.role-container {
  padding: 16px;

  .search-card {
    margin-bottom: 16px;

    .search-form {
      :deep(.el-form-item) {
        margin-bottom: 0;
      }
    }
  }
}

.role-form {
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
