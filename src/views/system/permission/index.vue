<script setup lang="ts">
import { hasAuth } from "@/router/utils";
</script>

<template>
  <div class="main">
    <h2>权限管理</h2>
    <p>该页面正在开发中...</p>

    <el-divider>按钮权限演示</el-divider>

    <el-button v-if="hasAuth('permission:create')" type="primary">
      新增权限
    </el-button>
    <el-button v-if="hasAuth('permission:update')" type="warning">
      编辑权限
    </el-button>
    <el-button v-if="hasAuth('permission:delete')" type="danger">
      删除权限
    </el-button>
  </div>
</template>
