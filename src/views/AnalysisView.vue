<template>
  <div class="analysis-view">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card class="input-card" shadow="never">
          <template #header>分析工作台</template>
        <el-form label-position="top">
            <el-form-item label="分析主题">
              <el-input
                v-model="inputText"
                type="textarea"
                :rows="4"
                placeholder="请输入分析主题，例如：分析霍尔木兹海峡相关的信息操控账号"
              />
            </el-form-item>
            <el-button class="full-width" type="primary" :loading="creating" @click="handleStartAnalysis">
              开始分析
            </el-button>
          </el-form>
          <div class="current-user">当前用户：{{ currentUserId || '-' }}</div>
        </el-card>

        <el-card class="history-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>历史任务</span>
              <el-button link type="primary" :loading="historyLoading" @click="loadHistoryTasks">刷新</el-button>
            </div>
          </template>
          <div v-loading="historyLoading" class="history-list">
            <el-empty v-if="!historyLoading && !historyTasks.length" description="暂无历史任务" />
            <button
              v-for="task in historyTasks"
              :key="task.id"
              class="history-item"
              :class="{ active: currentTask?.id === task.id }"
              type="button"
              @click="selectTask(task)"
            >
              <div class="history-item__text">{{ truncateText(task.inputText, 50) }}</div>
              <div class="history-item__meta">
                <el-tag :type="statusTagType(task.status)" :class="{ 'running-tag': task.status === 'RUNNING' }">
                  {{ task.status }}
                </el-tag>
                <span>{{ formatTime(task.createdAt) }}</span>
              </div>
            </button>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card class="log-card" shadow="never">
          <template #header>实时分析过程</template>
          <div ref="logContainerRef" class="log-container">
            <div v-if="!logs.length" class="log-empty">等待分析任务启动</div>
            <div v-for="(log, index) in logs" :key="`${log.time}-${index}`" class="log-line">
              [{{ log.time }}] {{ log.icon }} {{ log.message }}
            </div>
          </div>
        </el-card>

        <el-card class="status-card" shadow="never">
          <template #header>任务状态</template>
          <el-descriptions v-if="currentTask" :column="3" border>
            <el-descriptions-item label="任务 ID">{{ shortTaskId }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="statusTagType(currentTask.status)" :class="{ 'running-tag': currentTask.status === 'RUNNING' }">
                {{ currentTask.status }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatTime(currentTask.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="耗时">{{ formatDuration(currentTask.totalDurationMs) }}</el-descriptions-item>
            <el-descriptions-item label="Token">{{ currentTask.llmTokensUsed ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="会话 ID">{{ currentTask.sessionId || '-' }}</el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="请选择或创建分析任务" />
          <el-progress
            v-if="currentTask?.status === 'RUNNING'"
            class="running-progress"
            :percentage="runningPercentage"
            :show-text="false"
          />
        </el-card>

        <el-card class="result-card" shadow="never">
          <template #header>分析结果</template>
          <div v-if="currentTask?.status === 'DONE' && currentTask.resultSummary" class="result-content" v-html="renderedSummary" />
          <el-empty v-else-if="currentTask?.status === 'FAILED'" description="任务执行失败" />
          <el-empty v-else description="分析完成后显示结果" />
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { createAnalysisTask, getAnalysisTask } from '@/api/analysis'
import { useAuthStore } from '@/stores/auth'

interface CreateTaskRequest {
  inputText: string
  sessionId?: string
}

interface CreateTaskResponse {
  taskId: string
  sessionId: string
  status: WorkflowTask['status']
  streamUrl?: string
}

interface WorkflowTask {
  id: string
  sessionId: string
  inputText: string
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
  resultSummary: string | null
  resultData: string | null
  llmTokensUsed: number
  totalDurationMs: number | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

interface LogLine {
  time: string
  icon: string
  message: string
}

const authStore = useAuthStore()
const inputText = ref('')
const creating = ref(false)
const historyLoading = ref(false)
const historyTasks = ref<WorkflowTask[]>([])
const currentTask = ref<WorkflowTask | null>(null)
const logs = ref<LogLine[]>([])
const eventSource = ref<EventSource | null>(null)
const logContainerRef = ref<HTMLElement | null>(null)
const runningPercentage = ref(8)
const progressTimer = ref<number | null>(null)

const shortTaskId = computed(() => currentTask.value?.id.slice(0, 8) || '-')
const renderedSummary = computed(() => renderMarkdown(currentTask.value?.resultSummary || ''))

const currentUserId = computed(() => authStore.user?.id || '')

const formatTime = (time?: string | null) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const formatDuration = (durationMs?: number | null) => {
  if (!durationMs) return '-'
  if (durationMs < 1000) return `${durationMs}ms`
  return `${Math.round(durationMs / 1000)}s`
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return '-'
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const statusTagType = (status: WorkflowTask['status']) => {
  if (status === 'RUNNING') return 'primary'
  if (status === 'DONE') return 'success'
  if (status === 'FAILED') return 'danger'
  return 'info'
}

const renderMarkdown = (markdown: string) => {
  return markdown
    .replace(/^# (.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br />')
}

const normalizeHistoryResult = (result: unknown) => {
  const list = Array.isArray(result)
    ? result
    : ((result as { records?: unknown[]; items?: unknown[] }).records ?? (result as { items?: unknown[] }).items ?? [])
  return (list as WorkflowTask[])
    .slice()
    .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
    .slice(0, 20)
}

const normalizeCreatedTask = (result: CreateTaskResponse, input: string): WorkflowTask => ({
  id: result.taskId,
  sessionId: result.sessionId,
  inputText: input,
  status: result.status || 'PENDING',
  resultSummary: null,
  resultData: null,
  llmTokensUsed: 0,
  totalDurationMs: null,
  startedAt: null,
  completedAt: null,
  createdAt: new Date().toISOString()
})

const loadHistoryTasks = async () => {
  historyLoading.value = true
  try {
    historyTasks.value = normalizeHistoryResult(await request.get('/api/analysis/tasks'))
  } catch {
    ElMessage.error('加载历史任务失败')
  } finally {
    historyLoading.value = false
  }
}

const loadTaskDetail = async (taskId: string) => {
  try {
    const task = (await getAnalysisTask(taskId)) as unknown as WorkflowTask
    currentTask.value = task
    upsertHistoryTask(task)
    return task
  } catch {
    ElMessage.error('加载任务详情失败')
    return null
  }
}

const upsertHistoryTask = (task: WorkflowTask) => {
  const next = historyTasks.value.filter(item => item.id !== task.id)
  next.unshift(task)
  historyTasks.value = next
    .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
    .slice(0, 20)
}

const appendLog = (icon: string, message: string) => {
  logs.value.push({
    time: dayjs().format('HH:mm:ss'),
    icon,
    message
  })
  nextTick(() => {
    const container = logContainerRef.value
    if (container) container.scrollTop = container.scrollHeight
  })
}

const closeSse = () => {
  eventSource.value?.close()
  eventSource.value = null
}

const safeJsonParse = (value: string) => {
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

const connectSse = (taskId: string) => {
  closeSse()
  const token = localStorage.getItem('token')
  const url = `/api/analysis/${taskId}/stream?token=${encodeURIComponent(token || '')}`
  const es = new EventSource(url)

  es.addEventListener('task_started', () => {
    appendLog('🚀', '分析任务已启动')
  })

  es.addEventListener('tool_call', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    const toolName = String(data.toolName ?? data.name ?? 'unknown')
    const description = String(data.description ?? data.query ?? data.input ?? '')
    appendLog('🔍', `调用工具：${toolName}${description ? ` - ${description}` : ''}`)
  })

  es.addEventListener('analysis_log', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    appendLog(String(data.icon ?? '📊'), String(data.message ?? '分析过程更新'))
  })

  es.addEventListener('task_completed', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    const durationMs = Number(data.durationMs ?? 0)
    appendLog('✅', `分析完成，耗时 ${Math.round(durationMs / 1000)}s`)
    es.close()
    eventSource.value = null
    void loadTaskDetail(taskId)
  })

  es.addEventListener('task_failed', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    appendLog('❌', `分析失败：${String(data.error ?? '未知错误')}`)
    es.close()
    eventSource.value = null
    void loadTaskDetail(taskId)
  })

  es.onmessage = event => {
    const data = safeJsonParse(event.data)
    appendLog(String(data.icon ?? '📊'), String(data.message ?? event.data ?? '分析过程更新'))
  }

  es.onerror = () => {
    es.close()
    if (eventSource.value === es) eventSource.value = null
  }

  eventSource.value = es
  return es
}

const handleStartAnalysis = async () => {
  const trimmed = inputText.value.trim()
  if (!trimmed) {
    ElMessage.warning('请输入分析主题')
    return
  }

  closeSse()
  logs.value = []
  creating.value = true
  try {
    const payload: CreateTaskRequest = {
      inputText: trimmed
    }
    if (currentTask.value?.sessionId) payload.sessionId = currentTask.value.sessionId

    const result = (await createAnalysisTask(payload)) as unknown as CreateTaskResponse
    const task = normalizeCreatedTask(result, trimmed)
    currentTask.value = task
    upsertHistoryTask(task)
    appendLog('🚀', '分析任务已启动')
    connectSse(task.id)
  } catch {
    ElMessage.error('创建分析任务失败')
  } finally {
    creating.value = false
  }
}

const selectTask = async (task: WorkflowTask) => {
  closeSse()
  logs.value = []
  const detail = await loadTaskDetail(task.id)
  if (!detail) return
  if (detail.status === 'RUNNING') {
    appendLog('🚀', '已重新连接运行中的分析任务')
    connectSse(detail.id)
  }
}

const startProgressAnimation = () => {
  stopProgressAnimation()
  progressTimer.value = window.setInterval(() => {
    if (currentTask.value?.status !== 'RUNNING') {
      runningPercentage.value = 8
      return
    }
    runningPercentage.value = runningPercentage.value >= 96 ? 8 : runningPercentage.value + 4
  }, 500)
}

const stopProgressAnimation = () => {
  if (progressTimer.value !== null) {
    window.clearInterval(progressTimer.value)
    progressTimer.value = null
  }
}

onMounted(() => {
  void loadHistoryTasks()
  startProgressAnimation()
})

onUnmounted(() => {
  closeSse()
  stopProgressAnimation()
})
</script>

<style scoped>
.analysis-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-card,
.history-card,
.log-card,
.status-card,
.result-card {
  border-radius: 8px;
}

.history-card {
  margin-top: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.full-width {
  width: 100%;
}

.current-user {
  margin-top: 12px;
  font-size: 12px;
  color: #6b7280;
}

.history-list {
  min-height: 360px;
  max-height: 560px;
  overflow: auto;
}

.history-item {
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  text-align: left;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.history-item:hover,
.history-item.active {
  border-color: #2563eb;
  background: #eff6ff;
}

.history-item__text {
  line-height: 1.5;
  color: #111827;
}

.history-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.log-card {
  margin-bottom: 16px;
}

.log-container {
  height: 300px;
  padding: 12px;
  overflow: auto;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #d1d5db;
  background: #111827;
  border-radius: 8px;
}

.log-empty {
  color: #9ca3af;
}

.log-line {
  white-space: pre-wrap;
}

.status-card {
  margin-bottom: 16px;
}

.running-progress {
  margin-top: 14px;
}

.result-card {
  min-height: 320px;
}

.result-content {
  white-space: pre-wrap;
  line-height: 1.7;
  color: #111827;
}

.result-content :deep(h3) {
  margin: 16px 0 8px;
  font-size: 18px;
}

.result-content :deep(li) {
  margin: 4px 0 4px 18px;
}

.running-tag {
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@media (max-width: 1100px) {
  :deep(.el-col-8),
  :deep(.el-col-16) {
    max-width: 100%;
    flex: 0 0 100%;
  }
}
</style>
