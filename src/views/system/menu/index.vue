<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { hasAuth, initRouter } from "@/router/utils";
import { resetRouter, router } from "@/router";
import { useUserStoreHook } from "@/store/modules/user";
import { message } from "@/utils/message";
import { storageLocal } from "@pureadmin/utils";
import {
  getMenuTree,
  getMenuTreeSelect,
  deleteMenu,
  type StatusCode,
  type MenuRecord
} from "@/api/menu";
import { formatDateTime } from "@/utils/date";
import type { TableColumns } from "@pureadmin/table";
import MenuForm from "./form.vue";

type MenuFormMode = "create" | "metadata" | "permissions";
type MenuFormSuccess = {
  kind: MenuFormMode;
  menu: MenuRecord;
};

defineOptions({
  name: "MenuManagement"
});

// ==================== 状态 ====================

const tableRef = ref<any>(null);
const tableData = ref<MenuRecord[]>([]);
const loading = ref(false);
const searchForm = reactive<{
  title: string;
  status: "" | StatusCode;
}>({
  title: "",
  status: ""
});

// ==================== 表格列定义 ====================

const columns = ref<TableColumns[]>(
  (
    [
      {
        label: "菜单名称",
        prop: "title",
        slot: "title",
        minWidth: 200,
        align: "left"
      },
      {
        label: "菜单类型",
        prop: "menuType",
        slot: "menuType",
        width: 90,
        align: "center"
      },
      {
        label: "权限标识",
        prop: "perms",
        minWidth: 160,
        showOverflowTooltip: true
      },
      {
        label: "组件路径",
        prop: "component",
        minWidth: 180,
        showOverflowTooltip: true
      },
      {
        label: "排序",
        prop: "rank",
        width: 70,
        align: "center"
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
        formatter: (row: MenuRecord) => formatDateTime(row.createdAt)
      },
      {
        label: "更新时间",
        prop: "updatedAt",
        width: 180,
        formatter: (row: MenuRecord) => formatDateTime(row.updatedAt)
      },
      {
        label: "操作",
        slot: "operation",
        width: 270,
        align: "center",
        fixed: "right"
      }
    ] satisfies TableColumns[]
  ).filter(column => column.prop !== "perms" || hasAuth("permission:manage"))
);

// ==================== 对话框表单 ====================

const formVisible = ref(false);
const editRow = ref<MenuRecord | null>(null);
const parentRow = ref<MenuRecord | null>(null);
const formMode = ref<MenuFormMode>("create");

function openAddDialog(parent?: MenuRecord) {
  editRow.value = null;
  parentRow.value = parent || null;
  formMode.value = "create";
  formVisible.value = true;
}

function openEditDialog(row: MenuRecord) {
  editRow.value = row;
  parentRow.value = null;
  formMode.value = "metadata";
  formVisible.value = true;
}

function openPermissionDialog(row: MenuRecord) {
  editRow.value = row;
  parentRow.value = null;
  formMode.value = "permissions";
  formVisible.value = true;
}

async function refreshCurrentAccess() {
  await useUserStoreHook().handRefreshToken();
  storageLocal().removeItem("async-routes");

  const currentFullPath = router.currentRoute.value.fullPath;
  resetRouter();
  await initRouter();
  await router.replace(`/redirect${currentFullPath}`);
}

async function onFormSuccess(result: MenuFormSuccess) {
  formVisible.value = false;
  await Promise.all([fetchMenuTree(), fetchTreeSelect()]);

  if (result.kind === "permissions") {
    try {
      await refreshCurrentAccess();
    } catch {
      message("权限标识已保存，但当前会话刷新失败，请重新登录", {
        type: "warning"
      });
    }
  }
}

/** 上级菜单树数据 */
const treeSelectData = ref<any[]>([]);

// ==================== API 调用 ====================

async function fetchMenuTree() {
  loading.value = true;
  try {
    const params: Record<string, string | number> = {};
    if (searchForm.title) params.title = searchForm.title;
    if (searchForm.status !== "") params.status = searchForm.status;
    const res = await getMenuTree(params);
    tableData.value = res.data || [];
  } catch {
    message("获取菜单列表失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function fetchTreeSelect() {
  try {
    const res = await getMenuTreeSelect();
    treeSelectData.value = res.data || [];
  } catch {
    // ignore
  }
}

// ==================== 删除操作 ====================

async function handleDelete(row: MenuRecord) {
  try {
    await deleteMenu(row.id);
    message("删除成功", { type: "success" });
    fetchMenuTree();
    fetchTreeSelect();
  } catch {
    message("删除失败", { type: "error" });
  }
}

// ==================== 搜索操作 ====================

function handleSearch() {
  fetchMenuTree();
}

function handleReset() {
  searchForm.title = "";
  searchForm.status = "";
  fetchMenuTree();
}

function onRefresh() {
  fetchMenuTree();
  fetchTreeSelect();
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchMenuTree();
  fetchTreeSelect();
});
</script>

<template>
  <div class="menu-container">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="菜单名称">
          <el-input
            v-model="searchForm.title"
            placeholder="请输入菜单名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="菜单状态"
            clearable
            style="width: 140px"
          >
            <el-option label="正常" :value="1" />
            <el-option label="停用" :value="0" />
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
        :table-ref="tableRef?.getTableRef()"
        :columns="columns"
        @refresh="onRefresh"
      >
        <template #buttons>
          <el-button
            v-if="hasAuth('menu:create')"
            type="primary"
            @click="openAddDialog()"
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
            :tree-props="{
              children: 'children',
              hasChildren: 'hasChildren',
              checkStrictly: false
            }"
            :default-expand-all="true"
            :loading="loading"
            border
            highlight-current-row
          >
            <!-- 菜单名称列 -->
            <template #title="{ row }">
              <span class="menu-name-cell">
                <IconifyIconOnline
                  v-if="row.icon"
                  :icon="row.icon"
                  class="mr-1"
                />
                <span>{{ row.title }}</span>
              </span>
            </template>

            <!-- 图标列 -->
            <template #icon="{ row }">
              <span v-if="row.icon" class="icon-cell">{{ row.icon }}</span>
              <span v-else class="text-gray-400">—</span>
            </template>

            <!-- 菜单类型列 -->
            <template #menuType="{ row }">
              <el-tag
                :type="
                  row.menuType === 'M'
                    ? 'info'
                    : row.menuType === 'C'
                      ? 'success'
                      : 'warning'
                "
                size="small"
              >
                {{
                  row.menuType === "M"
                    ? "目录"
                    : row.menuType === "C"
                      ? "菜单"
                      : "按钮"
                }}
              </el-tag>
            </template>

            <!-- 状态列 -->
            <template #status="{ row }">
              <el-tag
                :type="row.status === 1 ? 'success' : 'danger'"
                size="small"
              >
                {{ row.status === 1 ? "正常" : "停用" }}
              </el-tag>
            </template>

            <!-- 操作列 -->
            <template #operation="{ row }">
              <el-button
                v-if="hasAuth('menu:create') && row.menuType !== 'F'"
                link
                type="primary"
                size="small"
                @click="openAddDialog(row)"
              >
                新增
              </el-button>
              <el-button
                v-if="hasAuth('menu:update')"
                link
                type="primary"
                size="small"
                @click="openEditDialog(row)"
              >
                编辑
              </el-button>
              <el-button
                v-if="hasAuth('permission:manage')"
                link
                type="warning"
                size="small"
                @click="openPermissionDialog(row)"
              >
                权限标识
              </el-button>
              <el-popconfirm
                v-if="hasAuth('menu:delete')"
                :title="'是否确认删除菜单【' + row.title + '】？'"
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

    <MenuForm
      v-model:visible="formVisible"
      :mode="formMode"
      :tree-select-data="treeSelectData"
      :edit-row="editRow"
      :parent-row="parentRow"
      @success="onFormSuccess"
    />
  </div>
</template>

<style scoped lang="scss">
.menu-container {
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
    :deep(.el-table__cell) {
      .cell {
        display: flex;
        align-items: center;
      }
    }
  }
}

.menu-name-cell {
  display: inline-flex;
  align-items: center;
}

.icon-cell {
  font-size: 16px;
}
</style>
