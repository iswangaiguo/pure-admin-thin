<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { message } from "@/utils/message";
import {
  assignUserRoles,
  createUser,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  type StatusCode,
  type UserRecord
} from "@/api/user";
import type { RoleRecord } from "@/api/role";

defineOptions({
  name: "UserForm"
});

type UserFormMode = "create" | "profile" | "password" | "status" | "roles";
type UserFormSuccess = {
  kind: UserFormMode;
  user: UserRecord;
};

const props = withDefaults(
  defineProps<{
    visible: boolean;
    mode?: UserFormMode;
    roleOptions?: RoleRecord[];
    editRow?: UserRecord | null;
  }>(),
  {
    mode: "create",
    roleOptions: () => [],
    editRow: null
  }
);

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "success", result: UserFormSuccess): void;
}>();

const submitLoading = ref(false);
const editingId = ref<number | null>(null);
const PASSWORD_MIN_LENGTH = 8;

const formData = reactive<{
  username: string;
  email: string;
  password: string;
  status: StatusCode;
  roles: string[];
}>({
  username: "",
  email: "",
  password: "",
  status: 1,
  roles: []
});

const dialogTitle = computed(() => {
  switch (props.mode) {
    case "profile":
      return "修改用户资料";
    case "password":
      return "重置用户密码";
    case "status":
      return "更新用户状态";
    case "roles":
      return "分配用户角色";
    default:
      return "新增用户";
  }
});

function resetForm() {
  formData.username = "";
  formData.email = "";
  formData.password = "";
  formData.status = 1;
  formData.roles = [];
  editingId.value = null;
}

function initForm() {
  resetForm();

  if (props.editRow) {
    editingId.value = props.editRow.id;
    formData.username = props.editRow.username;
    formData.email = props.editRow.email;
    formData.status = props.editRow.status;
    formData.roles = [...(props.editRow.roles || [])];
  }
}

watch(
  () => props.visible,
  visible => {
    if (visible) initForm();
  }
);

function handleCancel() {
  emit("update:visible", false);
}

function passwordError(password: string) {
  if (password.trim() === "") return "密码不能全为空白字符";
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `密码长度至少${PASSWORD_MIN_LENGTH}位`;
  }
  return "";
}

function validationError(): string {
  if (props.mode === "create" || props.mode === "profile") {
    if (!formData.username.trim()) return "请输入用户名";
    if (!formData.email.trim()) return "请输入邮箱";
  }

  if (props.mode === "create" || props.mode === "password") {
    return passwordError(formData.password);
  }

  return !editingId.value ? "未找到要操作的用户" : "";
}

function failureMessage(): string {
  switch (props.mode) {
    case "profile":
      return "用户资料修改失败";
    case "password":
      return "密码重置失败";
    case "status":
      return "用户状态更新失败";
    case "roles":
      return "角色分配失败";
    default:
      return "用户创建失败";
  }
}

async function handleSubmit() {
  const error = validationError();
  if (error) {
    message(error, { type: "warning" });
    return;
  }

  submitLoading.value = true;
  try {
    let user: UserRecord;

    if (props.mode === "profile" && editingId.value) {
      const response = await updateUser(editingId.value, {
        username: formData.username.trim(),
        email: formData.email.trim()
      });
      user = response.data;
      message("用户资料修改成功", { type: "success" });
    } else if (props.mode === "password" && editingId.value) {
      const response = await resetUserPassword(editingId.value, {
        password: formData.password
      });
      user = response.data;
      message("密码重置成功", { type: "success" });
    } else if (props.mode === "status" && editingId.value) {
      const response = await updateUserStatus(editingId.value, formData.status);
      user = response.data;
      message("用户状态更新成功", { type: "success" });
    } else if (props.mode === "roles" && editingId.value) {
      const response = await assignUserRoles(editingId.value, {
        roles: formData.roles
      });
      user = response.data;
      message("角色分配成功", { type: "success" });
    } else {
      // 创建只提交创建所需字段；状态与角色由各自受控命令后续处理。
      const response = await createUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password
      });
      user = response.data;
      message("用户创建成功", { type: "success" });
    }

    emit("update:visible", false);
    emit("success", { kind: props.mode, user });
  } catch {
    message(failureMessage(), { type: "error" });
  } finally {
    submitLoading.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="520px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="handleCancel"
    @close="handleCancel"
  >
    <el-form :model="formData" label-width="90px" class="user-form">
      <template v-if="mode === 'create' || mode === 'profile'">
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
      </template>

      <el-form-item
        v-if="mode === 'create' || mode === 'password'"
        label="密码"
      >
        <el-input
          v-model="formData.password"
          type="password"
          placeholder="请输入至少 8 位密码"
          maxlength="50"
          show-password
        />
      </el-form-item>

      <el-form-item v-if="mode === 'status'" label="用户状态">
        <el-radio-group v-model="formData.status">
          <el-radio :value="1">正常</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="mode === 'roles'" label="用户角色">
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
            :key="item.code"
            :label="item.name"
            :value="item.code"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取 消</el-button>
        <el-button
          type="primary"
          :loading="submitLoading"
          @click="handleSubmit"
        >
          保 存
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
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
