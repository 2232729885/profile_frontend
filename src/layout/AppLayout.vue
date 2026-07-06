<template>
  <el-container class="app-layout">
    <AppSidebar />
    <el-container>
      <el-header class="app-layout__header">
        <AppHeader />
      </el-header>
      <el-main class="app-layout__main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: #f5f7fb;
}

.app-layout__header {
  height: 56px;
  padding: 0;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.app-layout__main {
  padding: 20px;
}
</style>
