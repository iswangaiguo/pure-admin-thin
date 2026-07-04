<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { message } from "@/utils/message";
import {
  createMenu,
  updateMenu,
  type MenuRecord,
  type MenuFormData
} from "@/api/menu";
import { cloneDeep } from "@pureadmin/utils";

defineOptions({
  name: "MenuForm"
});

const props = defineProps<{
  visible: boolean;
  treeSelectData?: any[];
  editRow?: MenuRecord | null;
  parentRow?: MenuRecord | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "success"): void;
}>();

const submitLoading = ref(false);

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
const editingId = ref<number | null>(null);
const isEdit = ref(false);

const dialogTitle = ref("新增菜单");

function resetForm() {
  Object.assign(formData, cloneDeep(defaultFormData));
  editingId.value = null;
  isEdit.value = false;
  dialogTitle.value = "新增菜单";
}

function initForm() {
  resetForm();

  if (props.editRow) {
    editingId.value = props.editRow.id;
    isEdit.value = true;
    dialogTitle.value = "修改菜单";

    formData.parentId = props.editRow.parentId;
    formData.menuType = props.editRow.menuType;
    formData.title = props.editRow.title;
    formData.name = props.editRow.name || "";
    formData.path = props.editRow.path;
    formData.component = props.editRow.component || "";
    formData.icon = props.editRow.icon || "";
    formData.rank = props.editRow.rank;
    formData.showLink = props.editRow.showLink;
    formData.perms = props.editRow.perms || "";
    formData.isActive = props.editRow.isActive;
    formData.visible = props.editRow.visible;
  } else if (props.parentRow) {
    formData.parentId = props.parentRow.id;
    formData.menuType = props.parentRow.menuType === "M" ? "C" : "F";
    dialogTitle.value = "新增菜单";
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
    width="650px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="handleCancel"
    @close="handleCancel"
  >
    <el-form :model="formData" label-width="100px" class="menu-form">
      <el-form-item label="上级菜单">
        <el-tree-select
          v-model="formData.parentId"
          :data="treeSelectData"
          :props="{ value: 'id', label: 'label', children: 'children' }"
          placeholder="顶级菜单（留空）"
          clearable
          check-strictly
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="菜单类型">
        <el-radio-group v-model="formData.menuType" :disabled="isEdit">
          <el-radio-button value="M">目录</el-radio-button>
          <el-radio-button value="C">菜单</el-radio-button>
          <el-radio-button value="F">按钮</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="菜单名称">
        <el-input
          v-model="formData.title"
          placeholder="请输入菜单名称"
          maxlength="50"
        />
      </el-form-item>

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

      <el-form-item v-if="formData.menuType === 'C'" label="组件路径">
        <el-input
          v-model="formData.component"
          placeholder="如 system/user/index"
        />
      </el-form-item>

      <el-form-item v-if="formData.menuType !== 'M'" label="权限标识">
        <el-input
          v-model="formData.perms"
          :placeholder="
            formData.menuType === 'C' ? '如 user:list' : '如 user:create'
          "
        />
      </el-form-item>

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

      <el-form-item label="显示排序">
        <el-input-number v-model="formData.rank" :min="0" :max="999" />
      </el-form-item>

      <el-form-item v-if="formData.menuType !== 'F'" label="显示状态">
        <el-radio-group v-model="formData.visible">
          <el-radio :value="true">显示</el-radio>
          <el-radio :value="false">隐藏</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="菜单状态">
        <el-switch v-model="formData.isActive" />
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
