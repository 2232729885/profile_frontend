<template>
  <el-aside class="app-sidebar" width="220px">
    <div class="app-sidebar__brand">课题四全息画像系统</div>
    <el-menu
      class="app-sidebar__menu"
      :default-active="route.path"
      router
      background-color="#111827"
      text-color="#cbd5e1"
      active-text-color="#ffffff"
    >
      <el-menu-item index="/dashboard">
        <el-icon><Odometer /></el-icon>
        <span>概览大盘</span>
      </el-menu-item>
      <el-menu-item index="/ingestion">
        <el-icon><Upload /></el-icon>
        <span>数据采集</span>
      </el-menu-item>
      <el-menu-item index="/profiles">
        <el-icon><User /></el-icon>
        <span>画像管理</span>
      </el-menu-item>
      <el-menu-item index="/search">
        <el-icon><Search /></el-icon>
        <span>综合检索</span>
      </el-menu-item>
      <el-menu-item index="/graph">
        <el-icon><Share /></el-icon>
        <span>知识图谱</span>
      </el-menu-item>
      <el-menu-item index="/analysis">
        <el-icon><DataAnalysis /></el-icon>
        <span>分析工作台</span>
      </el-menu-item>
      <el-menu-item index="/identification">
        <el-icon><Aim /></el-icon>
        <span>目标识别</span>
      </el-menu-item>
      <el-menu-item index="/metrics">
        <el-icon><TrendCharts /></el-icon>
        <span>数据指标</span>
      </el-menu-item>
      <el-sub-menu index="/system">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>系统管理</span>
        </template>
        <el-menu-item index="/system/agents">Agent管理</el-menu-item>
        <el-menu-item index="/system/users">用户管理</el-menu-item>
        <el-menu-item index="/system/dedup">实体融合</el-menu-item>
        <el-menu-item index="/system/jobs">定时任务</el-menu-item>
      </el-sub-menu>
    </el-menu>
  </el-aside>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import {
  Aim,
  DataAnalysis,
  Odometer,
  Search,
  Setting,
  Share,
  TrendCharts,
  Upload,
  User
} from '@element-plus/icons-vue'

const route = useRoute()
</script>

<style scoped>
.app-sidebar {
  min-height: 100vh;
  background: #111827;
  color: #ffffff;
}

.app-sidebar__brand {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 18px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.app-sidebar__menu {
  border-right: none;
}
</style>
