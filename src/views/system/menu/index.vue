<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { hasAuth } from "@/router/utils";
import { message } from "@/utils/message";
import {
  getMenuTree,
  getMenuTreeSelect,
  deleteMenu,
  type MenuRecord
} from "@/api/menu";
import type { TableColumns } from "@pureadmin/table";
import MenuForm from "./form.vue";

defineOptions({
  name: "MenuManagement"
});

// ==================== 状态 ====================

const tableRef = ref<any>(null);
const tableData = ref<MenuRecord[]>([]);
const loading = ref(false);
const searchForm = reactive({
  title: "",
  isActive: ""
});

// ==================== 表格列定义 ====================

const columns = ref<TableColumns[]>([
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
    minWidth: 50,
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
    prop: "isActive",
    slot: "isActive",
    width: 80,
    align: "center"
  },
  {
    label: "操作",
    slot: "operation",
    width: 240,
    align: "center",
    fixed: "right"
  }
]);

// ==================== 对话框表单 ====================

const formVisible = ref(false);
const editRow = ref<MenuRecord | null>(null);
const parentRow = ref<MenuRecord | null>(null);

function openAddDialog(parent?: MenuRecord) {
  editRow.value = null;
  parentRow.value = parent || null;
  formVisible.value = true;
}

function openEditDialog(row: MenuRecord) {
  editRow.value = row;
  parentRow.value = null;
  formVisible.value = true;
}

function onFormSuccess() {
  formVisible.value = false;
  fetchMenuTree();
  fetchTreeSelect();
}

/** 上级菜单树数据 */
const treeSelectData = ref<any[]>([]);

// ==================== API 调用 ====================

async function fetchMenuTree() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (searchForm.title) params.title = searchForm.title;
    if (searchForm.isActive) params.isActive = searchForm.isActive;
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
  searchForm.isActive = "";
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
            v-model="searchForm.isActive"
            placeholder="菜单状态"
            clearable
            style="width: 140px"
          >
            <el-option label="正常" value="true" />
            <el-option label="停用" value="false" />
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
            <template #isActive="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'danger'" size="small">
                {{ row.isActive ? "正常" : "停用" }}
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
