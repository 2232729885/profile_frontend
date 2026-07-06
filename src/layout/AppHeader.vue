<template>
  <div class="app-header">
    <div class="app-header__title">{{ title }}</div>
    <div class="app-header__user">
      <el-icon><User /></el-icon>
      <span>{{ username }}</span>
      <el-button type="primary" plain size="small" @click="handleLogout">退出登录</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const titleMap: Record<string, string> = {
  '/dashboard': '概览大盘',
  '/ingestion': '数据采集',
  '/profiles': '画像管理',
  '/search': '综合检索',
  '/analysis': '分析工作台',
  '/identification': '目标识别',
  '/metrics': '数据指标',
  '/system/agents': 'Agent管理',
  '/system/users': '用户管理',
  '/system/dedup': '实体融合',
  '/system/jobs': '定时任务'
}

const title = computed(() => titleMap[route.path] || '课题四全息画像系统')
const username = computed(() => authStore.user?.nickname || authStore.user?.username || '当前用户')

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 20px;
}

.app-header__title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.app-header__user {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #374151;
}
</style>
