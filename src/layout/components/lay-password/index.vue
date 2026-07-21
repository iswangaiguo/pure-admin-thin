<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { changeOwnPassword } from "@/api/user";
import { emitter } from "@/utils/mitt";
import { message } from "@/utils/message";
import {
  applyApiFieldErrors,
  isServerError,
  parseApiError
} from "@/utils/formError";
import { useUserStoreHook } from "@/store/modules/user";

defineOptions({
  name: "LayPassword"
});

type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";
type PasswordApiError = {
  response?: {
    data?: {
      errors?: {
        code?: string;
      };
    };
  };
};

const visible = ref(false);
const submitting = ref(false);
const formData = reactive<Record<PasswordField, string>>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});
const fieldErrors = reactive<Record<PasswordField, string>>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});
const apiFieldMap: Record<string, PasswordField> = {
  password: "newPassword",
  newPassword: "newPassword",
  currentPassword: "currentPassword"
};

function clearFieldError(field: PasswordField) {
  fieldErrors[field] = "";
}

function resetForm() {
  formData.currentPassword = "";
  formData.newPassword = "";
  formData.confirmPassword = "";
  fieldErrors.currentPassword = "";
  fieldErrors.newPassword = "";
  fieldErrors.confirmPassword = "";
}

function openDialog() {
  resetForm();
  visible.value = true;
}

function closeDialog() {
  if (!submitting.value) visible.value = false;
}

function validateForm(): boolean {
  fieldErrors.currentPassword = formData.currentPassword
    ? ""
    : "请输入当前密码";
  fieldErrors.newPassword =
    formData.newPassword.length >= 8 ? "" : "新密码长度至少 8 位";
  fieldErrors.confirmPassword =
    formData.confirmPassword === formData.newPassword
      ? ""
      : "两次输入的新密码不一致";

  return !Object.values(fieldErrors).some(Boolean);
}

function errorCode(error: unknown): string | undefined {
  return (error as PasswordApiError)?.response?.data?.errors?.code;
}

function showApiError(error: unknown) {
  const apiError = parseApiError(error, "密码修改失败");

  if (errorCode(error) === "current_password_invalid") {
    fieldErrors.currentPassword = apiError.message;
    return;
  }

  const hasFieldErrors =
    !isServerError(apiError.status) &&
    applyApiFieldErrors(fieldErrors, apiError.fieldErrors, apiFieldMap);

  if (!hasFieldErrors) message(apiError.message, { type: "error" });
}

async function submit() {
  if (!validateForm()) return;

  submitting.value = true;
  try {
    await changeOwnPassword({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    });

    visible.value = false;
    message("密码修改成功，请重新登录", { type: "success" });
    await useUserStoreHook().logOut(false);
  } catch (error) {
    showApiError(error);
  } finally {
    submitting.value = false;
  }
}

onMounted(() => emitter.on("openPasswordDialog", openDialog));
onBeforeUnmount(() => emitter.off("openPasswordDialog", openDialog));
</script>

<template>
  <el-dialog
    v-model="visible"
    title="修改密码"
    width="460px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    append-to-body
    destroy-on-close
    @closed="resetForm"
  >
    <el-alert
      class="password-alert"
      title="修改成功后，所有登录设备都会退出，请使用新密码重新登录。"
      type="warning"
      :closable="false"
      show-icon
    />

    <el-form :model="formData" label-width="92px">
      <el-form-item label="当前密码" :error="fieldErrors.currentPassword">
        <el-input
          v-model="formData.currentPassword"
          type="password"
          autocomplete="current-password"
          maxlength="72"
          show-password
          @input="clearFieldError('currentPassword')"
        />
      </el-form-item>

      <el-form-item label="新密码" :error="fieldErrors.newPassword">
        <el-input
          v-model="formData.newPassword"
          type="password"
          autocomplete="new-password"
          maxlength="72"
          show-password
          placeholder="至少 8 位"
          @input="clearFieldError('newPassword')"
        />
      </el-form-item>

      <el-form-item label="确认新密码" :error="fieldErrors.confirmPassword">
        <el-input
          v-model="formData.confirmPassword"
          type="password"
          autocomplete="new-password"
          maxlength="72"
          show-password
          @input="clearFieldError('confirmPassword')"
          @keyup.enter="submit"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="submitting" @click="closeDialog">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">
        确认修改
      </el-button>
    </template>
  </el-dialog>
</template>

<style lang="scss" scoped>
.password-alert {
  margin-bottom: 20px;
}

@media (width <= 520px) {
  :deep(.el-dialog) {
    width: calc(100vw - 32px) !important;
  }
}
</style>
