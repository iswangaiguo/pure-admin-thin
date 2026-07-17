<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { hasPerms } from "@/utils/auth";
import { message } from "@/utils/message";
import {
  applyApiFieldErrors,
  isServerError,
  parseApiError
} from "@/utils/formError";
import {
  createNotice,
  updateNotice,
  type NoticeAction,
  type NoticeFormData,
  type NoticeRecord,
  type NoticeType
} from "@/api/notice";

defineOptions({
  name: "NoticeForm"
});

type NoticeFormField = "title" | "type" | "content" | "pinned";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    editRow?: NoticeRecord | null;
  }>(),
  {
    editRow: null
  }
);

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "success", notice: NoticeRecord): void;
}>();

const defaultFormData: NoticeFormData = {
  title: "",
  type: "notification",
  content: "",
  pinned: false
};

const formData = reactive<NoticeFormData>({ ...defaultFormData });
const fieldErrors = reactive<Record<NoticeFormField, string>>({
  title: "",
  type: "",
  content: "",
  pinned: ""
});
const submitAction = ref<NoticeAction | null>(null);

const isEdit = computed(() => Boolean(props.editRow));
const dialogTitle = computed(() =>
  isEdit.value ? "修改草稿" : "新增通知公告"
);

function clearFieldError(field: NoticeFormField) {
  fieldErrors[field] = "";
}

function clearFieldErrors() {
  Object.keys(fieldErrors).forEach(field => {
    clearFieldError(field as NoticeFormField);
  });
}

function initForm() {
  clearFieldErrors();
  Object.assign(formData, defaultFormData);

  if (props.editRow) {
    formData.title = props.editRow.title;
    formData.type = props.editRow.type;
    formData.content = props.editRow.content || "";
    formData.pinned = props.editRow.pinned;
  }
}

watch(
  () => props.visible,
  visible => {
    if (visible) initForm();
  }
);

function handleCancel() {
  if (submitAction.value) return;
  emit("update:visible", false);
}

function validateForm(): boolean {
  clearFieldErrors();

  if (!formData.title.trim()) fieldErrors.title = "请输入标题";
  if (!formData.type) fieldErrors.type = "请选择类型";
  if (!formData.content.trim()) fieldErrors.content = "请输入正文";

  return !Object.values(fieldErrors).some(Boolean);
}

function showApiError(error: unknown) {
  const apiError = parseApiError(error, isEdit.value ? "修改失败" : "创建失败");
  const fieldMap: Record<string, NoticeFormField> = {
    title: "title",
    type: "type",
    content: "content",
    pinned: "pinned"
  };
  const applied =
    !isServerError(apiError.status) &&
    applyApiFieldErrors(fieldErrors, apiError.fieldErrors, fieldMap);

  if (!applied) message(apiError.message, { type: "error" });
}

async function handleSubmit(action: NoticeAction) {
  if (!validateForm()) return;

  submitAction.value = action;
  const payload: NoticeFormData = {
    title: formData.title.trim(),
    type: formData.type as NoticeType,
    content: formData.content.trim(),
    pinned: formData.pinned
  };

  try {
    const response =
      isEdit.value && props.editRow
        ? await updateNotice(props.editRow.id, payload)
        : await createNotice({ ...payload, action });

    message(
      isEdit.value
        ? "草稿修改成功"
        : action === "publish"
          ? "发布成功"
          : "草稿保存成功",
      { type: "success" }
    );
    emit("update:visible", false);
    emit("success", response.data);
  } catch (error) {
    showApiError(error);
  } finally {
    submitAction.value = null;
  }
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="dialogTitle"
    width="760px"
    :close-on-click-modal="false"
    :close-on-press-escape="!submitAction"
    :show-close="!submitAction"
    destroy-on-close
    @update:model-value="handleCancel"
    @close="handleCancel"
  >
    <el-form :model="formData" label-width="84px" class="notice-form">
      <el-form-item label="标题" :error="fieldErrors.title">
        <el-input
          v-model="formData.title"
          placeholder="请输入标题"
          maxlength="200"
          show-word-limit
          @input="clearFieldError('title')"
        />
      </el-form-item>
      <el-form-item label="类型" :error="fieldErrors.type">
        <el-radio-group
          v-model="formData.type"
          @change="clearFieldError('type')"
        >
          <el-radio value="notification">通知</el-radio>
          <el-radio value="announcement">公告</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="置顶" :error="fieldErrors.pinned">
        <el-switch
          v-model="formData.pinned"
          @change="clearFieldError('pinned')"
        />
      </el-form-item>
      <el-form-item label="正文" :error="fieldErrors.content">
        <el-input
          v-model="formData.content"
          type="textarea"
          :rows="12"
          resize="vertical"
          placeholder="请输入正文，支持安全的基础 HTML 标签"
          @input="clearFieldError('content')"
        />
        <div class="content-tip">
          发布后标题和正文不可修改；链接仅支持 HTTPS，危险内容会自动过滤。
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button :disabled="Boolean(submitAction)" @click="handleCancel">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="submitAction === 'draft'"
        :disabled="submitAction === 'publish'"
        @click="handleSubmit('draft')"
      >
        {{ isEdit ? "保存修改" : "保存草稿" }}
      </el-button>
      <el-button
        v-if="!isEdit && hasPerms('notice:publish')"
        type="success"
        :loading="submitAction === 'publish'"
        :disabled="submitAction === 'draft'"
        @click="handleSubmit('publish')"
      >
        立即发布
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.notice-form {
  padding: 8px 20px 0;
}

.content-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>
