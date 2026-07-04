<script setup lang="ts">
import { ref, reactive, watch, nextTick } from "vue";
import { message } from "@/utils/message";
import {
  createRole,
  updateRole,
  type RoleRecord,
  type RoleFormData
} from "@/api/role";

defineOptions({
  name: "RoleForm"
});

const props = defineProps<{
  visible: boolean;
  menuTreeData?: any[];
  editRow?: RoleRecord | null;
}>();

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "success"): void;
}>();

const treeRef = ref<any>(null);
const submitLoading = ref(false);

const defaultFormData: RoleFormData = {
  code: "",
  name: "",
  status: true,
  menus: []
};

const formData = reactive<RoleFormData>({ ...defaultFormData });
const editingId = ref<number | null>(null);
const isEdit = ref(false);
const dialogTitle = ref("新增角色");

function getLeafIds(tree: any[]): Set<number> {
  const leafIds = new Set<number>();
  function traverse(nodes: any[]) {
    for (const node of nodes) {
      if (!node.children || node.children.length === 0) {
        leafIds.add(node.id);
      } else {
        traverse(node.children);
      }
    }
  }
  traverse(tree);
  return leafIds;
}

function resetForm() {
  Object.assign(formData, { ...defaultFormData });
  editingId.value = null;
  isEdit.value = false;
  dialogTitle.value = "新增角色";
  treeRef.value?.setCheckedKeys([]);
}

function initForm() {
  resetForm();

  if (props.editRow) {
    editingId.value = props.editRow.id;
    isEdit.value = true;
    dialogTitle.value = "修改角色";

    formData.code = props.editRow.code;
    formData.name = props.editRow.name;
    formData.status = props.editRow.status;
    formData.menus = props.editRow.menus || [];

    nextTick(() => {
      const leafIds = getLeafIds(props.menuTreeData || []);
      const leafKeys = (props.editRow?.menus || []).filter(id =>
        leafIds.has(id)
      );
      treeRef.value?.setCheckedKeys(leafKeys);
    });
  } else {
    nextTick(() => {
      treeRef.value?.setCheckedKeys([]);
    });
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
  if (!formData.code) {
    message("请输入角色标识", { type: "warning" });
    return;
  }
  if (!formData.name) {
    message("请输入角色名称", { type: "warning" });
    return;
  }

  submitLoading.value = true;
  try {
    const checkedKeys = treeRef.value?.getCheckedKeys() || [];
    const halfCheckedKeys = treeRef.value?.getHalfCheckedKeys() || [];
    const data: RoleFormData = {
      code: formData.code,
      name: formData.name,
      status: formData.status,
      menus: [...checkedKeys, ...halfCheckedKeys]
    };

    if (isEdit.value && editingId.value) {
      await updateRole(editingId.value, data);
      message("修改成功", { type: "success" });
    } else {
      await createRole(data);
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
    width="600px"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="handleCancel"
    @close="handleCancel"
  >
    <el-form :model="formData" label-width="80px" class="role-form">
      <el-form-item label="角色标识">
        <el-input
          v-model="formData.code"
          placeholder="请输入角色标识，如 admin"
          :disabled="isEdit"
          maxlength="50"
        />
      </el-form-item>
      <el-form-item label="角色名称">
        <el-input
          v-model="formData.name"
          placeholder="请输入角色名称"
          maxlength="50"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-switch v-model="formData.status" />
      </el-form-item>
      <el-form-item label="菜单权限" class="menu-permission-item">
        <div class="menu-tree-container">
          <el-tree
            ref="treeRef"
            :data="menuTreeData"
            :props="{ label: 'title', children: 'children' }"
            node-key="id"
            show-checkbox
            default-expand-all
            class="menu-tree"
          />
        </div>
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
.role-form {
  padding: 10px 20px 0;

  :deep(.el-form-item) {
    margin-bottom: 18px;
  }
}

.menu-permission-item {
  :deep(.el-form-item__content) {
    min-width: 0;
  }
}

.menu-tree-container {
  width: 100%;
  max-height: 300px;
  overflow-y: auto;
}

.menu-tree {
  width: 100%;
}

.dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
