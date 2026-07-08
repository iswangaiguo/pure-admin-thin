<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { hasAuth } from "@/router/utils";
import { message } from "@/utils/message";
import { getRoleList, deleteRole, type RoleRecord } from "@/api/role";
import { getMenuTree, type MenuRecord } from "@/api/menu";
import { formatDateTime } from "@/utils/date";
import type { TableColumns } from "@pureadmin/table";
import RoleForm from "./form.vue";

defineOptions({
  name: "RoleManagement"
});

// ==================== 状态 ====================

const tableRef = ref<any>(null);
const tableData = ref<RoleRecord[]>([]);
const loading = ref(false);

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
    prop: "code",
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
    prop: "createdAt",
    width: 180,
    formatter: (row: RoleRecord) => formatDateTime(row.createdAt)
  },
  {
    label: "更新时间",
    prop: "updatedAt",
    width: 180,
    formatter: (row: RoleRecord) => formatDateTime(row.updatedAt)
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
const editRow = ref<RoleRecord | null>(null);

function openAddDialog() {
  editRow.value = null;
  formVisible.value = true;
}

function openEditDialog(row: RoleRecord) {
  editRow.value = row;
  formVisible.value = true;
}

function onFormSuccess() {
  formVisible.value = false;
  fetchRoles();
}

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
        row.code.toLowerCase().includes(kw) ||
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

// ==================== 删除操作 ====================

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
              <el-tag :type="row.status ? 'success' : 'danger'" size="small">
                {{ row.status ? "正常" : "停用" }}
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

    <RoleForm
      v-model:visible="formVisible"
      :menu-tree-data="menuTreeData"
      :edit-row="editRow"
      @success="onFormSuccess"
    />
  </div>
</template>

<style scoped lang="scss">
.role-container {
  padding: 8px;

  .search-card {
    margin-bottom: 8px;

    .search-form {
      :deep(.el-form-item) {
        margin-bottom: 0;
      }
    }
  }
}
</style>
