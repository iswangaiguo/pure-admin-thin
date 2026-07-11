<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { message } from "@/utils/message";
import {
  createUser,
  updateUser,
  type UserRecord,
  type UserFormData
} from "@/api/user";

defineOptions({
  name: "UserForm"
});

const props = defineProps<{
  visible: boolean;
  roleOptions?: any[];
  editRow?: UserRecord | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "success"): void;
}>();

const submitLoading = ref(false);

const defaultFormData: UserFormData = {
  username: "",
  email: "",
  password: "",
  status: 1,
  roles: []
};

const formData = reactive<UserFormData>({ ...defaultFormData });
const editingId = ref<number | null>(null);
const isEdit = ref(false);
const dialogTitle = ref("新增用户");

function resetForm() {
  Object.assign(formData, { ...defaultFormData });
  editingId.value = null;
  isEdit.value = false;
  dialogTitle.value = "新增用户";
}

function initForm() {
  resetForm();

  if (props.editRow) {
    editingId.value = props.editRow.id;
    isEdit.value = true;
    dialogTitle.value = "修改用户";

    formData.username = props.editRow.username;
    formData.email = props.editRow.email;
    formData.password = "";
    formData.status = props.editRow.status;
    formData.roles = props.editRow.roles || [];
  }
}

watch(
  () => props.visible,
  val => {
    if (val) {
      initForm();
    }
  }
);

function handleCancel() {
  emit("update:visible", false);
}

async function handleSubmit() {
  if (!formData.username) {
    message("请输入用户名", { type: "warning" });
    return;
  }
  if (!formData.email) {
    message("请输入邮箱", { type: "warning" });
    return;
  }
  if (!isEdit.value && !formData.password) {
    message("请输入密码", { type: "warning" });
    return;
  }

  submitLoading.value = true;
  try {
    const data: UserFormData = {
      username: formData.username,
      email: formData.email,
      status: formData.status,
      roles: formData.roles
    };
    if (formData.password) {
      data.password = formData.password;
    }
    if (isEdit.value && editingId.value) {
      await updateUser(editingId.value, data);
      message("修改成功", { type: "success" });
    } else {
      await createUser(data);
      message("新增成功", { type: "success" });
    }
    emit("update:visible", false);
    emit("success");
  } catch {
    message(isEdit.value ? "修改失败" : "新增失败", { type: "error" });
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
    <el-form :model="formData" label-width="80px" class="user-form">
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
      <el-form-item label="密码">
        <el-input
          v-model="formData.password"
          type="password"
          :placeholder="isEdit ? '留空则不修改密码' : '请输入密码'"
          maxlength="50"
          show-password
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="formData.status">
          <el-radio :value="1">正常</el-radio>
          <el-radio :value="0">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="角色">
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
          确 定
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
