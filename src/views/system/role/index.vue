<script setup lang="ts">
import { hasAuth } from "@/router/utils";
</script>

<template>
  <div class="main">
    <h2>角色管理</h2>
    <p>该页面正在开发中...</p>

    <el-divider>按钮权限演示</el-divider>

    <el-button v-if="hasAuth('role:create')" type="primary">
      新增角色
    </el-button>
    <el-button v-if="hasAuth('role:update')" type="warning">
      编辑角色
    </el-button>
    <el-button v-if="hasAuth('role:delete')" type="danger">
      删除角色
    </el-button>
  </div>
</template>
