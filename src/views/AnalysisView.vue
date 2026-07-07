<template>
  <div class="analysis-view">
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">分析工作台</span>
        <el-button type="primary" size="small" @click="startNewConversation">
          <el-icon><Plus /></el-icon>
          新建对话
        </el-button>
      </div>

      <div v-loading="historyLoading" class="session-list">
        <div v-if="!historyLoading && !historySessions.length" class="session-empty">暂无历史会话</div>
        <div
          v-for="session in historySessions"
          :key="session.id"
          class="session-item"
          :class="{ active: currentSessionId === session.id }"
          @click="selectSession(session)"
        >
          <el-icon class="session-icon"><ChatLineRound /></el-icon>
          <div class="session-info">
            <div class="session-title">{{ session.title || '未命名对话' }}</div>
            <div class="session-time">{{ formatTime(session.lastMessageAt || session.createdAt) }}</div>
          </div>
        </div>
      </div>
    </aside>

    <main class="chat-main">
      <div ref="messagesAreaRef" class="messages-area">
        <div v-if="!messages.length" class="welcome">
          <div class="welcome-title">开始一次分析</div>
          <div class="welcome-sub">输入分析主题，系统会检索内容、调用工具并流式返回研判结果。</div>
        </div>

        <template v-for="message in messages" :key="message.id">
          <div v-if="message.role === 'user'" class="message-row user-row">
            <div class="message-bubble user-bubble">{{ message.content }}</div>
            <div class="avatar user-avatar">
              <el-icon><User /></el-icon>
            </div>
          </div>

          <div v-else class="message-row ai-row">
            <div class="avatar ai-avatar">AI</div>
            <div class="message-bubble ai-bubble">
              <el-collapse v-if="message.logs?.length" class="tool-logs-collapse">
                <el-collapse-item>
                  <template #title>
                    <span class="tool-logs-title">
                      <el-icon><Monitor /></el-icon>
                      已执行 {{ message.logs.length }} 个工具调用
                    </span>
                  </template>
                  <div v-for="(log, idx) in message.logs" :key="idx" class="tool-log-item">
                    <span class="tool-log-time">[{{ log.time }}]</span>
                    {{ log.icon }} {{ log.message }}
                  </div>
                </el-collapse-item>
              </el-collapse>

              <div v-if="message.isStreaming && !message.content" class="thinking">
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
              </div>

              <div v-if="message.content" class="ai-content" v-html="renderMarkdown(message.content)" />
              <span v-if="message.isStreaming" class="typing-cursor">▊</span>
            </div>
          </div>
        </template>
      </div>

      <div class="input-area">
        <div class="input-box">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="3"
            :autosize="{ minRows: 2, maxRows: 6 }"
            placeholder="输入分析主题，按 Ctrl+Enter 发送..."
            resize="none"
            @keydown.ctrl.enter.prevent="handleSend"
          />
          <el-button
            type="primary"
            :loading="creating"
            :disabled="!inputText.trim()"
            class="send-btn"
            @click="handleSend"
          >
            <el-icon><Promotion /></el-icon>
          </el-button>
        </div>
        <div class="input-hint">Ctrl + Enter 发送 · 分析过程由 Qwen3-VL-32B 驱动</div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { ChatLineRound, Monitor, Plus, Promotion, User } from '@element-plus/icons-vue'
import {
  createAnalysisTask,
  getAnalysisTask,
  getSessionMessages,
  getSessions
} from '@/api/analysis'

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

interface Session {
  id: string
  title: string
  messageCount: number
  lastMessageAt: string
  isArchived: boolean
  createdAt: string
}

interface SessionMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system' | string
  content: string
  taskId?: string | null
  createdAt: string
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

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  isStreaming?: boolean
  logs?: LogLine[]
  taskId?: string
  status?: string
}

const inputText = ref('')
const creating = ref(false)
const historyLoading = ref(false)
const historySessions = ref<Session[]>([])
const currentSession = ref<Session | null>(null)
const currentSessionId = ref<string | undefined>()
const currentTask = ref<WorkflowTask | null>(null)
const sessionTaskMap = ref<Record<string, string>>({})
const messages = ref<ChatMessage[]>([])
const eventSource = ref<EventSource | null>(null)
const messagesAreaRef = ref<HTMLElement | null>(null)

const formatTime = (time?: string | null) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const renderMarkdown = (markdown: string) => {
  return markdown
    .replace(/^# (.*)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br />')
}

const normalizeSessionResult = (result: unknown) => {
  const list = Array.isArray(result)
    ? result
    : ((result as { records?: unknown[]; items?: unknown[] }).records ?? (result as { items?: unknown[] }).items ?? [])
  return (list as Session[])
    .slice()
    .sort((a, b) => dayjs(b.lastMessageAt || b.createdAt).valueOf() - dayjs(a.lastMessageAt || a.createdAt).valueOf())
    .slice(0, 20)
}

const normalizeMessageResult = (result: unknown) => {
  const list = Array.isArray(result)
    ? result
    : ((result as { records?: unknown[]; items?: unknown[] }).records ?? (result as { items?: unknown[] }).items ?? [])
  return (list as SessionMessage[])
    .slice()
    .sort((a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf())
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

const scrollToBottom = () => {
  nextTick(() => {
    const container = messagesAreaRef.value
    if (container) container.scrollTop = container.scrollHeight
  })
}

const loadHistoryTasks = async () => {
  historyLoading.value = true
  try {
    historySessions.value = normalizeSessionResult(await getSessions())
  } catch {
    ElMessage.error('加载历史会话失败')
  } finally {
    historyLoading.value = false
  }
}

const loadTaskDetail = async (taskId: string) => {
  try {
    const task = (await getAnalysisTask(taskId)) as unknown as WorkflowTask
    currentTask.value = task
    currentSessionId.value = task.sessionId
    sessionTaskMap.value = { ...sessionTaskMap.value, [task.sessionId]: task.id }
    return task
  } catch {
    ElMessage.error('加载任务详情失败')
    return null
  }
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

const startNewConversation = () => {
  closeSse()
  currentSession.value = null
  currentSessionId.value = undefined
  currentTask.value = null
  inputText.value = ''
  messages.value = []
}

const connectSseToMessage = (taskId: string, aiMsgId: string) => {
  closeSse()
  const token = localStorage.getItem('token')
  const url = `/api/analysis/${taskId}/stream?token=${encodeURIComponent(token || '')}`
  const es = new EventSource(url)
  eventSource.value = es

  const getMsg = () => messages.value.find(message => message.id === aiMsgId)
  const pushLog = (icon: string, message: string) => {
    const msg = getMsg()
    if (!msg) return
    if (!msg.logs) msg.logs = []
    msg.logs.push({ icon, message, time: dayjs().format('HH:mm:ss') })
    scrollToBottom()
  }

  es.addEventListener('task_started', () => {
    const msg = getMsg()
    if (msg) msg.isStreaming = true
  })

  es.addEventListener('tool_started', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    const stepName = String(data.stepName ?? 'unknown')
    const input = data.input as Record<string, unknown> | null
    const query = String(input?.query ?? input?.nodeId ?? input?.personId ?? '')
    pushLog('🔍', `调用工具：${stepName}${query ? ` - ${query}` : ''}`)
  })

  es.addEventListener('tool_completed', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    const stepName = String(data.stepName ?? 'unknown')
    const durationMs = Number(data.durationMs ?? 0)
    const output = data.output as Record<string, unknown> | null
    const resultCount = output?.total ?? (output?.contents as unknown[])?.length ?? output?.nodeCount ?? ''
    pushLog('✅', `工具完成：${stepName}，耗时 ${durationMs}ms${resultCount !== '' ? `，返回 ${String(resultCount)} 条` : ''}`)
  })

  es.addEventListener('tool_failed', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    pushLog('❌', `工具失败：${String(data.stepName ?? '')}，${String(data.error ?? '')}`)
  })

  es.addEventListener('token', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    const msg = getMsg()
    if (msg) {
      msg.content += String(data.token ?? '')
      scrollToBottom()
    }
  })

  es.addEventListener('task_completed', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    const msg = getMsg()
    if (msg) {
      msg.isStreaming = false
      msg.status = 'DONE'
      msg.content = msg.content || String(data.summary ?? '')
    }
    es.close()
    if (eventSource.value === es) eventSource.value = null
    void loadTaskDetail(taskId)
    void loadHistoryTasks()
  })

  es.addEventListener('task_failed', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    const msg = getMsg()
    if (msg) {
      msg.isStreaming = false
      msg.status = 'FAILED'
      msg.content = msg.content || `❌ 分析失败：${String(data.error ?? '未知错误')}`
    }
    es.close()
    if (eventSource.value === es) eventSource.value = null
    void loadTaskDetail(taskId)
    void loadHistoryTasks()
  })

  es.onerror = () => {
    const msg = getMsg()
    if (msg?.isStreaming) msg.isStreaming = false
    es.close()
    if (eventSource.value === es) eventSource.value = null
  }

  return es
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || creating.value) return

  inputText.value = ''
  messages.value.push({ id: `user-${Date.now()}`, role: 'user', content: text })

  const aiMsgId = `ai-${Date.now()}`
  const aiMsg: ChatMessage = { id: aiMsgId, role: 'ai', content: '', isStreaming: true, logs: [] }
  messages.value.push(aiMsg)
  scrollToBottom()

  closeSse()
  creating.value = true
  try {
    const payload: CreateTaskRequest = {
      inputText: text,
      sessionId: currentSessionId.value
    }
    const result = (await createAnalysisTask(payload)) as unknown as CreateTaskResponse
    const task = normalizeCreatedTask(result, text)
    currentTask.value = task
    currentSessionId.value = result.sessionId
    sessionTaskMap.value = { ...sessionTaskMap.value, [result.sessionId]: result.taskId }
    aiMsg.taskId = result.taskId
    aiMsg.status = result.status
    connectSseToMessage(result.taskId, aiMsgId)
    await loadHistoryTasks()
    currentSession.value = historySessions.value.find(session => session.id === result.sessionId) ?? null
  } catch {
    aiMsg.isStreaming = false
    aiMsg.status = 'FAILED'
    aiMsg.content = '❌ 任务创建失败，请重试'
    ElMessage.error('创建分析任务失败')
  } finally {
    creating.value = false
    scrollToBottom()
  }
}

const selectSession = async (session: Session) => {
  closeSse()
  currentSession.value = session
  currentSessionId.value = session.id
  currentTask.value = null
  messages.value = []

  try {
    const sessionMessages = normalizeMessageResult(await getSessionMessages(session.id))
    for (const message of sessionMessages) {
      if (message.role === 'user') {
        messages.value.push({ id: message.id, role: 'user', content: message.content })
      } else if (message.role === 'assistant') {
        messages.value.push({
          id: message.id,
          role: 'ai',
          content: message.content,
          logs: [],
          taskId: message.taskId ?? undefined
        })
      }
    }

    if (!messages.value.length && session.title) {
      messages.value.push({ id: `hist-${session.id}`, role: 'user', content: session.title })
    }

    const lastAiMessage = [...messages.value].reverse().find(message => message.role === 'ai')
    const taskId = lastAiMessage?.taskId || sessionTaskMap.value[session.id]
    if (taskId) {
      const detail = await loadTaskDetail(taskId)
      if (detail?.status === 'RUNNING') {
        const aiMessage = lastAiMessage ?? {
          id: `ai-${Date.now()}`,
          role: 'ai' as const,
          content: detail.resultSummary ?? '',
          isStreaming: true,
          logs: [],
          taskId
        }
        if (!lastAiMessage) messages.value.push(aiMessage)
        aiMessage.isStreaming = true
        connectSseToMessage(taskId, aiMessage.id)
      }
    }
  } catch {
    ElMessage.error('加载会话消息失败')
    messages.value = [{ id: `hist-${session.id}`, role: 'user', content: session.title || '' }]
  } finally {
    scrollToBottom()
  }
}

onMounted(() => {
  void loadHistoryTasks()
})

onUnmounted(() => {
  closeSse()
})
</script>

<style scoped>
.analysis-view {
  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;
  background: #f8f9fa;
}

.sidebar {
  width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  background: #1a1a2e;
  border-right: 1px solid #2d2d4e;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid #2d2d4e;
}

.sidebar-title {
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}

.session-list {
  flex: 1;
  padding: 8px;
  overflow-y: auto;
}

.session-empty {
  padding: 20px 8px;
  color: #6b6b8a;
  font-size: 13px;
  text-align: center;
}

.session-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 2px;
  color: #a0a0b8;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s, color 0.2s;
}

.session-item:hover,
.session-item.active {
  color: #ffffff;
  background: #2d2d4e;
}

.session-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.session-info {
  min-width: 0;
}

.session-title {
  max-width: 170px;
  overflow: hidden;
  font-size: 13px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-time {
  margin-top: 2px;
  font-size: 11px;
  color: #6b6b8a;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f8f9fa;
}

.messages-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  overflow-y: auto;
}

.welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #909399;
  text-align: center;
}

.welcome-title {
  margin-bottom: 8px;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.welcome-sub {
  max-width: 420px;
  font-size: 14px;
  line-height: 1.7;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 880px;
}

.user-row {
  flex-direction: row-reverse;
  margin-left: auto;
}

.ai-row {
  margin-right: auto;
}

.avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 600;
}

.user-avatar {
  color: #ffffff;
  background: #409eff;
}

.ai-avatar {
  color: #ffffff;
  background: #1a1a2e;
  font-size: 11px;
}

.message-bubble {
  max-width: 720px;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.user-bubble {
  color: #ffffff;
  background: #409eff;
  border-bottom-right-radius: 4px;
}

.ai-bubble {
  color: #111827;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.tool-logs-collapse {
  margin-bottom: 12px;
  overflow: hidden;
  background: #f8f9fa;
  border: none;
  border-radius: 6px;
}

.tool-logs-collapse :deep(.el-collapse-item__header) {
  height: 34px;
  padding: 0 10px;
  background: #f8f9fa;
  border-bottom: 1px solid #ebeef5;
}

.tool-logs-collapse :deep(.el-collapse-item__content) {
  padding: 8px 10px;
  background: #f8f9fa;
}

.tool-logs-title {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #606266;
  font-size: 12px;
}

.tool-log-item {
  padding: 3px 0;
  color: #606266;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}

.tool-log-time {
  color: #909399;
  margin-right: 4px;
}

.thinking {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  background: #409eff;
  border-radius: 50%;
  animation: thinking 1.4s ease-in-out infinite;
}

.thinking-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dot:nth-child(3) {
  animation-delay: 0.4s;
}

.ai-content {
  line-height: 1.8;
  white-space: pre-wrap;
}

.ai-content :deep(h3) {
  margin: 12px 0 6px;
  font-size: 15px;
  font-weight: 600;
}

.ai-content :deep(strong) {
  font-weight: 600;
}

.ai-content :deep(li) {
  margin: 4px 0;
  padding-left: 4px;
}

.typing-cursor {
  display: inline-block;
  margin-left: 4px;
  color: #409eff;
  font-weight: bold;
  animation: blink 1s step-end infinite;
}

.input-area {
  padding: 16px 24px 20px;
  background: #ffffff;
  border-top: 1px solid #e4e7ed;
}

.input-box {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.input-box :deep(.el-textarea) {
  flex: 1;
}

.send-btn {
  width: 48px;
  height: 60px;
  flex-shrink: 0;
}

.input-hint {
  margin-top: 6px;
  color: #909399;
  font-size: 11px;
  text-align: center;
}

@keyframes thinking {
  0%,
  80%,
  100% {
    opacity: 0.4;
    transform: scale(0.6);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@media (max-width: 900px) {
  .analysis-view {
    height: calc(100vh - 60px);
  }

  .sidebar {
    width: 220px;
  }

  .message-bubble {
    max-width: min(720px, calc(100vw - 320px));
  }
}
</style>
