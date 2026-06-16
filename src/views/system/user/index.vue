<script setup lang="ts">
import { hasAuth } from "@/router/utils";
</script>

<template>
  <div class="main">
    <h2>用户管理</h2>
    <p>该页面正在开发中...</p>

    <el-divider>按钮权限演示</el-divider>

    <el-button v-if="hasAuth('user:create')" type="primary">
      新增用户
    </el-button>
    <el-button v-if="hasAuth('user:update')" type="warning">
      编辑用户
    </el-button>
    <el-button v-if="hasAuth('user:delete')" type="danger">
      删除用户
    </el-button>
  </div>
</template>
