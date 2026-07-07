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

      <el-tab-pane label="原始记录" name="raw">
        <el-card shadow="never">
          <template #header>
            <div class="table-header">
              <span>原始记录列表</span>
              <el-button link type="primary" :loading="rawLoading" @click="loadRawRecords">刷新</el-button>
            </div>
          </template>

          <el-form :model="rawFilters" inline class="filter-form">
            <el-form-item label="记录类型">
              <el-select v-model="rawFilters.recordType" class="filter-select" clearable placeholder="全部">
                <el-option label="全部" value="" />
                <el-option v-for="item in recordTypeOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="流水线状态">
              <el-select v-model="rawFilters.pipelineStatus" class="filter-select" clearable placeholder="全部">
                <el-option label="全部" value="" />
                <el-option v-for="item in rawPipelineStatusOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item label="平台">
              <el-select v-model="rawFilters.platform" class="filter-select" clearable placeholder="全部">
                <el-option label="全部" value="" />
                <el-option v-for="item in platformOptions" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleRawSearch">查询</el-button>
              <el-button @click="resetRawFilters">重置</el-button>
            </el-form-item>
          </el-form>

          <el-table v-loading="rawLoading" :data="rawRecords" border>
            <el-table-column label="记录类型" width="150">
              <template #default="{ row }: { row: RawRecord }">
                <el-tag :type="recordTypeTagType(row.recordType)">{{ row.recordType || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="平台" width="120">
              <template #default="{ row }: { row: RawRecord }">
                <el-tag type="info">{{ row.platform || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="语言" width="90">
              <template #default="{ row }: { row: RawRecord }">
                <span class="muted-text">{{ row.language || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="流水线状态" width="150">
              <template #default="{ row }: { row: RawRecord }">
                <el-tag :type="pipelineStatusTagType(row.pipelineStatus)">{{ row.pipelineStatus || '-' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="错误信息" min-width="180" show-overflow-tooltip>
              <template #default="{ row }: { row: RawRecord }">
                <span v-if="row.errorMessage" class="error-text">{{ row.errorMessage }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="重试次数" width="100" align="right">
              <template #default="{ row }: { row: RawRecord }">
                <span :class="{ 'retry-count': Number(row.retryCount ?? 0) > 0 }">{{ row.retryCount ?? 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="采集时间" min-width="180">
              <template #default="{ row }: { row: RawRecord }">{{ formatTime(row.collectedAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }: { row: RawRecord }">
                <el-button link type="primary" @click="openRawDetail(row.id)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-bar">
            <el-pagination
              v-model:current-page="rawPage"
              :page-size="rawPageSize"
              :total="rawTotal"
              layout="total, prev, pager, next"
              @current-change="loadRawRecords"
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

    <el-dialog v-model="rawDetailVisible" title="原始记录详情" width="800px">
      <div v-loading="rawDetailLoading">
        <template v-if="rawDetail">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="记录ID">{{ rawDetail.id }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ rawDetail.recordType || '-' }}</el-descriptions-item>
            <el-descriptions-item label="平台">{{ rawDetail.platform || '-' }}</el-descriptions-item>
            <el-descriptions-item label="语言">{{ rawDetail.language || '-' }}</el-descriptions-item>
            <el-descriptions-item label="流水线状态">{{ rawDetail.pipelineStatus || '-' }}</el-descriptions-item>
            <el-descriptions-item label="采集时间">{{ formatTime(rawDetail.collectedAt) }}</el-descriptions-item>
            <el-descriptions-item label="来源URL" :span="2">
              <el-text truncated class="source-url">{{ rawDetail.sourceUrl || '-' }}</el-text>
            </el-descriptions-item>
          </el-descriptions>

          <el-tabs v-model="rawDetailTab" class="detail-tabs">
            <el-tab-pane label="T1 标注结果" name="t1">
              <template v-if="rawDetail.t1Output">
                <el-descriptions :column="2" border size="small" class="summary-descriptions">
                  <el-descriptions-item label="主题">
                    {{ t1Parsed.annotations?.topics?.join(', ') || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="情感">
                    {{ t1Parsed.annotations?.sentiment?.label || '-' }}
                    ({{ t1Parsed.annotations?.sentiment?.score ?? '-' }})
                  </el-descriptions-item>
                  <el-descriptions-item label="AIGC 嫌疑">
                    {{ t1Parsed.annotations?.aigcSuspicion || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="需人工审核">
                    {{ t1Parsed.qualityControl?.needHumanReview ? '是' : '否' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="摘要" :span="2">
                    {{ t1Parsed.annotations?.summary || '-' }}
                  </el-descriptions-item>
                </el-descriptions>

                <div v-if="t1Parsed.annotations?.entitiesHint?.length">
                  <div class="detail-section-title">实体提示</div>
                  <el-table :data="t1Parsed.annotations.entitiesHint" border size="small">
                    <el-table-column prop="text" label="文本" min-width="120" show-overflow-tooltip />
                    <el-table-column prop="typeHint" label="类型" width="120" />
                    <el-table-column prop="stance" label="立场" width="100" />
                  </el-table>
                </div>

                <el-collapse class="json-collapse">
                  <el-collapse-item title="查看完整 JSON" name="t1-json">
                    <pre class="json-block">{{ formatJsonString(rawDetail.t1Output) }}</pre>
                  </el-collapse-item>
                </el-collapse>
              </template>
              <el-empty v-else description="暂无 T1 标注结果" />
            </el-tab-pane>

            <el-tab-pane label="T2 抽取结果" name="t2">
              <template v-if="rawDetail.t2Output">
                <template v-if="!t2Parsed.parseFailed">
                  <h3 class="detail-section-title">实体列表</h3>
                  <el-table :data="t2Parsed.entities" border size="small">
                    <el-table-column prop="type" label="type" width="140" />
                    <el-table-column prop="canonicalName" label="canonicalName" min-width="180" show-overflow-tooltip />
                    <el-table-column prop="importanceScore" label="importanceScore" width="150" align="right" />
                  </el-table>

                  <h3 class="detail-section-title">关系列表</h3>
                  <el-table :data="t2Parsed.relations" border size="small">
                    <el-table-column prop="sourceName" label="sourceName" min-width="150" show-overflow-tooltip />
                    <el-table-column prop="relationType" label="relationType" min-width="150" show-overflow-tooltip />
                    <el-table-column prop="targetName" label="targetName" min-width="150" show-overflow-tooltip />
                    <el-table-column prop="confidence" label="confidence" width="120" align="right" />
                  </el-table>

                  <template v-if="t2Parsed.events?.length">
                    <div class="detail-section-title">事件列表</div>
                    <el-table :data="t2Parsed.events" border size="small">
                      <el-table-column prop="eventType" label="eventType" width="120" />
                      <el-table-column prop="canonicalName" label="canonicalName" min-width="180" show-overflow-tooltip />
                      <el-table-column prop="confidence" label="confidence" width="120" align="right" />
                    </el-table>
                  </template>

                  <el-collapse class="json-collapse">
                    <el-collapse-item title="查看完整 JSON" name="t2-json">
                      <pre class="json-block">{{ formatJsonString(rawDetail.t2Output) }}</pre>
                    </el-collapse-item>
                  </el-collapse>
                </template>
                <pre v-else class="json-block">{{ t2Parsed.raw }}</pre>
              </template>
              <el-empty v-else description="暂无 T2 抽取结果" />
            </el-tab-pane>

            <el-tab-pane label="T3 融合结果" name="t3">
              <template v-if="rawDetail.t3Output">
                <el-collapse>
                  <el-collapse-item title="查看完整 JSON" name="t3-json">
                    <pre class="json-block">{{ formatJsonString(rawDetail.t3Output) }}</pre>
                  </el-collapse-item>
                </el-collapse>
              </template>
              <el-empty v-else description="暂无 T3 融合结果（T3 已移至后台定时任务处理）" />
            </el-tab-pane>

            <el-tab-pane label="T4 索引结果" name="t4">
              <template v-if="rawDetail.t4Output">
                <el-descriptions :column="2" border size="small" class="summary-descriptions">
                  <el-descriptions-item label="向量化状态">
                    {{ t4Parsed.embeddingStatus || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="向量维度">
                    {{ t4Parsed.embeddingDim || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="模型版本">
                    {{ t4Parsed.modelVersion || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="耗时(ms)">
                    {{ t4Parsed.durationMs || '-' }}
                  </el-descriptions-item>
                </el-descriptions>
                <el-collapse>
                  <el-collapse-item title="查看完整 JSON" name="t4-json">
                    <pre class="json-block">{{ formatJsonString(rawDetail.t4Output) }}</pre>
                  </el-collapse-item>
                </el-collapse>
              </template>
              <el-empty v-else description="暂无 T4 索引结果" />
            </el-tab-pane>
            <el-tab-pane v-if="rawDetail.pipelineStatus === 'FAILED'" label="错误信息" name="error">
              <div class="detail-error">{{ rawDetail.errorMessage || '-' }}</div>
            </el-tab-pane>

            <el-tab-pane label="原始数据" name="raw">
              <el-input
                :model-value="formatJsonString(rawDetail.rawPayload)"
                type="textarea"
                readonly
                :rows="10"
              />
            </el-tab-pane>
          </el-tabs>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import type { UploadRequestOptions } from 'element-plus'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { getCollectionTasks, getPipelineStats, getRawRecord, listRawRecords, uploadFile } from '@/api/ingestion'

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

interface RawRecord {
  id: string
  schemaVersion?: string
  recordType?: string
  sourceRecordId?: string
  crawlTaskId?: string
  collectedAt?: string | null
  sourceUrl?: string | null
  payloadHash?: string
  sourceType?: string
  sourceTopic?: string
  platform?: string
  language?: string
  contentType?: string
  rawPayload?: string | null
  rawPublishedAt?: string | null
  normalizedAt?: string | null
  pipelineStatus?: string
  pipelineTaskId?: string
  errorMessage?: string | null
  retryCount?: number | null
  t1Output?: string | null
  t2Output?: string | null
  t3Output?: string | null
  t4Output?: string | null
  batchImportId?: string
  createdAt?: string
  updatedAt?: string
}

interface PageResult<T> {
  records?: T[]
  total?: number
  current?: number
  size?: number
}

const activeTab = ref('import')
const uploadLoading = ref(false)
const importLoading = ref(false)
const rawLoading = ref(false)
const rawDetailLoading = ref(false)
const pipelineLoading = ref(false)
const collectionLoading = ref(false)
const importPage = ref(1)
const importPageSize = ref(10)
const rawPage = ref(1)
const rawPageSize = ref(20)
const rawTotal = ref(0)
const importTasks = ref<BatchImportTask[]>([])
const rawRecords = ref<RawRecord[]>([])
const rawDetail = ref<RawRecord | null>(null)
const rawDetailVisible = ref(false)
const rawDetailTab = ref('t1')
const collectionTasks = ref<CollectionTask[]>([])
const platformFilter = ref('')
const platformOptions = ['x', 'telegram', 'youtube', 'news']
const recordTypeOptions = [
  'social_content',
  'news_article',
  'social_account',
  'account_relation',
  'media_asset',
  'collection_task'
]
const rawPipelineStatusOptions = ['RECEIVED', 'NORMALIZED', 'T1_DONE', 'T2_DONE', 'T4_INDEXED', 'FAILED']
const rawFilters = reactive({
  recordType: '',
  pipelineStatus: '',
  platform: ''
})
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

const pipelineStatusTagType = (status?: string) => {
  if (status === 'T4_INDEXED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'T1_DONE' || status === 'T2_DONE') return 'primary'
  return 'info'
}

const recordTypeTagType = (recordType?: string) => {
  if (recordType === 'social_content') return 'primary'
  if (recordType === 'news_article') return 'success'
  if (recordType === 'media_asset') return 'warning'
  return 'info'
}

const parseJsonValue = (value?: string | null) => {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const formatJsonString = (value?: string | null) => {
  if (!value) return ''
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

const t1Parsed = computed<Record<string, any>>(() => {
  const raw = rawDetail.value?.t1Output ?? ''
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
})

const t2Parsed = computed(() => {
  const raw = rawDetail.value?.t2Output ?? ''
  const parsed = parseJsonValue(raw)
  if (!parsed || typeof parsed !== 'object') {
    return { parseFailed: Boolean(raw), raw, entities: [], relations: [], events: [] }
  }
  const data = parsed as { entities?: unknown[]; relationships?: unknown[]; relations?: unknown[]; events?: unknown[] }
  return {
    parseFailed: false,
    raw,
    entities: (data.entities ?? []) as Record<string, unknown>[],
    relations: (data.relationships ?? data.relations ?? []) as Record<string, unknown>[],
    events: (data.events ?? []) as Record<string, unknown>[]
  }
})

const t4Parsed = computed<Record<string, any>>(() => {
  const raw = rawDetail.value?.t4Output ?? ''
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
})

const rawQueryParams = () => ({
  recordType: rawFilters.recordType || undefined,
  pipelineStatus: rawFilters.pipelineStatus || undefined,
  platform: rawFilters.platform || undefined,
  page: rawPage.value - 1,
  size: rawPageSize.value
})

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

const loadRawRecords = async () => {
  rawLoading.value = true
  try {
    const result = (await listRawRecords(rawQueryParams())) as unknown as PageResult<RawRecord>
    rawRecords.value = result.records ?? []
    rawTotal.value = Number(result.total ?? rawRecords.value.length)
  } catch {
    ElMessage.error('加载原始记录失败')
  } finally {
    rawLoading.value = false
  }
}

const handleRawSearch = async () => {
  rawPage.value = 1
  await loadRawRecords()
}

const resetRawFilters = async () => {
  rawFilters.recordType = ''
  rawFilters.pipelineStatus = ''
  rawFilters.platform = ''
  rawPage.value = 1
  await loadRawRecords()
}

const openRawDetail = async (id: string) => {
  rawDetailVisible.value = true
  rawDetailLoading.value = true
  rawDetail.value = null
  rawDetailTab.value = 't1'
  try {
    rawDetail.value = (await getRawRecord(id)) as unknown as RawRecord
  } catch {
    ElMessage.error('加载原始记录详情失败')
  } finally {
    rawDetailLoading.value = false
  }
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
  void Promise.all([loadImportTasks(), loadRawRecords(), loadPipelineStats(), loadCollectionTasks()])
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

.filter-form {
  margin-bottom: 12px;
}

.filter-select {
  width: 180px;
}

.muted-text {
  color: #6b7280;
  font-size: 12px;
}

.error-text,
.detail-error {
  color: #dc2626;
}

.retry-count {
  color: #d97706;
  font-weight: 700;
}

.source-url {
  max-width: 640px;
}

.detail-tabs {
  margin-top: 16px;
}

.summary-descriptions {
  margin-bottom: 12px;
}

.json-collapse {
  margin-top: 12px;
}

.detail-section-title {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.json-block {
  max-height: 360px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  border-radius: 6px;
  background: #0f172a;
  color: #e5e7eb;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
