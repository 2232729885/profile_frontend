<template>
  <div class="analysis-view" @click="hideSessionMenu">
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
          @contextmenu.prevent="showSessionMenu($event, session)"
        >
          <el-icon class="session-icon"><ChatLineRound /></el-icon>
          <div class="session-info">
            <div class="session-title">
              <el-input
                v-if="renamingSessionId === session.id"
                v-model="renameValue"
                size="small"
                @blur="confirmRename(session)"
                @keydown.enter="confirmRename(session)"
                @keydown.esc="renamingSessionId = null"
                @click.stop
                autofocus
              />
              <span v-else>{{ session.title || '未命名对话' }}</span>
            </div>
            <div class="session-time">{{ formatTime(session.lastMessageAt || session.createdAt) }}</div>
          </div>
          <div class="session-actions" @click.stop>
            <el-button link size="small" @click.stop="startRename(session)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button link size="small" @click.stop="deleteSession(session)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <div class="sidebar-footer">
        <button class="agent-info-btn" @click="agentInfoVisible = true">
          <el-icon><InfoFilled /></el-icon>
          <span>查看 Agent 信息</span>
        </button>
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

              <el-collapse v-if="message.thinkingContent" class="thinking-collapse">
                <el-collapse-item>
                  <template #title>
                    <span class="thinking-title">
                      <el-icon><Loading v-if="message.isThinking" /><View v-else /></el-icon>
                      {{ message.isThinking ? '思考中...' : '查看思考过程' }}
                    </span>
                  </template>
                  <div class="thinking-content">{{ message.thinkingContent }}</div>
                </el-collapse-item>
              </el-collapse>

              <div v-if="message.isThinking && !message.content" class="thinking-dots">
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
                <span class="thinking-dot"></span>
              </div>

              <div v-if="message.content" class="ai-content" v-html="renderMarkdown(message.content)" />
              <span v-if="message.isStreaming && !message.isThinking" class="typing-cursor">▊</span>
            </div>
          </div>
        </template>
      </div>

      <div class="input-area">
        <div class="input-box">
          <el-upload
            :show-file-list="false"
            :http-request="handleFileUpload"
            accept=".txt,.md,.json,.csv"
            :disabled="creating"
          >
            <el-button :icon="Paperclip" circle size="default" :disabled="creating" />
          </el-upload>

          <el-tag
            v-if="attachedFile"
            closable
            class="attached-file-tag"
            @close="attachedFile = null"
          >
            📎 {{ attachedFile.name }}
          </el-tag>

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

    <el-dialog v-model="agentInfoVisible" title="Agent 信息" width="640px">
      <div v-loading="agentInfoLoading" class="agent-info-dialog">
        <div class="agent-section">
          <div class="agent-section-title">🤖 模型</div>
          <el-tag type="success">{{ agentInfo?.model }}</el-tag>
          <span class="agent-meta">最大 Token：{{ agentInfo?.maxTokens }}</span>
        </div>

        <div class="agent-section">
          <div class="agent-section-title">🔧 已接入工具（{{ agentInfo?.tools?.length ?? 0 }} 个）</div>
          <div v-for="tool in agentInfo?.tools" :key="tool.name" class="tool-card">
            <div class="tool-header">
              <span class="tool-icon">{{ tool.icon }}</span>
              <span class="tool-name">{{ tool.name }}</span>
            </div>
            <div class="tool-desc">{{ tool.description }}</div>
            <div class="tool-params">
              <span class="tool-params-label">参数：</span>
              <el-tag
                v-for="param in tool.params"
                :key="param"
                size="small"
                type="info"
                effect="plain"
                style="margin: 2px"
              >
                {{ param }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="agent-section">
          <div class="agent-section-title">📋 System Prompt</div>
          <pre class="system-prompt-box">{{ agentInfo?.systemPrompt }}</pre>
        </div>
      </div>
    </el-dialog>

    <div
      v-if="sessionMenu.visible && sessionMenu.session"
      class="session-context-menu"
      :style="{ left: `${sessionMenu.x}px`, top: `${sessionMenu.y}px` }"
      @click.stop
    >
      <button type="button" @click="startRename(sessionMenu.session); hideSessionMenu()">
        <el-icon><Edit /></el-icon>
        重命名
      </button>
      <button type="button" class="danger" @click="deleteSession(sessionMenu.session); hideSessionMenu()">
        <el-icon><Delete /></el-icon>
        删除
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatLineRound, Delete, Edit, InfoFilled, Loading, Monitor, Paperclip, Plus, Promotion, User, View } from '@element-plus/icons-vue'
import {
  createAnalysisTask,
  createTaskWithFile,
  deleteSession as deleteSessionApi,
  getAgentInfo,
  getAnalysisTask,
  getSessionMessages,
  getSessions,
  renameSession
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
  thinkingContent: string
  isStreaming?: boolean
  isThinking?: boolean
  logs?: LogLine[]
  taskId?: string
  status?: string
}

interface AgentTool {
  name: string
  description: string
  icon: string
  params: string[]
}

interface AgentInfo {
  tools: AgentTool[]
  systemPrompt: string
  model: string
  maxTokens: number
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
const agentInfoVisible = ref(false)
const agentInfoLoading = ref(false)
const agentInfo = ref<AgentInfo | null>(null)
const renamingSessionId = ref<string | null>(null)
const renameValue = ref('')
const attachedFile = ref<File | null>(null)
const sessionMenu = ref<{
  visible: boolean
  x: number
  y: number
  session: Session | null
}>({
  visible: false,
  x: 0,
  y: 0,
  session: null
})

const formatTime = (time?: string | null) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const renderMarkdown = (markdown: string): string => {
  if (!markdown) return ''

  let content = markdown

  // 1. 去掉 ```markdown ... ``` 包裹
  content = content.replace(/^```(?:markdown)?\s*\n?/im, '').replace(/\n?```\s*$/m, '').trim()

  // 2. 标题（h1/h2/h3/h4）
  content = content.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  content = content.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // 3. 粗体和斜体
  content = content.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  content = content.replace(/\*(.+?)\*/g, '<em>$1</em>')
  content = content.replace(/`([^`]+)`/g, '<code>$1</code>')

  // 4. 无序列表（连续的 - 行包裹在 <ul> 里）
  content = content.replace(/(^- .+$(\n^- .+$)*)/gm, match => {
    const items = match.split('\n').map(line =>
      `<li>${line.replace(/^- /, '')}</li>`
    ).join('')
    return `<ul>${items}</ul>`
  })

  // 5. 有序列表（连续的 1. 2. 行包裹在 <ol> 里）
  content = content.replace(/(^\d+\. .+$(\n^\d+\. .+$)*)/gm, match => {
    const items = match.split('\n').map(line =>
      `<li>${line.replace(/^\d+\. /, '')}</li>`
    ).join('')
    return `<ol>${items}</ol>`
  })

  // 6. 分隔线
  content = content.replace(/^---+$/gm, '<hr />')

  // 7. 段落和换行（标题/列表/hr 之外的行）
  const lines = content.split('\n')
  const result: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      result.push('<br />')
    } else if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<ul>') ||
      trimmed.startsWith('<ol>') ||
      trimmed.startsWith('<hr') ||
      trimmed.startsWith('<li>') ||
      trimmed.endsWith('</ul>') ||
      trimmed.endsWith('</ol>')
    ) {
      result.push(trimmed)
    } else {
      result.push(`<p>${trimmed}</p>`)
    }
  }

  return result.join('\n')
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

const applyRawAssistantContent = (msg: ChatMessage, raw: string) => {
  // 优先处理 <think> 标签
  if (raw.includes('<think>') && !raw.includes('</think>')) {
    msg.isThinking = true
    msg.content = ''
    msg.thinkingContent = raw.replace('<think>', '').trim()
    return
  }
  if (raw.includes('</think>')) {
    msg.isThinking = false
    const thinkStart = raw.indexOf('<think>')
    const thinkEnd = raw.indexOf('</think>')
    msg.thinkingContent = raw.substring(thinkStart >= 0 ? thinkStart + 7 : 0, thinkEnd).trim()
    msg.content = raw.substring(thinkEnd + 8).trim()
    return
  }

  // 无 <think> 标签：识别推理过程和最终报告的分割点
  // 最终报告以 ```markdown 或独立 ## 标题行开头
  const reportStart = findReportStart(raw)
  if (reportStart > 100) {
    msg.isThinking = false
    msg.thinkingContent = raw.substring(0, reportStart).trim()
    msg.content = raw.substring(reportStart).trim()
  } else {
    msg.isThinking = false
    msg.thinkingContent = ''
    msg.content = raw
  }
}

const findReportStart = (raw: string): number => {
  // 找 ```markdown 的位置
  const markdownBlock = raw.search(/```(?:markdown)?/i)
  if (markdownBlock > 0) return markdownBlock

  // 找独立 ## 标题行的位置（行首，前面有换行）
  const headingMatch = raw.match(/\n(#{1,3} [^\n]+)/)
  if (headingMatch && headingMatch.index !== undefined) return headingMatch.index

  return -1
}

const createAssistantMessage = (id: string, rawContent = '', options: Partial<ChatMessage> = {}): ChatMessage => {
  const message: ChatMessage = {
    id,
    role: 'ai',
    content: '',
    thinkingContent: '',
    logs: [],
    ...options
  }
  ;(message as any)._raw = rawContent
  if (rawContent) applyRawAssistantContent(message, rawContent)
  return message
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
    const token = String(data.token ?? '')
    const msg = getMsg()
    if (!msg) return

    const rawContent = (msg as any)._raw ?? ''
    ;(msg as any)._raw = rawContent + token
    const raw = (msg as any)._raw as string
    applyRawAssistantContent(msg, raw)
    scrollToBottom()
  })

  es.addEventListener('task_completed', event => {
    const data = safeJsonParse((event as MessageEvent).data)
    const msg = getMsg()
    if (msg) {
      msg.isStreaming = false
      msg.isThinking = false
      msg.status = 'DONE'
      if (!msg.content && !msg.thinkingContent) {
        const summary = String(data.summary ?? '')
        ;(msg as any)._raw = summary
        applyRawAssistantContent(msg, summary)
      }
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
      msg.isThinking = false
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
    if (msg?.isStreaming) {
      msg.isStreaming = false
      msg.isThinking = false
    }
    es.close()
    if (eventSource.value === es) eventSource.value = null
  }

  return es
}

const createPendingExchange = (text: string) => {
  messages.value.push({ id: `user-${Date.now()}`, role: 'user', content: text, thinkingContent: '' })

  const aiMsgId = `ai-${Date.now()}`
  const aiMsg = createAssistantMessage(aiMsgId, '', { isStreaming: true, isThinking: false })
  messages.value.push(aiMsg)
  scrollToBottom()
  return { aiMsgId, aiMsg }
}

const submitText = async (text: string) => {
  const { aiMsgId, aiMsg } = createPendingExchange(text)
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

const submitWithFile = async (formData: FormData, text: string, fileName: string) => {
  const { aiMsgId, aiMsg } = createPendingExchange(`${text} [附件: ${fileName}]`)
  closeSse()
  creating.value = true
  try {
    const result = (await createTaskWithFile(formData)) as unknown as CreateTaskResponse
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
    aiMsg.content = '❌ 带附件任务创建失败，请重试'
    ElMessage.error('创建带附件分析任务失败')
  } finally {
    creating.value = false
    scrollToBottom()
  }
}

const handleSend = async () => {
  const text = inputText.value.trim()
  if (!text || creating.value) return

  inputText.value = ''
  if (attachedFile.value) {
    const file = attachedFile.value
    const formData = new FormData()
    formData.append('file', file)
    formData.append('inputText', text)
    if (currentSessionId.value) formData.append('sessionId', currentSessionId.value)
    attachedFile.value = null
    await submitWithFile(formData, text, file.name)
  } else {
    await submitText(text)
  }
}

const handleFileUpload = (options: any) => {
  attachedFile.value = options.file as File
  return false
}

const showSessionMenu = (_event: MouseEvent, session: Session) => {
  sessionMenu.value = {
    visible: true,
    x: _event.clientX,
    y: _event.clientY,
    session
  }
}

const hideSessionMenu = () => {
  sessionMenu.value.visible = false
}

const startRename = (session: Session) => {
  renamingSessionId.value = session.id
  renameValue.value = session.title || ''
}

const confirmRename = async (session: Session) => {
  const title = renameValue.value.trim()
  if (!title) return
  try {
    await renameSession(session.id, title)
    session.title = title
    ElMessage.success('重命名成功')
  } catch {
    ElMessage.error('重命名失败')
  } finally {
    renamingSessionId.value = null
  }
}

const deleteSession = async (session: Session) => {
  try {
    await ElMessageBox.confirm('确定删除这个对话吗？', '删除对话', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
    await deleteSessionApi(session.id)
    historySessions.value = historySessions.value.filter(item => item.id !== session.id)
    if (currentSessionId.value === session.id) {
      closeSse()
      messages.value = []
      currentSession.value = null
      currentSessionId.value = undefined
      currentTask.value = null
    }
    ElMessage.success('已删除')
  } catch {
    // 用户取消删除或请求失败时不打断当前页面
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
        messages.value.push({ id: message.id, role: 'user', content: message.content, thinkingContent: '' })
      } else if (message.role === 'assistant') {
        const rawMessage = message as SessionMessage & { taskId?: string | null; workflowTaskId?: string | null }
        messages.value.push(createAssistantMessage(message.id, message.content, {
          taskId: rawMessage.taskId ?? rawMessage.workflowTaskId ?? undefined
        }))
      }
    }

    if (!messages.value.length && session.title) {
      messages.value.push({ id: `hist-${session.id}`, role: 'user', content: session.title, thinkingContent: '' })
    }

    const lastAiMessage = [...messages.value].reverse().find(message => message.role === 'ai')
    const taskId = lastAiMessage?.taskId || sessionTaskMap.value[session.id]
    if (taskId) {
      const detail = await loadTaskDetail(taskId)
      if (detail?.status === 'RUNNING') {
        const aiMessage = lastAiMessage ?? createAssistantMessage(`ai-${Date.now()}`, detail.resultSummary ?? '', {
          isStreaming: true,
          taskId
        })
        if (!lastAiMessage) messages.value.push(aiMessage)
        aiMessage.isStreaming = true
        connectSseToMessage(taskId, aiMessage.id)
      }
    }
  } catch {
    ElMessage.error('加载会话消息失败')
    messages.value = [{ id: `hist-${session.id}`, role: 'user', content: session.title || '', thinkingContent: '' }]
  } finally {
    scrollToBottom()
  }
}

watch(agentInfoVisible, async visible => {
  if (visible && !agentInfo.value) {
    agentInfoLoading.value = true
    try {
      agentInfo.value = (await getAgentInfo()) as unknown as AgentInfo
    } catch {
      ElMessage.error('加载 Agent 信息失败')
    } finally {
      agentInfoLoading.value = false
    }
  }
})

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
  flex: 1;
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

.session-actions {
  display: none;
  gap: 2px;
  margin-left: auto;
}

.session-item:hover .session-actions {
  display: flex;
}

.session-actions .el-button {
  padding: 2px;
  color: #a0a0b8;
}

.session-actions .el-button:hover {
  color: #ffffff;
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid #2d2d4e;
}

.agent-info-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: #a0a0b8;
  cursor: pointer;
  background: transparent;
  border: 1px solid #3d3d5e;
  border-radius: 8px;
  font-size: 13px;
  transition: all 0.2s;
}

.agent-info-btn:hover {
  color: #ffffff;
  background: #2d2d4e;
  border-color: #5b6ad0;
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

.thinking-collapse {
  margin-bottom: 12px;
  background: #f0f4ff;
  border: 1px solid #d0d8ff;
  border-radius: 8px;
}

.thinking-collapse :deep(.el-collapse-item__header) {
  padding: 8px 12px;
  background: transparent;
  border-radius: 8px;
}

.thinking-collapse :deep(.el-collapse-item__content) {
  padding: 0;
}

.thinking-title {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #5b6ad0;
  font-size: 12px;
}

.thinking-content {
  max-height: 300px;
  padding: 8px 12px;
  overflow-y: auto;
  color: #606266;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.thinking-dots {
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

.ai-content :deep(h1) {
  margin: 16px 0 8px;
  color: #1a1a2e;
  font-size: 18px;
  font-weight: 700;
}

.ai-content :deep(h2) {
  margin: 14px 0 6px;
  padding-bottom: 4px;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: 700;
  border-bottom: 1px solid #e4e7ed;
}

.ai-content :deep(h3) {
  margin: 12px 0 4px;
  color: #303133;
  font-size: 15px;
  font-weight: 600;
}

.ai-content :deep(h4) {
  margin: 10px 0 4px;
  color: #606266;
  font-size: 14px;
  font-weight: 600;
}

.ai-content :deep(p) {
  margin: 6px 0;
  line-height: 1.8;
}

.ai-content :deep(ul) {
  padding-left: 20px;
  margin: 6px 0;
}

.ai-content :deep(ol) {
  padding-left: 20px;
  margin: 6px 0;
}

.ai-content :deep(li) {
  margin: 4px 0;
  line-height: 1.7;
}

.ai-content :deep(strong) {
  color: #1a1a2e;
  font-weight: 600;
}

.ai-content :deep(code) {
  padding: 1px 5px;
  font-family: monospace;
  font-size: 12px;
  background: #f0f0f0;
  border-radius: 3px;
}

.ai-content :deep(hr) {
  margin: 12px 0;
  border: none;
  border-top: 1px solid #e4e7ed;
}

.ai-content :deep(br) {
  display: block;
  margin: 4px 0;
  content: '';
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

.attached-file-tag {
  max-width: 160px;
  flex-shrink: 0;
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

.agent-info-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.agent-section-title {
  margin-bottom: 10px;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.agent-meta {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.tool-card {
  padding: 12px;
  margin-bottom: 8px;
  background: #f8f9fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.tool-icon {
  font-size: 16px;
}

.tool-name {
  color: #1a1a2e;
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
}

.tool-desc {
  margin-bottom: 6px;
  color: #606266;
  font-size: 13px;
}

.tool-params-label {
  color: #909399;
  font-size: 12px;
}

.system-prompt-box {
  max-height: 300px;
  padding: 16px;
  overflow-y: auto;
  color: #a0f0a0;
  background: #1a1a2e;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.session-context-menu {
  position: fixed;
  z-index: 3000;
  min-width: 120px;
  padding: 6px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.session-context-menu button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  color: #303133;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  text-align: left;
}

.session-context-menu button:hover {
  background: #f5f7fa;
}

.session-context-menu button.danger {
  color: #f56c6c;
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
