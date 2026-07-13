<script setup lang="ts">
import { computed, ref, reactive, watch } from "vue";
import { message } from "@/utils/message";
import {
  applyApiFieldErrors,
  isServerError,
  parseApiError
} from "@/utils/formError";
import {
  createMenu,
  updateMenu,
  updateMenuPerms,
  type MenuRecord,
  type MenuFormData
} from "@/api/menu";
import { cloneDeep } from "@pureadmin/utils";

defineOptions({
  name: "MenuForm"
});

type MenuFormMode = "create" | "metadata" | "permissions";
type MenuFormField =
  | "parentId"
  | "menuType"
  | "title"
  | "path"
  | "component"
  | "icon"
  | "rank"
  | "visible"
  | "status"
  | "perms";
type MenuFormSuccess = {
  kind: MenuFormMode;
  menu: MenuRecord;
};

const props = withDefaults(
  defineProps<{
    visible: boolean;
    mode?: MenuFormMode;
    treeSelectData?: any[];
    editRow?: MenuRecord | null;
    parentRow?: MenuRecord | null;
  }>(),
  {
    mode: "create",
    treeSelectData: () => [],
    editRow: null,
    parentRow: null
  }
);

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "success", result: MenuFormSuccess): void;
}>();

const submitLoading = ref(false);
const iconPopoverVisible = ref(false);

const iconOptions = [
  { label: "系统管理", name: "setting", value: "ep:setting" },
  { label: "用户", name: "user", value: "ep:user" },
  { label: "角色", name: "avatar", value: "ep:avatar" },
  { label: "菜单", name: "menu", value: "ep:menu" },
  { label: "权限", name: "lock", value: "ep:lock" },
  { label: "文档", name: "document", value: "ep:document" },
  { label: "链接", name: "link", value: "ep:link" },
  { label: "图表", name: "data-analysis", value: "ep:data-analysis" },
  { label: "日志", name: "notebook", value: "ep:notebook" },
  { label: "监控", name: "monitor", value: "ep:monitor" },
  { label: "工具", name: "tools", value: "ep:tools" },
  { label: "示例", name: "lollipop", value: "ep:lollipop" },
  { label: "首页", name: "home-filled", value: "ep:home-filled" },
  { label: "日历", name: "calendar", value: "ep:calendar" },
  { label: "消息", name: "bell", value: "ep:bell" },
  { label: "设置", name: "operation", value: "ep:operation" },
  { label: "列表", name: "list", value: "ep:list" },
  { label: "文件夹", name: "folder", value: "ep:folder" },
  { label: "数据", name: "coin", value: "ep:coin" },
  { label: "通知", name: "message", value: "ep:message" },
  { label: "搜索", name: "search", value: "ep:search" },
  { label: "编辑", name: "edit", value: "ep:edit" },
  { label: "新增", name: "plus", value: "ep:plus" },
  { label: "删除", name: "delete", value: "ep:delete" },
  { label: "查看", name: "view", value: "ep:view" },
  { label: "隐藏", name: "hide", value: "ep:hide" },
  { label: "刷新", name: "refresh", value: "ep:refresh" },
  { label: "上传", name: "upload", value: "ep:upload" },
  { label: "下载", name: "download", value: "ep:download" },
  { label: "导出", name: "folder-checked", value: "ep:folder-checked" },
  { label: "打印", name: "printer", value: "ep:printer" },
  { label: "图片", name: "picture", value: "ep:picture" },
  { label: "相机", name: "camera", value: "ep:camera" },
  { label: "视频", name: "video-camera", value: "ep:video-camera" },
  { label: "定位", name: "location", value: "ep:location" },
  { label: "地图", name: "map-location", value: "ep:map-location" },
  { label: "店铺", name: "shop", value: "ep:shop" },
  { label: "购物车", name: "shopping-cart", value: "ep:shopping-cart" },
  { label: "商品", name: "goods", value: "ep:goods" },
  { label: "票据", name: "tickets", value: "ep:tickets" },
  { label: "钱包", name: "wallet", value: "ep:wallet" },
  { label: "银行卡", name: "credit-card", value: "ep:credit-card" },
  { label: "价格", name: "price-tag", value: "ep:price-tag" },
  { label: "奖杯", name: "trophy", value: "ep:trophy" },
  { label: "星标", name: "star", value: "ep:star" },
  { label: "收藏", name: "collection", value: "ep:collection" },
  { label: "旗帜", name: "flag", value: "ep:flag" },
  { label: "问号", name: "question-filled", value: "ep:question-filled" },
  { label: "警告", name: "warning", value: "ep:warning" },
  { label: "成功", name: "success-filled", value: "ep:success-filled" },
  {
    label: "失败",
    name: "circle-close-filled",
    value: "ep:circle-close-filled"
  },
  { label: "信息", name: "info-filled", value: "ep:info-filled" },
  { label: "钥匙", name: "key", value: "ep:key" },
  { label: "安全", name: "circle-check", value: "ep:circle-check" },
  { label: "连接", name: "connection", value: "ep:connection" },
  { label: "手机", name: "cellphone", value: "ep:cellphone" },
  { label: "电脑", name: "platform", value: "ep:platform" },
  { label: "服务", name: "service", value: "ep:service" },
  { label: "客服", name: "headset", value: "ep:headset" },
  { label: "配置", name: "set-up", value: "ep:set-up" },
  { label: "筛选", name: "filter", value: "ep:filter" },
  { label: "排序", name: "sort", value: "ep:sort" },
  { label: "更多", name: "more", value: "ep:more" },
  { label: "更多填充", name: "more-filled", value: "ep:more-filled" },
  { label: "时间", name: "timer", value: "ep:timer" },
  { label: "时钟", name: "clock", value: "ep:clock" },
  { label: "终端", name: "cpu", value: "ep:cpu" },
  { label: "坐标轴", name: "trend-charts", value: "ep:trend-charts" },
  { label: "饼图", name: "pie-chart", value: "ep:pie-chart" },
  { label: "统计", name: "histogram", value: "ep:histogram" },
  { label: "Office", name: "office-building", value: "ep:office-building" },
  { label: "学校", name: "school", value: "ep:school" },
  { label: "指南", name: "guide", value: "ep:guide" },
  { label: "坐标", name: "aim", value: "ep:aim" },
  { label: "邮票", name: "stamp", value: "ep:stamp" }
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
  status: 1,
  visible: true
};

const formData = reactive<MenuFormData>({ ...defaultFormData });
const permsValue = ref<string>("");
const editingId = ref<number | null>(null);
const isEdit = ref(false);
const fieldErrors = reactive<Record<MenuFormField, string>>({
  parentId: "",
  menuType: "",
  title: "",
  path: "",
  component: "",
  icon: "",
  rank: "",
  visible: "",
  status: "",
  perms: ""
});
const menuApiFieldMap: Record<string, MenuFormField> = {
  parentId: "parentId",
  menuType: "menuType",
  title: "title",
  path: "path",
  component: "component",
  icon: "icon",
  rank: "rank",
  visible: "visible",
  status: "status",
  perms: "perms"
};

const isPermissionMode = computed(() => props.mode === "permissions");
const dialogTitle = computed(() => {
  if (props.mode === "permissions") return "配置权限标识";
  if (props.mode === "metadata") return "修改菜单资料";
  return "新增菜单";
});

function clearFieldError(field: MenuFormField) {
  fieldErrors[field] = "";
}

function clearFieldErrors() {
  Object.keys(fieldErrors).forEach(field => {
    clearFieldError(field as MenuFormField);
  });
}

function resetForm() {
  clearFieldErrors();
  Object.assign(formData, cloneDeep(defaultFormData));
  permsValue.value = "";
  editingId.value = null;
  isEdit.value = false;
}

function initForm() {
  resetForm();

  if (props.editRow) {
    editingId.value = props.editRow.id;
    isEdit.value = true;

    formData.parentId = props.editRow.parentId;
    formData.menuType = props.editRow.menuType;
    formData.title = props.editRow.title;
    formData.name = props.editRow.name || "";
    formData.path = props.editRow.path;
    formData.component = props.editRow.component || "";
    formData.icon = props.editRow.icon || "";
    formData.rank = props.editRow.rank;
    formData.showLink = props.editRow.showLink;
    permsValue.value = props.editRow.perms || "";
    formData.status = props.editRow.status;
    formData.visible = props.editRow.visible;
  } else if (props.parentRow) {
    formData.parentId = props.parentRow.id;
    formData.menuType = props.parentRow.menuType === "M" ? "C" : "F";
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
  iconPopoverVisible.value = false;
  emit("update:visible", false);
}

function selectIcon(icon: string) {
  formData.icon = icon;
  clearFieldError("icon");
  iconPopoverVisible.value = false;
}

function clearIcon() {
  formData.icon = "";
  clearFieldError("icon");
  iconPopoverVisible.value = false;
}

function showApiError(error: unknown, fallbackMessage: string) {
  const apiError = parseApiError(error, fallbackMessage);
  const hasFieldErrors =
    !isServerError(apiError.status) &&
    applyApiFieldErrors(fieldErrors, apiError.fieldErrors, menuApiFieldMap);

  if (!hasFieldErrors) {
    message(apiError.message, { type: "error" });
  }
}

async function handleSubmit() {
  clearFieldErrors();

  if (isPermissionMode.value) {
    if (!editingId.value) {
      message("未找到要配置权限的节点", { type: "warning" });
      return;
    }

    submitLoading.value = true;
    try {
      const response = await updateMenuPerms(editingId.value, {
        perms: permsValue.value.trim()
      });
      message("权限标识更新成功", { type: "success" });
      emit("update:visible", false);
      emit("success", { kind: "permissions", menu: response.data });
    } catch (error) {
      showApiError(error, "权限标识更新失败");
    } finally {
      submitLoading.value = false;
    }
    return;
  }

  if (!formData.title) {
    fieldErrors.title = "请输入菜单名称";
    return;
  }
  if (!formData.path) {
    fieldErrors.path = "请输入路由地址";
    return;
  }
  if (formData.menuType === "C" && !formData.component) {
    fieldErrors.component = "请输入组件路径";
    return;
  }

  submitLoading.value = true;
  try {
    const data = { ...formData };
    let menu: MenuRecord;
    if (isEdit.value && editingId.value) {
      const response = await updateMenu(editingId.value, data);
      menu = response.data;
      message("菜单资料修改成功", { type: "success" });
    } else {
      const response = await createMenu(data);
      menu = response.data;
      message(
        formData.menuType === "F"
          ? "权限节点创建成功，请继续配置权限标识"
          : "菜单创建成功",
        { type: "success" }
      );
    }
    emit("update:visible", false);
    emit("success", { kind: props.mode, menu });
  } catch (error) {
    showApiError(error, isEdit.value ? "菜单资料修改失败" : "菜单创建失败");
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
      <template v-if="!isPermissionMode">
        <el-form-item label="上级菜单" :error="fieldErrors.parentId">
          <el-tree-select
            v-model="formData.parentId"
            :data="treeSelectData"
            :props="{ value: 'id', label: 'label', children: 'children' }"
            placeholder="顶级菜单（留空）"
            clearable
            check-strictly
            style="width: 100%"
            @change="clearFieldError('parentId')"
          />
        </el-form-item>

        <el-form-item label="菜单类型" :error="fieldErrors.menuType">
          <el-radio-group
            v-model="formData.menuType"
            :disabled="isEdit"
            @change="clearFieldError('menuType')"
          >
            <el-radio-button value="M">目录</el-radio-button>
            <el-radio-button value="C">菜单</el-radio-button>
            <el-radio-button value="F">按钮</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="菜单名称" :error="fieldErrors.title">
          <el-input
            v-model="formData.title"
            placeholder="请输入菜单名称"
            maxlength="50"
            @input="clearFieldError('title')"
          />
        </el-form-item>

        <el-form-item label="路由地址" :error="fieldErrors.path">
          <el-input
            v-model="formData.path"
            :placeholder="
              formData.menuType === 'M'
                ? '目录路径，如 /system'
                : formData.menuType === 'C'
                  ? '路由路径，如 /system/user'
                  : '权限节点路径，如 /system/user/create'
            "
            @input="clearFieldError('path')"
          />
        </el-form-item>

        <el-form-item
          v-if="formData.menuType === 'C'"
          label="组件路径"
          :error="fieldErrors.component"
        >
          <el-input
            v-model="formData.component"
            placeholder="如 system/user/index"
            @input="clearFieldError('component')"
          />
        </el-form-item>

        <el-form-item
          v-if="formData.menuType !== 'F'"
          label="菜单图标"
          :error="fieldErrors.icon"
        >
          <el-popover
            v-model:visible="iconPopoverVisible"
            placement="bottom-start"
            trigger="click"
            :width="420"
            popper-class="menu-icon-popover"
          >
            <template #reference>
              <el-input
                :model-value="formData.icon"
                placeholder="请选择菜单图标"
                readonly
                clearable
                class="icon-picker-input"
                @clear="clearIcon"
              >
                <template v-if="formData.icon" #prefix>
                  <IconifyIconOnline :icon="formData.icon" />
                </template>
              </el-input>
            </template>

            <div class="icon-picker">
              <div class="icon-picker-header">
                <span>选择菜单图标</span>
                <el-button link type="primary" @click="clearIcon"
                  >清空</el-button
                >
              </div>
              <div class="icon-picker-grid">
                <button
                  v-for="opt in iconOptions"
                  :key="opt.value"
                  type="button"
                  class="icon-picker-item"
                  :class="{ 'is-active': formData.icon === opt.value }"
                  :title="`${opt.label} (${opt.value})`"
                  :aria-label="`${opt.label} (${opt.value})`"
                  @click="selectIcon(opt.value)"
                >
                  <IconifyIconOnline
                    :icon="opt.value"
                    class="icon-picker-icon"
                  />
                </button>
              </div>
            </div>
          </el-popover>
        </el-form-item>

        <el-form-item label="显示排序" :error="fieldErrors.rank">
          <el-input-number
            v-model="formData.rank"
            :min="0"
            :max="999"
            @change="clearFieldError('rank')"
          />
        </el-form-item>

        <el-form-item
          v-if="formData.menuType !== 'F'"
          label="显示状态"
          :error="fieldErrors.visible"
        >
          <el-radio-group
            v-model="formData.visible"
            @change="clearFieldError('visible')"
          >
            <el-radio :value="true">显示</el-radio>
            <el-radio :value="false">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="菜单状态" :error="fieldErrors.status">
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
          :title="`正在配置【${formData.title}】的权限标识`"
          description="该操作独立于菜单资料修改，仅拥有 permission:manage 的用户可以提交。"
          type="warning"
          :closable="false"
          show-icon
          class="permission-alert"
        />
        <el-form-item label="权限标识" :error="fieldErrors.perms">
          <el-input
            v-model="permsValue"
            placeholder="如 user:create；多个权限使用英文逗号分隔"
            clearable
            @input="clearFieldError('perms')"
          />
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
          {{ isPermissionMode ? "保存权限标识" : "保 存" }}
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

.permission-alert {
  margin-bottom: 18px;
}

.dialog-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.icon-picker-input {
  width: 100%;
}

.icon-picker {
  .icon-picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .icon-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
    gap: 0;
    max-height: 320px;
    overflow-y: auto;
  }

  .icon-picker-item {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    height: 32px;
    padding: 0;
    color: var(--el-text-color-regular);
    cursor: pointer;
    outline: none;
    background: var(--el-fill-color-blank);
    border: 0;
    border-radius: 4px;
    transition:
      color var(--el-transition-duration),
      border-color var(--el-transition-duration),
      background-color var(--el-transition-duration);

    &:hover,
    &.is-active {
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);
    }
  }

  .icon-picker-icon {
    font-size: 18px;
  }
}
</style>
