<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { hasPerms } from "@/utils/auth";
import { message } from "@/utils/message";
import {
  assignUserRoles,
  createUser,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  type GenderCode,
  type StatusCode,
  type UserRecord
} from "@/api/user";
import type { RoleRecord } from "@/api/role";

defineOptions({
  name: "UserForm"
});

type UserFormMode = "create" | "edit";
type UserEditSection = "profile" | "password" | "status" | "roles";
type UserFormSuccess = {
  kind: UserFormMode;
  user: UserRecord;
  changed: UserEditSection[];
  partial?: boolean;
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
const initialFormData = ref({
  username: "",
  email: "",
  phone: "",
  gender: 0 as GenderCode,
  status: 1 as StatusCode,
  roles: [] as string[]
});

const formData = reactive<{
  username: string;
  email: string;
  phone: string;
  gender: GenderCode;
  password: string;
  status: StatusCode;
  roles: string[];
}>({
  username: "",
  email: "",
  phone: "",
  gender: 0,
  password: "",
  status: 1,
  roles: []
});

const dialogTitle = computed(() =>
  props.mode === "edit" ? "编辑用户" : "新增用户"
);
const canEditProfile = computed(
  () => props.mode === "create" || hasPerms("user:update")
);
const canResetPassword = computed(
  () => props.mode === "create" || hasPerms("user:reset_password")
);
const canEditStatus = computed(
  () => props.mode === "edit" && hasPerms("user:update_status")
);
const canAssignRoles = computed(
  () => props.mode === "edit" && hasPerms("user:assign_roles")
);

function resetForm() {
  formData.username = "";
  formData.email = "";
  formData.phone = "";
  formData.gender = 0;
  formData.password = "";
  formData.status = 1;
  formData.roles = [];
  editingId.value = null;
  initialFormData.value = {
    username: "",
    email: "",
    phone: "",
    gender: 0,
    status: 1,
    roles: []
  };
}

function initForm() {
  resetForm();

  if (props.editRow) {
    editingId.value = props.editRow.id;
    formData.username = props.editRow.username;
    formData.email = props.editRow.email;
    formData.phone = props.editRow.phone || "";
    formData.gender = props.editRow.gender;
    formData.status = props.editRow.status;
    formData.roles = [...(props.editRow.roles || [])];
    initialFormData.value = {
      username: props.editRow.username,
      email: props.editRow.email,
      phone: props.editRow.phone || "",
      gender: props.editRow.gender,
      status: props.editRow.status,
      roles: [...(props.editRow.roles || [])]
    };
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
  if (canEditProfile.value) {
    if (!formData.username.trim()) return "请输入用户名";
    if (!formData.email.trim()) return "请输入邮箱";
    if (formData.phone.trim() && !/^\d{11}$/.test(formData.phone.trim())) {
      return "请输入 11 位手机号";
    }
  }

  if (props.mode === "create") return passwordError(formData.password);

  if (canResetPassword.value && formData.password !== "") {
    return passwordError(formData.password);
  }

  return !editingId.value ? "未找到要操作的用户" : "";
}

function sameRoles(left: string[], right: string[]): boolean {
  return [...left].sort().join(",") === [...right].sort().join(",");
}

function changedSections(): UserEditSection[] {
  const changed: UserEditSection[] = [];
  const initial = initialFormData.value;

  if (
    canEditProfile.value &&
    (formData.username.trim() !== initial.username ||
      formData.email.trim() !== initial.email ||
      formData.phone.trim() !== initial.phone ||
      formData.gender !== initial.gender)
  ) {
    changed.push("profile");
  }
  if (canResetPassword.value && formData.password !== "") {
    changed.push("password");
  }
  if (canEditStatus.value && formData.status !== initial.status) {
    changed.push("status");
  }
  if (canAssignRoles.value && !sameRoles(formData.roles, initial.roles)) {
    changed.push("roles");
  }

  return changed;
}

function sectionNames(sections: UserEditSection[]): string {
  const names: Record<UserEditSection, string> = {
    profile: "基本资料",
    password: "密码",
    status: "状态",
    roles: "角色"
  };
  return sections.map(section => names[section]).join("、");
}

async function handleSubmit() {
  const error = validationError();
  if (error) {
    message(error, { type: "warning" });
    return;
  }

  submitLoading.value = true;
  const completed: UserEditSection[] = [];
  let latestUser = props.editRow;

  try {
    if (props.mode === "create") {
      const response = await createUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        password: formData.password
      });
      latestUser = response.data;
      message("用户创建成功", { type: "success" });
    } else if (editingId.value) {
      const changed = changedSections();
      if (changed.length === 0) {
        message("未检测到需要保存的修改", { type: "warning" });
        return;
      }

      if (changed.includes("profile")) {
        const response = await updateUser(editingId.value, {
          username: formData.username.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          gender: formData.gender
        });
        latestUser = response.data;
        completed.push("profile");
      }
      if (changed.includes("password")) {
        const response = await resetUserPassword(editingId.value, {
          password: formData.password
        });
        latestUser = response.data;
        completed.push("password");
      }
      if (changed.includes("status")) {
        const response = await updateUserStatus(
          editingId.value,
          formData.status
        );
        latestUser = response.data;
        completed.push("status");
      }
      if (changed.includes("roles")) {
        const response = await assignUserRoles(editingId.value, {
          roles: formData.roles
        });
        latestUser = response.data;
        completed.push("roles");
      }

      message("用户修改成功", { type: "success" });
    }

    if (!latestUser) throw new Error("missing user response");
    emit("update:visible", false);
    emit("success", { kind: props.mode, user: latestUser, changed: completed });
  } catch {
    if (completed.length > 0 && latestUser) {
      emit("update:visible", false);
      emit("success", {
        kind: "edit",
        user: latestUser,
        changed: completed,
        partial: true
      });
      message(`${sectionNames(completed)}已保存，其他修改失败，请重试`, {
        type: "warning"
      });
    } else {
      message(props.mode === "create" ? "用户创建失败" : "用户修改失败", {
        type: "error"
      });
    }
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
      <template v-if="canEditProfile">
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
        <el-form-item label="手机号码">
          <el-input
            v-model="formData.phone"
            placeholder="请输入 11 位手机号"
            maxlength="11"
          />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="formData.gender">
            <el-radio :value="0">未知</el-radio>
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
      </template>

      <el-form-item
        v-if="canResetPassword"
        :label="mode === 'create' ? '密码' : '新密码'"
      >
        <el-input
          v-model="formData.password"
          type="password"
          :placeholder="
            mode === 'create' ? '请输入至少 8 位密码' : '留空表示不修改密码'
          "
          maxlength="50"
          show-password
        />
      </el-form-item>

      <el-divider v-if="mode === 'edit' && (canEditStatus || canAssignRoles)" />

      <el-form-item v-if="canEditStatus" label="用户状态">
        <el-radio-group v-model="formData.status">
          <el-radio :value="1">正常</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="canAssignRoles" label="用户角色">
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
