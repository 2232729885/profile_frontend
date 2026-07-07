<template>
  <div class="identification-view">
    <div class="page-header">
      <div>
        <h1>目标识别</h1>
        <p>以叙事或账号为入口触发重点目标识别</p>
      </div>
    </div>

    <el-card shadow="never">
      <template #header>重点目标识别</template>
      <el-form label-position="top">
        <el-form-item label="触发方式">
          <el-radio-group v-model="triggerType" @change="resetSelection">
            <el-radio label="narrative">按叙事触发</el-radio>
            <el-radio label="account">按账号触发</el-radio>
          </el-radio-group>
        </el-form-item>

        <template v-if="triggerType === 'narrative'">
          <el-form-item label="叙事实体搜索">
            <div class="search-line">
              <el-input v-model="narrativeKeyword" placeholder="输入叙事关键词" clearable @keyup.enter="searchNarratives" />
              <el-button type="primary" :loading="narrativeLoading" @click="searchNarratives">搜索</el-button>
            </div>
          </el-form-item>
          <el-form-item label="选择叙事">
            <el-select v-model="selectedNarrativeId" class="full-width" filterable placeholder="请选择叙事">
              <el-option
                v-for="item in narrativeOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <div v-if="selectedNarrativeId" class="selected-id">叙事 ID：{{ selectedNarrativeId }}</div>
          <el-button type="primary" :loading="triggering" :disabled="!selectedNarrativeId" @click="triggerNarrativeIdentification">
            触发识别
          </el-button>
        </template>

        <template v-else>
          <el-form-item label="账号搜索">
            <div class="search-line">
              <el-input v-model="accountKeyword" placeholder="输入账号关键词" clearable @keyup.enter="searchAccounts" />
              <el-button type="primary" :loading="accountLoading" @click="searchAccounts">搜索</el-button>
            </div>
          </el-form-item>
          <el-form-item label="选择账号">
            <el-select v-model="selectedAccountIds" class="full-width" filterable multiple placeholder="请选择账号">
              <el-option
                v-for="item in accountOptions"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
          <el-button type="primary" :loading="triggering" :disabled="!selectedAccountIds.length" @click="triggerAccountAnalysis">
            触发识别
          </el-button>
        </template>
      </el-form>
    </el-card>

    <el-card class="result-card" shadow="never">
      <template #header>识别结果</template>
      <div v-loading="taskLoading">
        <el-empty v-if="!currentTask" description="暂无识别任务" />
        <template v-else>
          <el-descriptions :column="3" border>
            <el-descriptions-item label="任务 ID">{{ currentTask.id }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(currentTask.status)">{{ currentTask.status }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(currentTask.createdAt) }}</el-descriptions-item>
          </el-descriptions>

          <div v-if="currentTask.status === 'PENDING' || currentTask.status === 'RUNNING'" class="pending-box">
            <p>任务已创建，正在处理中...</p>
            <el-progress :percentage="pollProgress" :show-text="false" />
          </div>

          <div v-if="currentTask.status === 'DONE'" class="summary-box">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-card class="metric-card" shadow="never">
                  <div class="metric-value">{{ currentTask.accountsAnalyzed }}</div>
                  <div class="metric-label">分析账号数</div>
                </el-card>
              </el-col>
              <el-col :span="12">
                <el-card class="metric-card" shadow="never">
                  <div class="metric-value">{{ currentTask.targetsIdentified }}</div>
                  <div class="metric-label">识别目标数</div>
                </el-card>
              </el-col>
            </el-row>
            <pre class="result-summary">{{ currentTask.resultSummary || '-' }}</pre>
          </div>

          <el-alert
            v-if="currentTask.status === 'FAILED'"
            title="识别任务失败"
            type="error"
            :closable="false"
            show-icon
          />
        </template>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { createAnalysisTask } from '@/api/analysis'
import { searchEntities } from '@/api/search'

interface EntityOption {
  id: string
  name: string
}

interface IdentificationTask {
  id: string
  narrativeId: string | null
  triggerType: string
  status: string
  resultSummary: string | null
  accountsAnalyzed: number
  targetsIdentified: number
  createdAt: string
  completedAt: string | null
}

const router = useRouter()
const triggerType = ref<'narrative' | 'account'>('narrative')
const narrativeKeyword = ref('')
const accountKeyword = ref('')
const narrativeLoading = ref(false)
const accountLoading = ref(false)
const triggering = ref(false)
const taskLoading = ref(false)
const narrativeOptions = ref<EntityOption[]>([])
const accountOptions = ref<EntityOption[]>([])
const selectedNarrativeId = ref('')
const selectedAccountIds = ref<string[]>([])
const currentTask = ref<IdentificationTask | null>(null)
const pollCount = ref(0)
const pollTimer = ref<number | null>(null)
const maxPollCount = 60

const pollProgress = computed(() => Math.min(96, Math.round((pollCount.value / maxPollCount) * 100)))

const formatTime = (time?: string | null) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const statusTagType = (status: string) => {
  if (status === 'DONE') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'RUNNING') return 'primary'
  return 'info'
}

const normalizeEntity = (item: unknown): EntityOption => {
  const data = item as Record<string, unknown>
  const props = (data.properties ?? {}) as Record<string, unknown>
  return {
    id: String(data.id ?? props.id ?? ''),
    name: String(
      data.canonicalName ?? data.canonicalLabel ?? data.handle ?? data.displayName ??
      props.canonicalLabel ?? props.handle ?? props.canonicalName ?? props.displayName ??
      data.name ?? data.id ?? '-'
    )
  }
}

const normalizeEntityList = (result: unknown) => {
  const list = Array.isArray(result)
    ? result
    : ((result as { records?: unknown[]; items?: unknown[] }).records ?? (result as { items?: unknown[] }).items ?? [])
  return list.map(normalizeEntity).filter(item => item.id)
}

const resetSelection = () => {
  selectedNarrativeId.value = ''
  selectedAccountIds.value = []
}

const searchNarratives = async () => {
  if (!narrativeKeyword.value.trim()) {
    ElMessage.warning('请输入叙事关键词')
    return
  }
  narrativeLoading.value = true
  try {
    narrativeOptions.value = normalizeEntityList(await searchEntities({
      keyword: narrativeKeyword.value.trim(),
      label: 'Narrative',
      limit: 10
    }))
  } catch {
    ElMessage.error('搜索叙事实体失败')
  } finally {
    narrativeLoading.value = false
  }
}

const searchAccounts = async () => {
  if (!accountKeyword.value.trim()) {
    ElMessage.warning('请输入账号关键词')
    return
  }
  accountLoading.value = true
  try {
    accountOptions.value = normalizeEntityList(await searchEntities({
      keyword: accountKeyword.value.trim(),
      label: 'SocialAccount',
      limit: 10
    }))
  } catch {
    ElMessage.error('搜索账号失败')
  } finally {
    accountLoading.value = false
  }
}

const clearPoll = () => {
  if (pollTimer.value !== null) {
    window.clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

const loadTask = async (taskId: string) => {
  taskLoading.value = true
  try {
    currentTask.value = (await request.get(`/api/identification/tasks/${taskId}`)) as unknown as IdentificationTask
    return currentTask.value
  } catch {
    ElMessage.error('加载识别任务失败')
    return null
  } finally {
    taskLoading.value = false
  }
}

const startPolling = (taskId: string) => {
  clearPoll()
  pollCount.value = 0
  pollTimer.value = window.setInterval(async () => {
    pollCount.value += 1
    const task = await loadTask(taskId)
    if (!task || ['DONE', 'FAILED'].includes(task.status) || pollCount.value >= maxPollCount) {
      clearPoll()
    }
  }, 3000)
}

const triggerNarrativeIdentification = async () => {
  if (!selectedNarrativeId.value) return
  clearPoll()
  triggering.value = true
  try {
    currentTask.value = (await request.post(
      `/api/identification/narratives/${selectedNarrativeId.value}/identify`
    )) as unknown as IdentificationTask
    ElMessage.success('识别任务已创建')
    startPolling(currentTask.value.id)
  } catch {
    ElMessage.error('触发识别失败')
  } finally {
    triggering.value = false
  }
}

const triggerAccountAnalysis = async () => {
  if (!selectedAccountIds.value.length) return
  triggering.value = true
  try {
    const accountNames = selectedAccountIds.value.join(', ')
    await createAnalysisTask({
      inputText: `请对以下账号执行重点目标识别分析：${accountNames}`
    })
    ElMessage.success('已创建账号识别分析任务')
    router.push('/analysis')
  } catch {
    ElMessage.error('创建账号识别分析任务失败')
  } finally {
    triggering.value = false
  }
}

onUnmounted(() => {
  clearPoll()
})
</script>

<style scoped>
.identification-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.page-header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.search-line {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) auto;
  gap: 12px;
  width: 100%;
}

.full-width {
  width: 100%;
}

.selected-id {
  margin: -4px 0 16px;
  font-size: 13px;
  color: #6b7280;
}

.result-card {
  min-height: 360px;
}

.pending-box,
.summary-box {
  margin-top: 16px;
}

.pending-box p {
  margin: 0 0 12px;
  color: #6b7280;
}

.metric-card {
  margin-bottom: 16px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.metric-label {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.result-summary {
  padding: 16px;
  margin: 0;
  line-height: 1.7;
  white-space: pre-wrap;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
</style>
