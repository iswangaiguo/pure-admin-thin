<script setup lang="ts">
import { ref, reactive, onMounted, computed } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { hasAuth } from "@/router/utils";
import { message } from "@/utils/message";
import {
  getMenuTree,
  getMenuTreeSelect,
  createMenu,
  updateMenu,
  deleteMenu,
  type MenuRecord,
  type MenuFormData
} from "@/api/menu";
import type { TableColumns } from "@pureadmin/table";
import { cloneDeep } from "@pureadmin/utils";

defineOptions({
  name: "MenuManagement"
});

// ==================== 状态 ====================

const tableRef = ref<any>(null);
const tableData = ref<MenuRecord[]>([]);
const loading = ref(false);
const isExpandAll = ref(true);

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
    label: "排序",
    prop: "rank",
    width: 70,
    align: "center"
  },
  {
    label: "菜单类型",
    prop: "menuType",
    slot: "menuType",
    width: 80,
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

const dialogVisible = ref(false);
const dialogTitle = ref("");
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const submitLoading = ref(false);

const defaultFormData: MenuFormData = {
  parentId: null,
  menuType: "M",
  title: "",
  name: "",
  path: "",
  component: "",
  icon: "",
  rank: 0,
  showLink: true,
  perms: "",
  isActive: true,
  visible: true
};

const formData = reactive<MenuFormData>({ ...defaultFormData });

/** 上级菜单树数据 */
const treeSelectData = ref<any[]>([]);

/** 格式化 tree-select 标签 */
function formatTreeLabel(nodes: any[], prefix = ""): any[] {
  return nodes.map(node => {
    const label = prefix ? `${prefix} / ${node.label}` : node.label;
    return {
      ...node,
      label,
      children: node.children ? formatTreeLabel(node.children, label) : []
    };
  });
}

const formattedTreeSelect = computed(() => {
  return formatTreeLabel(cloneDeep(treeSelectData.value));
});

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

// ==================== 对话框操作 ====================

function resetForm() {
  Object.assign(formData, cloneDeep(defaultFormData));
  editingId.value = null;
  isEdit.value = false;
}

function openAddDialog(parent?: MenuRecord) {
  resetForm();
  if (parent) {
    formData.parentId = parent.id;
    // 目录下默认新建菜单，菜单下默认新建按钮
    formData.menuType = parent.menuType === "M" ? "C" : "F";
  }
  dialogTitle.value = "新增菜单";
  dialogVisible.value = true;
}

function openEditDialog(row: MenuRecord) {
  resetForm();
  editingId.value = row.id;
  isEdit.value = true;
  dialogTitle.value = "修改菜单";

  formData.parentId = row.parentId;
  formData.menuType = row.menuType;
  formData.title = row.title;
  formData.name = row.name || "";
  formData.path = row.path;
  formData.component = row.component || "";
  formData.icon = row.icon || "";
  formData.rank = row.rank;
  formData.showLink = row.showLink;
  formData.perms = row.perms || "";
  formData.isActive = row.isActive;
  formData.visible = row.visible;

  dialogVisible.value = true;
}

function handleCloseDialog() {
  dialogVisible.value = false;
}

async function handleSubmitForm() {
  // 表单验证
  if (!formData.title) {
    message("请输入菜单名称", { type: "warning" });
    return;
  }
  if (formData.menuType !== "F" && !formData.path) {
    message("请输入路由地址", { type: "warning" });
    return;
  }
  if (formData.menuType === "C" && !formData.component) {
    message("请输入组件路径", { type: "warning" });
    return;
  }

  submitLoading.value = true;
  try {
    const data = { ...formData };
    if (isEdit.value && editingId.value) {
      await updateMenu(editingId.value, data);
      message("修改成功", { type: "success" });
    } else {
      await createMenu(data);
      message("新增成功", { type: "success" });
    }
    dialogVisible.value = false;
    fetchMenuTree();
    fetchTreeSelect();
  } catch {
    message(isEdit.value ? "修改失败" : "新增失败", { type: "error" });
  } finally {
    submitLoading.value = false;
  }
}

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

function toggleExpandAll() {
  if (!tableRef.value) return;
  const rows = tableData.value;
  isExpandAll.value = !isExpandAll.value;
  toggleRows(rows, isExpandAll.value);
}

function toggleRows(data: any[], expanded: boolean) {
  data.forEach(row => {
    tableRef.value?.toggleRowExpansion(row, expanded);
    if (row.children && row.children.length > 0) {
      toggleRows(row.children, expanded);
    }
  });
}

function onRefresh() {
  fetchMenuTree();
  fetchTreeSelect();
}

// ==================== 图标选项 ====================

const iconOptions = [
  { label: "系统管理 (setting)", value: "ep:setting" },
  { label: "用户 (user)", value: "ep:user" },
  { label: "角色 (avatar)", value: "ep:avatar" },
  { label: "菜单 (menu)", value: "ep:menu" },
  { label: "权限 (lock)", value: "ep:lock" },
  { label: "文档 (document)", value: "ep:document" },
  { label: "链接 (link)", value: "ep:link" },
  { label: "图表 (data-analysis)", value: "ep:data-analysis" },
  { label: "日志 (notebook)", value: "ep:notebook" },
  { label: "监控 (monitor)", value: "ep:monitor" },
  { label: "工具 (tool)", value: "ep:tool" },
  { label: "示例 (lollipop)", value: "ep:lollipop" },
  { label: "首页 (home-filled)", value: "ep:home-filled" },
  { label: "日历 (calendar)", value: "ep:calendar" },
  { label: "消息 (bell)", value: "ep:bell" }
];

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
        title="菜单管理"
        :table-ref="tableRef"
        :columns="columns"
        :is-expand-all="isExpandAll"
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
          <el-button @click="toggleExpandAll">
            <IconifyIconOnline :icon="isExpandAll ? 'ep:fold' : 'ep:expand'" />
            {{ isExpandAll ? "折叠全部" : "展开全部" }}
          </el-button>
        </template>

        <template #default="{ size, dynamicColumns }">
          <pure-table
            ref="tableRef"
            :data="tableData"
            :columns="dynamicColumns"
            :size="size"
            row-key="id"
            :tree-props="{ children: 'children' }"
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
                    ? ''
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

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="650px"
      :close-on-click-modal="false"
      destroy-on-close
      @close="handleCloseDialog"
    >
      <el-form :model="formData" label-width="100px" class="menu-form">
        <!-- 上级菜单 -->
        <el-form-item label="上级菜单">
          <el-tree-select
            v-model="formData.parentId"
            :data="formattedTreeSelect"
            :props="{ value: 'id', label: 'label', children: 'children' }"
            placeholder="顶级菜单（留空）"
            clearable
            check-strictly
            style="width: 100%"
          />
        </el-form-item>

        <!-- 菜单类型 -->
        <el-form-item label="菜单类型">
          <el-radio-group v-model="formData.menuType" :disabled="isEdit">
            <el-radio-button value="M">目录</el-radio-button>
            <el-radio-button value="C">菜单</el-radio-button>
            <el-radio-button value="F">按钮</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- 菜单名称（必填） -->
        <el-form-item label="菜单名称">
          <el-input
            v-model="formData.title"
            placeholder="请输入菜单名称"
            maxlength="50"
          />
        </el-form-item>

        <!-- 路由地址（目录和菜单显示） -->
        <el-form-item v-if="formData.menuType !== 'F'" label="路由地址">
          <el-input
            v-model="formData.path"
            :placeholder="
              formData.menuType === 'M'
                ? '目录路径，如 /system'
                : '路由路径，如 system/user'
            "
          />
        </el-form-item>

        <!-- 组件路径（仅菜单显示） -->
        <el-form-item v-if="formData.menuType === 'C'" label="组件路径">
          <el-input
            v-model="formData.component"
            placeholder="如 system/user/index"
          />
        </el-form-item>

        <!-- 权限标识（菜单和按钮显示） -->
        <el-form-item v-if="formData.menuType !== 'M'" label="权限标识">
          <el-input
            v-model="formData.perms"
            :placeholder="
              formData.menuType === 'C' ? '如 user:list' : '如 user:create'
            "
          />
        </el-form-item>

        <!-- 菜单图标（目录和菜单显示） -->
        <el-form-item v-if="formData.menuType !== 'F'" label="菜单图标">
          <el-select
            v-model="formData.icon"
            placeholder="选择图标"
            clearable
            filterable
            allow-create
            style="width: 100%"
          >
            <el-option
              v-for="opt in iconOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <!-- 显示排序 -->
        <el-form-item label="显示排序">
          <el-input-number v-model="formData.rank" :min="0" :max="999" />
        </el-form-item>

        <!-- 显示状态（目录和菜单显示） -->
        <el-form-item v-if="formData.menuType !== 'F'" label="显示状态">
          <el-radio-group v-model="formData.visible">
            <el-radio :value="true">显示</el-radio>
            <el-radio :value="false">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 菜单状态 -->
        <el-form-item label="菜单状态">
          <el-switch
            v-model="formData.isActive"
            active-text="启用"
            inactive-text="停用"
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
.menu-container {
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

.menu-form {
  max-height: 55vh;
  padding: 10px 20px 0;
  overflow-y: auto;

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
