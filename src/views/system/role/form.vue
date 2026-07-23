<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from "vue";
import { message } from "@/utils/message";
import {
  applyApiFieldErrors,
  isServerError,
  parseApiError
} from "@/utils/formError";
import {
  createRole,
  updateRole,
  updateRoleMenus,
  type RoleFormData,
  type RoleRecord
} from "@/api/role";
import type { MenuRecord } from "@/api/menu";
import { BINARY_STATUS } from "@/api/status";

defineOptions({
  name: "RoleForm"
});

type RoleFormMode = "create" | "metadata" | "permissions";
type RoleFormField = "code" | "name" | "status" | "menus";
type ValidationIssue = {
  field?: RoleFormField;
  message: string;
};

type RoleFormSuccess = {
  kind: RoleFormMode;
  role: RoleRecord;
};

const props = withDefaults(
  defineProps<{
    visible: boolean;
    mode?: RoleFormMode;
    menuTreeData?: MenuRecord[];
    editRow?: RoleRecord | null;
  }>(),
  {
    mode: "create",
    menuTreeData: () => [],
    editRow: null
  }
);

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "success", result: RoleFormSuccess): void;
}>();

const treeRef = ref<any>(null);
const submitLoading = ref(false);

const defaultFormData: RoleFormData = {
  code: "",
  name: "",
  status: BINARY_STATUS.ENABLED
};

const formData = reactive<RoleFormData>({ ...defaultFormData });
const editingId = ref<number | null>(null);
const fieldErrors = reactive<Record<RoleFormField, string>>({
  code: "",
  name: "",
  status: "",
  menus: ""
});
const roleApiFieldMap: Record<string, RoleFormField> = {
  code: "code",
  name: "name",
  status: "status",
  menus: "menus",
  menuIds: "menus"
};

const isCreate = computed(() => props.mode === "create");
const isPermissionMode = computed(() => props.mode === "permissions");
const dialogTitle = computed(() => {
  if (props.mode === "permissions") return "分配角色权限";
  if (props.mode === "metadata") return "修改角色资料";
  return "新增角色";
});

function clearFieldError(field: RoleFormField) {
  fieldErrors[field] = "";
}

function clearFieldErrors() {
  Object.keys(fieldErrors).forEach(field => {
    clearFieldError(field as RoleFormField);
  });
}

function resetForm() {
  clearFieldErrors();
  Object.assign(formData, { ...defaultFormData });
  editingId.value = null;
  treeRef.value?.setCheckedKeys([]);
}

function setCurrentPermissionSelection() {
  if (!props.visible || !isPermissionMode.value) return;

  nextTick(() => {
    treeRef.value?.setCheckedKeys(props.editRow?.menus || []);
  });
}

function initForm() {
  resetForm();

  if (props.editRow) {
    editingId.value = props.editRow.id;
    formData.code = props.editRow.code;
    formData.name = props.editRow.name;
    formData.status = props.editRow.status;
  }

  setCurrentPermissionSelection();
}

watch(
  () => props.visible,
  visible => {
    if (visible) initForm();
  }
);

watch(
  () => props.menuTreeData,
  () => setCurrentPermissionSelection(),
  { deep: true }
);

function handleCancel() {
  emit("update:visible", false);
}

function validationError(): ValidationIssue | null {
  if (isPermissionMode.value) {
    return editingId.value ? null : { message: "未找到要分配权限的角色" };
  }
  if (!formData.code.trim()) {
    return { field: "code", message: "请输入角色标识" };
  }
  if (!formData.name.trim()) {
    return { field: "name", message: "请输入角色名称" };
  }
  return null;
}

function failureMessage(): string {
  if (props.mode === "permissions") return "权限分配失败";
  if (props.mode === "metadata") return "角色资料修改失败";
  return "角色创建失败";
}

function showApiError(error: unknown) {
  const apiError = parseApiError(error, failureMessage());
  const hasFieldErrors =
    !isServerError(apiError.status) &&
    applyApiFieldErrors(fieldErrors, apiError.fieldErrors, roleApiFieldMap);

  if (!hasFieldErrors) {
    message(apiError.message, { type: "error" });
  }
}

async function handleSubmit() {
  clearFieldErrors();
  const issue = validationError();
  if (issue) {
    if (issue.field) {
      fieldErrors[issue.field] = issue.message;
    } else {
      message(issue.message, { type: "warning" });
    }
    return;
  }

  submitLoading.value = true;
  try {
    let role: RoleRecord;

    if (props.mode === "permissions" && editingId.value) {
      // check-strictly 保证提交的是用户明确勾选的节点，不隐式扩大 F 权限。
      const menuIds = (treeRef.value?.getCheckedKeys() || []).map(Number);
      const response = await updateRoleMenus(editingId.value, { menuIds });
      role = response.data;
      message("权限分配成功", { type: "success" });
    } else {
      const metadata: RoleFormData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        status: formData.status
      };

      if (props.mode === "metadata" && editingId.value) {
        const response = await updateRole(editingId.value, metadata);
        role = response.data;
        message("角色资料修改成功", { type: "success" });
      } else {
        const response = await createRole(metadata);
        role = response.data;
        message("角色创建成功，请按需分配权限", { type: "success" });
      }
    }

    emit("update:visible", false);
    emit("success", { kind: props.mode, role });
  } catch (error) {
    // 每个模式只执行一个命令，因此不会把部分成功误报为整体失败。
    showApiError(error);
  } finally {
    submitLoading.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="640px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="handleCancel"
    @close="handleCancel"
  >
    <el-form :model="formData" label-width="90px" class="role-form">
      <template v-if="!isPermissionMode">
        <el-form-item label="角色标识" :error="fieldErrors.code">
          <el-input
            v-model="formData.code"
            placeholder="请输入角色标识，如 auditor"
            :disabled="!isCreate"
            maxlength="50"
            @input="clearFieldError('code')"
          />
        </el-form-item>
        <el-form-item label="角色名称" :error="fieldErrors.name">
          <el-input
            v-model="formData.name"
            placeholder="请输入角色名称"
            maxlength="50"
            @input="clearFieldError('name')"
          />
        </el-form-item>
        <el-form-item label="状态" :error="fieldErrors.status">
          <el-switch
            v-model="formData.status"
            :active-value="1"
            :inactive-value="0"
            @change="clearFieldError('status')"
          />
        </el-form-item>
      </template>

      <template v-else>
        <el-alert
          :title="`正在为角色【${formData.name}】分配权限`"
          description="目录、菜单和按钮权限均为独立节点；仅提交明确勾选的节点。"
          type="info"
          :closable="false"
          show-icon
          class="permission-alert"
        />
        <el-form-item
          label="权限节点"
          class="menu-permission-item"
          :error="fieldErrors.menus"
        >
          <div class="menu-tree-container">
            <el-tree
              ref="treeRef"
              :data="menuTreeData"
              :props="{ label: 'title', children: 'children' }"
              node-key="id"
              show-checkbox
              check-strictly
              default-expand-all
              class="menu-tree"
              @check="clearFieldError('menus')"
            >
              <template #default="{ data }">
                <span class="permission-node">
                  <span>{{ data.title }}</span>
                  <el-tag
                    v-if="data.menuType === 'F'"
                    type="warning"
                    size="small"
                  >
                    按钮
                  </el-tag>
                  <code v-if="data.menuType === 'F' && data.perms">
                    {{ data.perms }}
                  </code>
                </span>
              </template>
            </el-tree>
          </div>
        </el-form-item>
      </template>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取 消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
        >
          {{ isPermissionMode ? "保存权限" : "保 存" }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.role-form {
  padding: 10px 20px 0;

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}

.permission-alert {
  margin-bottom: 18px;
}

.menu-permission-item {
  :deep(.el-form-item__content) {
    min-width: 0;
  }
}

.menu-tree-container {
  width: 100%;
  max-height: 360px;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.menu-tree {
  width: 100%;
  padding: 8px;
}

.permission-node {
  display: inline-flex;
  gap: 8px;
  align-items: center;

  code {
    color: var(--el-text-color-secondary);
  }
}

.dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
