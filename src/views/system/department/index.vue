<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import type { TableColumns } from "@pureadmin/table";
import { PureTableBar } from "@/components/RePureTableBar";
import { hasPerms } from "@/utils/auth";
import { message } from "@/utils/message";
import { parseApiError } from "@/utils/formError";
import { formatDateTime } from "@/utils/date";
import {
  deleteDepartment,
  getDepartments,
  type DepartmentRecord,
  type StatusCode
} from "@/api/department";
import DepartmentForm from "./form.vue";

defineOptions({ name: "DepartmentManagement" });

const tableRef = ref<any>(null);
const tableData = ref<DepartmentRecord[]>([]);
const allDepartments = ref<DepartmentRecord[]>([]);
const loading = ref(false);
const formVisible = ref(false);
const editRow = ref<DepartmentRecord | null>(null);
const parentRow = ref<DepartmentRecord | null>(null);
const searchForm = reactive<{
  name: string;
  code: string;
  status: "" | StatusCode;
}>({
  name: "",
  code: "",
  status: ""
});

const columns = ref<TableColumns[]>([
  { label: "部门名称", prop: "name", minWidth: 220 },
  { label: "部门编码", prop: "code", minWidth: 150 },
  { label: "负责人", prop: "leader", slot: "leader", width: 130 },
  { label: "排序", prop: "sort", width: 80, align: "center" },
  { label: "状态", prop: "status", slot: "status", width: 90, align: "center" },
  {
    label: "更新时间",
    prop: "updatedAt",
    width: 180,
    formatter: (row: DepartmentRecord) => formatDateTime(row.updatedAt)
  },
  {
    label: "操作",
    slot: "operation",
    width: 200,
    align: "center",
    fixed: "right"
  }
]);

async function fetchDepartments() {
  loading.value = true;
  try {
    const response = await getDepartments(searchForm);
    tableData.value = response.data || [];
  } catch {
    message("获取部门列表失败", { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function fetchAllDepartments() {
  try {
    const response = await getDepartments();
    allDepartments.value = response.data || [];
  } catch {
    allDepartments.value = [];
  }
}

function openAdd(row?: DepartmentRecord) {
  editRow.value = null;
  parentRow.value = row || null;
  formVisible.value = true;
}

function isEffectivelyEnabled(
  id: number,
  nodes: DepartmentRecord[] = allDepartments.value,
  ancestorsEnabled = true
): boolean {
  for (const node of nodes) {
    const enabled = ancestorsEnabled && node.status === 1;
    if (node.id === id) return enabled;
    if (isEffectivelyEnabled(id, node.children || [], enabled)) return true;
  }
  return false;
}

function openEdit(row: DepartmentRecord) {
  editRow.value = row;
  parentRow.value = null;
  formVisible.value = true;
}

async function handleDelete(row: DepartmentRecord) {
  try {
    await deleteDepartment(row.id);
    message("部门删除成功", { type: "success" });
    await Promise.all([fetchDepartments(), fetchAllDepartments()]);
  } catch (error) {
    message(parseApiError(error, "部门删除失败").message, { type: "error" });
  }
}

function resetSearch() {
  Object.assign(searchForm, { name: "", code: "", status: "" });
  fetchDepartments();
}

function refresh() {
  Promise.all([fetchDepartments(), fetchAllDepartments()]);
}

onMounted(refresh);
</script>

<template>
  <div class="department-container">
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="部门名称">
          <el-input
            v-model="searchForm.name"
            clearable
            placeholder="请输入部门名称"
            @keyup.enter="fetchDepartments"
          />
        </el-form-item>
        <el-form-item label="部门编码">
          <el-input
            v-model="searchForm.code"
            clearable
            placeholder="请输入部门编码"
            @keyup.enter="fetchDepartments"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            clearable
            placeholder="部门状态"
            style="width: 130px"
          >
            <el-option label="启用" :value="1" />
            <el-option label="停用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchDepartments">
            <IconifyIconOnline icon="ep:search" />搜索
          </el-button>
          <el-button @click="resetSearch"
            ><IconifyIconOnline icon="ep:refresh" />重置</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <PureTableBar :table-ref="tableRef" :columns="columns" @refresh="refresh">
        <template #buttons>
          <el-button
            v-if="hasPerms('department:create')"
            type="primary"
            @click="openAdd()"
          >
            <IconifyIconOnline icon="ep:plus" />新增
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
          >
            <template #leader="{ row }">
              <span>{{ row.leader?.username || "—" }}</span>
            </template>
            <template #status="{ row }">
              <el-tag
                :type="row.status === 1 ? 'success' : 'danger'"
                size="small"
              >
                {{ row.status === 1 ? "启用" : "停用" }}
              </el-tag>
            </template>
            <template #operation="{ row }">
              <el-button
                v-if="hasPerms('department:create')"
                link
                type="primary"
                size="small"
                :disabled="!isEffectivelyEnabled(row.id)"
                @click="openAdd(row)"
                >新增下级</el-button
              >
              <el-button
                v-if="hasPerms('department:update')"
                link
                type="primary"
                size="small"
                @click="openEdit(row)"
                >编辑</el-button
              >
              <el-popconfirm
                v-if="hasPerms('department:delete')"
                :title="`是否确认删除部门【${row.name}】？`"
                @confirm="handleDelete(row)"
              >
                <template #reference
                  ><el-button link type="danger" size="small"
                    >删除</el-button
                  ></template
                >
              </el-popconfirm>
            </template>
          </pure-table>
        </template>
      </PureTableBar>
    </el-card>

    <DepartmentForm
      v-model:visible="formVisible"
      :edit-row="editRow"
      :parent-row="parentRow"
      :departments="allDepartments"
      @success="refresh"
    />
  </div>
</template>

<style scoped lang="scss">
.department-container {
  padding: 8px;
}

.search-card {
  margin-bottom: 8px;
}

.search-form :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
