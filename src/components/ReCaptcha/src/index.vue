<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getCaptcha } from "@/api/user";

defineOptions({
  name: "ReCaptcha"
});

interface Emits {
  (e: "update:uuid", uuid: string): void;
  (e: "ready", enabled: boolean): void;
}

const emit = defineEmits<Emits>();

const img = ref("");
const uuid = ref("");
const enabled = ref(true);
const loading = ref(false);

async function refresh(): Promise<void> {
  if (loading.value) return;
  loading.value = true;

  try {
    const res = await getCaptcha();
    const data = res?.data;

    if (!data?.captchaEnabled) {
      enabled.value = false;
      img.value = "";
      uuid.value = "";
      emit("update:uuid", "");
      emit("ready", false);
      return;
    }

    enabled.value = true;
    img.value = `data:image/svg+xml;base64,${data.img}`;
    uuid.value = data.uuid ?? "";
    emit("update:uuid", uuid.value);
    emit("ready", true);
  } catch {
    enabled.value = false;
    img.value = "";
    uuid.value = "";
    emit("update:uuid", "");
    emit("ready", false);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refresh();
});

defineExpose({ refresh });
</script>

<template>
  <img
    v-if="enabled && img"
    :src="img"
    class="cursor-pointer"
    style="width: 120px; height: 40px"
    title="点击刷新验证码"
    alt="验证码"
    @click="refresh"
  />
  <span
    v-else-if="enabled"
    class="el-loading-text"
    style="width: 120px; height: 40px; line-height: 40px; text-align: center"
    >加载中…</span
  >
</template>
