<template>
  <div class="ingestion-view">
    <div class="page-header">
      <div>
        <h1>数据采集</h1>
        <p>文件导入、流水线状态和采集任务监控</p>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="文件导入" name="import">
        <el-card class="upload-card" shadow="never">
          <el-upload
            drag
            :show-file-list="false"
            :http-request="handleUpload"
            accept=".json,.jsonl,.csv,.xlsx,.zip"
          >
            <div class="upload-title">拖拽文件到此处，或点击上传</div>
            <div class="upload-subtitle">支持 JSON、JSONL、CSV、Excel、ZIP 格式</div>
          </el-upload>
        </el-card>

        <el-card shadow="never">
          <template #header>
            <div class="table-header">
              <span>导入任务列表</span>
              <el-button link type="primary" :loading="importLoading" @click="loadImportTasks">刷新</el-button>
            </div>
          </template>
          <el-table v-loading="importLoading || uploadLoading" :data="pagedImportTasks" border>
            <el-table-column prop="fileName" label="文件名" min-width="220" show-overflow-tooltip />
            <el-table-column prop="fileFormat" label="格式" width="100" />
            <el-table-column label="状态" width="130">
              <template #default="{ row }: { row: BatchImportTask }">
                <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="totalRecords" label="总记录数" width="110" align="right" />
            <el-table-column prop="successRecords" label="成功数" width="100" align="right" />
            <el-table-column prop="failedRecords" label="失败数" width="100" align="right" />
            <el-table-column label="创建时间" min-width="180">
              <template #default="{ row }: { row: BatchImportTask }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <div class="pagination-bar">
            <el-pagination
              v-model:current-page="importPage"
              :page-size="importPageSize"
              :total="importTasks.length"
              layout="total, prev, pager, next"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="流水线监控" name="pipeline">
        <el-row :gutter="16" class="metric-row">
          <el-col v-for="card in pipelineCards" :key="card.label" :span="8">
            <el-card v-loading="pipelineLoading" class="metric-card" shadow="never">
              <div class="metric-value">{{ card.value }}</div>
              <div class="metric-label">{{ card.label }}</div>
            </el-card>
          </el-col>
        </el-row>
        <el-card shadow="never">
          <template #header>
            <div class="table-header">
              <span>状态分布</span>
              <el-button link type="primary" :loading="pipelineLoading" @click="loadPipelineStats">刷新</el-button>
            </div>
          </template>
          <el-table v-loading="pipelineLoading" :data="pipelineRows" border>
            <el-table-column label="状态名">
              <template #default="{ row }: { row: PipelineRow }">
                <el-tag :type="pipelineStatusTagType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="count" label="数量" width="180" align="right" />
          </el-table>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="采集任务" name="collection">
        <el-card shadow="never">
          <template #header>
            <div class="table-header">
              <div class="table-actions">
                <span>采集任务列表</span>
                <el-select v-model="platformFilter" class="platform-filter" placeholder="平台过滤" clearable>
                  <el-option v-for="platform in platformOptions" :key="platform" :label="platform" :value="platform" />
                </el-select>
              </div>
              <el-button link type="primary" :loading="collectionLoading" @click="loadCollectionTasks">刷新</el-button>
            </div>
          </template>
          <el-table v-loading="collectionLoading" :data="filteredCollectionTasks" border>
            <el-table-column prop="platform" label="平台" width="110" />
            <el-table-column prop="taskType" label="任务类型" width="140" />
            <el-table-column prop="targetIdentifier" label="目标标识" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" width="130">
              <template #default="{ row }: { row: CollectionTask }">
                <el-tag :type="statusTagType(row.status)">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="totalCollected" label="采集量" width="110" align="right" />
            <el-table-column label="最近运行" min-width="180">
              <template #default="{ row }: { row: CollectionTask }">{{ formatTime(row.lastRunAt) }}</template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="180">
              <template #default="{ row }: { row: CollectionTask }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import type { UploadRequestOptions } from 'element-plus'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { getCollectionTasks, getPipelineStats, uploadFile } from '@/api/ingestion'

interface BatchImportTask {
  id: string
  fileName: string
  fileFormat: string
  status: string
  totalRecords: number
  processedRecords: number
  successRecords: number
  failedRecords: number
  duplicateRecords: number
  createdAt: string
}

interface PipelineStats {
  statusDistribution: Record<string, number>
  totalCount: number
  last24hCount: number
}

interface PipelineRow {
  status: string
  count: number
}

interface CollectionTask {
  id: string
  platform: string
  taskType: string
  targetIdentifier: string
  status: string
  totalCollected: number
  lastRunAt: string | null
  createdAt: string
}

const activeTab = ref('import')
const uploadLoading = ref(false)
const importLoading = ref(false)
const pipelineLoading = ref(false)
const collectionLoading = ref(false)
const importPage = ref(1)
const importPageSize = ref(10)
const importTasks = ref<BatchImportTask[]>([])
const collectionTasks = ref<CollectionTask[]>([])
const platformFilter = ref('')
const platformOptions = ['x', 'telegram', 'youtube', 'news']
const pipelineStats = ref<PipelineStats>({
  statusDistribution: {},
  totalCount: 0,
  last24hCount: 0
})

const formatTime = (time?: string | null) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const statusTagType = (status: string) => {
  if (status === 'DONE' || status === 'T4_INDEXED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'PROCESSING' || status === 'RUNNING') return 'primary'
  return 'info'
}

const pipelineStatusTagType = (status: string) => {
  if (status === 'T4_INDEXED') return 'success'
  if (status === 'FAILED') return 'danger'
  return 'primary'
}

const pagedImportTasks = computed(() => {
  const start = (importPage.value - 1) * importPageSize.value
  return importTasks.value.slice(start, start + importPageSize.value)
})

const pipelineRows = computed<PipelineRow[]>(() =>
  Object.entries(pipelineStats.value.statusDistribution ?? {}).map(([status, count]) => ({ status, count }))
)

const pipelineSuccessRate = computed(() => {
  const total = pipelineStats.value.totalCount
  if (!total) return '0.0%'
  const success = pipelineStats.value.statusDistribution?.T4_INDEXED ?? 0
  return `${((success / total) * 100).toFixed(1)}%`
})

const pipelineCards = computed(() => [
  { label: '总记录数', value: pipelineStats.value.totalCount },
  { label: '24h 新增', value: pipelineStats.value.last24hCount },
  { label: '成功率', value: pipelineSuccessRate.value }
])

const filteredCollectionTasks = computed(() => {
  if (!platformFilter.value) return collectionTasks.value
  return collectionTasks.value.filter(task => task.platform === platformFilter.value)
})

const normalizeList = <T,>(result: unknown): T[] => {
  if (Array.isArray(result)) return result as T[]
  const data = result as { records?: T[]; items?: T[] }
  return data.records ?? data.items ?? []
}

const handleUpload = async (options: UploadRequestOptions) => {
  const formData = new FormData()
  formData.append('file', options.file)
  uploadLoading.value = true
  try {
    const result = await uploadFile(formData)
    ElMessage.success('文件上传成功，任务已创建')
    options.onSuccess?.(result)
    await loadImportTasks()
  } catch (error) {
    ElMessage.error('文件上传失败')
    options.onError?.(error as any)
  } finally {
    uploadLoading.value = false
  }
}

const loadImportTasks = async () => {
  importLoading.value = true
  try {
    importTasks.value = normalizeList<BatchImportTask>(await request.get('/api/ingestion/tasks'))
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
  } catch {
    ElMessage.error('加载导入任务失败')
  } finally {
    importLoading.value = false
  }
}

const loadPipelineStats = async () => {
  pipelineLoading.value = true
  try {
    pipelineStats.value = (await getPipelineStats()) as unknown as PipelineStats
  } catch {
    ElMessage.error('加载流水线状态失败')
  } finally {
    pipelineLoading.value = false
  }
}

const loadCollectionTasks = async () => {
  collectionLoading.value = true
  try {
    collectionTasks.value = normalizeList<CollectionTask>(await getCollectionTasks())
      .sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
  } catch {
    ElMessage.error('加载采集任务失败')
  } finally {
    collectionLoading.value = false
  }
}

onMounted(() => {
  void Promise.all([loadImportTasks(), loadPipelineStats(), loadCollectionTasks()])
})
</script>

<style scoped>
.ingestion-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header,
.table-header,
.table-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.upload-card {
  margin-bottom: 16px;
}

.upload-title {
  padding-top: 28px;
  font-size: 16px;
  color: #111827;
}

.upload-subtitle {
  margin-top: 8px;
  padding-bottom: 28px;
  font-size: 13px;
  color: #6b7280;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.metric-row {
  margin-bottom: 16px;
}

.metric-card {
  min-height: 104px;
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

.platform-filter {
  width: 180px;
}
</style>
