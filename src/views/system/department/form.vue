<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { message } from "@/utils/message";
import {
  applyApiFieldErrors,
  isServerError,
  parseApiError
} from "@/utils/formError";
import {
  createDepartment,
  getLeaderCandidates,
  updateDepartment,
  type DepartmentFormData,
  type DepartmentLeader,
  type DepartmentRecord,
  type StatusCode
} from "@/api/department";

defineOptions({ name: "DepartmentForm" });

type FormField = "parentId" | "name" | "code" | "leaderId" | "sort" | "status";
type ParentOption = {
  id: number;
  name: string;
  disabled: boolean;
  children: ParentOption[];
};

const props = withDefaults(
  defineProps<{
    visible: boolean;
    editRow?: DepartmentRecord | null;
    parentRow?: DepartmentRecord | null;
    departments?: DepartmentRecord[];
  }>(),
  { editRow: null, parentRow: null, departments: () => [] }
);

const emit = defineEmits<{
  (event: "update:visible", value: boolean): void;
  (event: "success"): void;
}>();

const submitLoading = ref(false);
const leaderLoading = ref(false);
const leaderOptions = ref<DepartmentLeader[]>([]);
const formData = reactive<DepartmentFormData>({
  parentId: null,
  name: "",
  code: "",
  leaderId: null,
  sort: 0,
  status: 1
});
const fieldErrors = reactive<Record<FormField, string>>({
  parentId: "",
  name: "",
  code: "",
  leaderId: "",
  sort: "",
  status: ""
});

const isEdit = computed(() => Boolean(props.editRow));
const dialogTitle = computed(() => (isEdit.value ? "编辑部门" : "新增部门"));

const parentOptions = computed(() =>
  buildParentOptions(props.departments, true).filter(Boolean)
);

function buildParentOptions(
  nodes: DepartmentRecord[],
  ancestorsEnabled: boolean
): ParentOption[] {
  return nodes.flatMap(node => {
    if (node.id === props.editRow?.id) return [];
    const effectiveEnabled = ancestorsEnabled && node.status === 1;
    return [
      {
        id: node.id,
        name: node.name,
        disabled: !effectiveEnabled,
        children: buildParentOptions(node.children || [], effectiveEnabled)
      }
    ];
  });
}

function clearErrors() {
  Object.keys(fieldErrors).forEach(key => (fieldErrors[key as FormField] = ""));
}

function resetForm() {
  clearErrors();
  Object.assign(formData, {
    parentId: props.editRow?.parentId ?? props.parentRow?.id ?? null,
    name: props.editRow?.name ?? "",
    code: props.editRow?.code ?? "",
    leaderId: props.editRow?.leaderId ?? null,
    sort: props.editRow?.sort ?? 0,
    status: (props.editRow?.status ?? 1) as StatusCode
  });
  leaderOptions.value = [];
}

async function fetchLeaders() {
  if (!props.editRow) return;
  leaderLoading.value = true;
  try {
    const response = await getLeaderCandidates(props.editRow.id);
    leaderOptions.value = response.data || [];
  } catch {
    leaderOptions.value = [];
  } finally {
    leaderLoading.value = false;
  }
}

watch(
  () => props.visible,
  visible => {
    if (visible) {
      resetForm();
      fetchLeaders();
    }
  }
);

function close() {
  emit("update:visible", false);
}

function validate(): boolean {
  clearErrors();
  if (!formData.name.trim()) fieldErrors.name = "请输入部门名称";
  if (!formData.code.trim()) fieldErrors.code = "请输入部门编码";
  else if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(formData.code.trim())) {
    fieldErrors.code = "仅允许字母、数字、短横线和下划线";
  }
  return !Object.values(fieldErrors).some(Boolean);
}

function showError(error: unknown) {
  const apiError = parseApiError(
    error,
    isEdit.value ? "部门修改失败" : "部门创建失败"
  );
  const mapped =
    !isServerError(apiError.status) &&
    applyApiFieldErrors(fieldErrors, apiError.fieldErrors, {
      parentId: "parentId",
      name: "name",
      code: "code",
      leaderId: "leaderId",
      sort: "sort",
      status: "status"
    });
  if (!mapped) message(apiError.message, { type: "error" });
}

async function submit() {
  if (!validate()) return;
  submitLoading.value = true;
  const data: DepartmentFormData = {
    parentId: formData.parentId || null,
    name: formData.name.trim(),
    code: formData.code.trim(),
    sort: formData.sort,
    status: formData.status,
    ...(isEdit.value ? { leaderId: formData.leaderId || null } : {})
  };

  try {
    if (props.editRow) await updateDepartment(props.editRow.id, data);
    else await createDepartment(data);
    message(isEdit.value ? "部门修改成功" : "部门创建成功", {
      type: "success"
    });
    emit("update:visible", false);
    emit("success");
  } catch (error) {
    showError(error);
  } finally {
    submitLoading.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="560px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="close"
    @close="close"
  >
    <el-form :model="formData" label-width="90px" class="department-form">
      <el-form-item label="上级部门" :error="fieldErrors.parentId">
        <el-tree-select
          v-model="formData.parentId"
          :data="parentOptions"
          :props="{
            value: 'id',
            label: 'name',
            children: 'children',
            disabled: 'disabled'
          }"
          placeholder="顶级部门（留空）"
          clearable
          check-strictly
          default-expand-all
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="部门名称" :error="fieldErrors.name">
        <el-input
          v-model="formData.name"
          maxlength="100"
          placeholder="请输入部门名称"
        />
      </el-form-item>
      <el-form-item label="部门编码" :error="fieldErrors.code">
        <el-input
          v-model="formData.code"
          maxlength="50"
          placeholder="如 rd-platform"
        />
      </el-form-item>
      <el-form-item v-if="isEdit" label="负责人" :error="fieldErrors.leaderId">
        <el-select
          v-model="formData.leaderId"
          :loading="leaderLoading"
          placeholder="请选择该部门直属成员"
          clearable
          style="width: 100%"
        >
          <el-option
            v-for="user in leaderOptions"
            :key="user.id"
            :label="user.username"
            :value="user.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="显示排序" :error="fieldErrors.sort">
        <el-input-number v-model="formData.sort" :min="0" :max="9999" />
      </el-form-item>
      <el-form-item label="部门状态" :error="fieldErrors.status">
        <el-radio-group v-model="formData.status">
          <el-radio :value="1">启用</el-radio>
          <el-radio :value="0">停用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-alert
        v-if="!isEdit"
        title="创建部门并分配成员后，可再次编辑设置负责人"
        type="info"
        :closable="false"
        show-icon
      />
    </el-form>
    <template #footer>
      <el-button @click="close">取 消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="submit"
        >保 存</el-button
      >
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.department-form {
  padding: 10px 20px 0;
}
</style>
