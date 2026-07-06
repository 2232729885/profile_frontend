<template>
  <div class="system-page">
    <div class="page-header">
      <div>
        <h1>Agent 管理</h1>
        <p>T1-T6 Agent URL 模式、真实地址和健康状态管理</p>
      </div>
      <el-button type="primary" :loading="checkingAll" @click="checkAllAgents">全部健康检查</el-button>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="agents" border>
        <el-table-column label="Agent" min-width="180">
          <template #default="{ row }: { row: SubAgentRegistry }">
            <div class="agent-name">{{ row.agentCode }} · {{ row.agentName }}</div>
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="220">
          <template #default="{ row }: { row: SubAgentRegistry }">
            <span class="muted-text">{{ row.description || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="当前模式" width="110">
          <template #default="{ row }: { row: SubAgentRegistry }">
            <el-tag :type="row.activeUrlType === 'real' ? 'success' : 'primary'">
              {{ row.activeUrlType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="Mock 地址" min-width="220" show-overflow-tooltip>
          <template #default="{ row }: { row: SubAgentRegistry }">
            <span class="muted-text">{{ row.mockUrl }}</span>
          </template>
        </el-table-column>
        <el-table-column label="真实地址" min-width="220" show-overflow-tooltip>
          <template #default="{ row }: { row: SubAgentRegistry }">
            <el-button v-if="row.baseUrl" link type="primary" @click="openBaseUrlDialog(row)">
              {{ row.baseUrl }}
            </el-button>
            <el-button v-else link type="danger" @click="openBaseUrlDialog(row)">未配置</el-button>
          </template>
        </el-table-column>
        <el-table-column label="健康状态" width="190">
          <template #default="{ row }: { row: SubAgentRegistry }">
            <div class="health-cell">
              <el-tag :type="healthTagType(row.healthStatus)">{{ row.healthStatus }}</el-tag>
              <span class="muted-text">{{ formatTime(row.lastHealthCheck) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }: { row: SubAgentRegistry }">
            <el-button size="small" @click="openUrlTypeDialog(row)">切换模式</el-button>
            <el-button size="small" @click="openBaseUrlDialog(row)">配置地址</el-button>
            <el-button size="small" type="primary" :loading="checkingCode === row.agentCode" @click="checkAgent(row)">
              健康检查
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="urlTypeDialogVisible" title="切换 URL 模式" width="420px">
      <el-radio-group v-model="urlTypeForm.activeUrlType">
        <el-radio label="mock">mock</el-radio>
        <el-tooltip :disabled="Boolean(currentAgent?.baseUrl)" content="请先配置真实地址" placement="top">
          <el-radio label="real" :disabled="!currentAgent?.baseUrl">real</el-radio>
        </el-tooltip>
      </el-radio-group>
      <template #footer>
        <el-button @click="urlTypeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="urlTypeSubmitting" @click="submitUrlType">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="baseUrlDialogVisible" title="配置真实地址" width="520px">
      <el-form label-position="top">
        <el-form-item label="真实地址">
          <el-input v-model="baseUrlForm.baseUrl" placeholder="例如：http://localhost:9001" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="baseUrlDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="baseUrlSubmitting" @click="submitBaseUrl">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { getAgents, healthCheck, updateAgentBaseUrl, updateAgentUrlType } from '@/api/system'

interface SubAgentRegistry {
  id: string
  agentCode: string
  agentName: string
  description: string
  baseUrl: string | null
  mockUrl: string
  activeUrlType: 'mock' | 'real'
  timeoutSeconds: number
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown'
  lastHealthCheck: string | null
  isActive: boolean
}

const loading = ref(false)
const checkingAll = ref(false)
const checkingCode = ref('')
const agents = ref<SubAgentRegistry[]>([])
const currentAgent = ref<SubAgentRegistry | null>(null)

const urlTypeDialogVisible = ref(false)
const urlTypeSubmitting = ref(false)
const urlTypeForm = reactive<{ activeUrlType: 'mock' | 'real' }>({ activeUrlType: 'mock' })

const baseUrlDialogVisible = ref(false)
const baseUrlSubmitting = ref(false)
const baseUrlForm = reactive({ baseUrl: '' })

const formatTime = (time: string | null) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '未检查')

const healthTagType = (status: SubAgentRegistry['healthStatus']) => {
  if (status === 'healthy') return 'success'
  if (status === 'down') return 'danger'
  if (status === 'degraded') return 'warning'
  return 'info'
}

const loadAgents = async () => {
  loading.value = true
  try {
    agents.value = (await getAgents()) as unknown as SubAgentRegistry[]
  } catch {
    ElMessage.error('加载 Agent 列表失败')
  } finally {
    loading.value = false
  }
}

const openUrlTypeDialog = (agent: SubAgentRegistry) => {
  currentAgent.value = agent
  urlTypeForm.activeUrlType = agent.activeUrlType
  urlTypeDialogVisible.value = true
}

const submitUrlType = async () => {
  if (!currentAgent.value) return
  if (urlTypeForm.activeUrlType === 'real' && !currentAgent.value.baseUrl) {
    ElMessage.warning('请先配置真实地址')
    return
  }
  urlTypeSubmitting.value = true
  try {
    await updateAgentUrlType(currentAgent.value.agentCode, urlTypeForm.activeUrlType)
    ElMessage.success('URL 模式已更新')
    urlTypeDialogVisible.value = false
    await loadAgents()
  } catch {
    ElMessage.error('更新 URL 模式失败')
  } finally {
    urlTypeSubmitting.value = false
  }
}

const openBaseUrlDialog = (agent: SubAgentRegistry) => {
  currentAgent.value = agent
  baseUrlForm.baseUrl = agent.baseUrl ?? ''
  baseUrlDialogVisible.value = true
}

const submitBaseUrl = async () => {
  if (!currentAgent.value) return
  baseUrlSubmitting.value = true
  try {
    await updateAgentBaseUrl(currentAgent.value.agentCode, baseUrlForm.baseUrl.trim())
    ElMessage.success('真实地址已更新')
    baseUrlDialogVisible.value = false
    await loadAgents()
  } catch {
    ElMessage.error('更新真实地址失败')
  } finally {
    baseUrlSubmitting.value = false
  }
}

const checkAgent = async (agent: SubAgentRegistry) => {
  checkingCode.value = agent.agentCode
  try {
    const result = (await healthCheck(agent.agentCode)) as unknown as Partial<SubAgentRegistry>
    const status = result.healthStatus ?? agent.healthStatus
    if (status === 'healthy') {
      ElMessage.success(`${agent.agentCode} 健康检查通过`)
    } else {
      ElMessage.error(`${agent.agentCode} 健康检查失败`)
    }
    await loadAgents()
  } catch {
    ElMessage.error(`${agent.agentCode} 健康检查失败`)
  } finally {
    checkingCode.value = ''
  }
}

const checkAllAgents = async () => {
  checkingAll.value = true
  try {
    for (const agent of agents.value) {
      await checkAgent(agent)
    }
  } finally {
    checkingAll.value = false
  }
}

onMounted(() => {
  void loadAgents()
})
</script>

<style scoped>
.system-page {
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

.page-header p,
.muted-text {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.agent-name {
  font-weight: 600;
  color: #111827;
}

.health-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
</style>
