<template>
  <div class="system-page">
    <div class="page-header">
      <div>
        <h1>实体融合</h1>
        <p>查看各类型实体去重状态和融合历史记录</p>
      </div>
      <div class="header-actions">
        <span v-if="latestJobRunId" class="job-id">最新任务：{{ latestJobRunId }}</span>
        <el-button type="primary" :loading="triggering" @click="handleTriggerDedup">立即触发融合</el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col v-for="card in statCards" :key="card.key" :span="6">
        <el-card v-loading="statsLoading" class="stat-card" shadow="never">
          <div class="stat-card__title">{{ card.title }}</div>
          <div class="stat-values">
            <div>
              <strong class="pending">{{ card.pending }}</strong>
              <span>pending</span>
            </div>
            <div>
              <strong class="canonical">{{ card.canonical }}</strong>
              <span>canonical</span>
            </div>
            <div>
              <strong class="deduplicated">{{ card.deduplicated }}</strong>
              <span>deduplicated</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card shadow="never">
      <el-tabs v-model="activeTab" class="dedup-tabs">
        <el-tab-pane label="融合记录" name="records">
          <div class="table-header">
            <span>融合记录</span>
            <el-select v-model="entityTypeFilter" class="entity-filter" placeholder="实体类型" clearable>
              <el-option label="全部" value="" />
              <el-option v-for="type in entityTypes" :key="type" :label="type" :value="type" />
            </el-select>
          </div>

          <el-table v-loading="recordsLoading" :data="filteredRecords" border>
            <el-table-column label="实体类型" width="120">
              <template #default="{ row }: { row: FusionRecord }">
                <el-tag :type="entityTagType(row.entityType)">{{ row.entityType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="survivorName" label="保留实体" min-width="160" show-overflow-tooltip />
            <el-table-column prop="mergedCount" label="融合数量" width="100" align="right" />
            <el-table-column prop="contentCountBefore" label="融合前内容数" width="130" align="right" />
            <el-table-column prop="contentCountAfter" label="融合后内容数" width="130" align="right" />
            <el-table-column prop="fusionMethod" label="融合方式" min-width="150" show-overflow-tooltip />
            <el-table-column label="Neo4j" width="90" align="center">
              <template #default="{ row }: { row: FusionRecord }">
                <span :class="row.neo4jMerged ? 'ok-mark' : 'fail-mark'">{{ row.neo4jMerged ? '✓' : '✗' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="时间" min-width="180">
              <template #default="{ row }: { row: FusionRecord }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane name="review">
          <template #label>
            <span>待审核</span>
            <el-badge v-if="reviewCount > 0" :value="reviewCount" class="review-badge" />
          </template>

          <div class="table-header">
            <span>低置信融合建议</span>
            <el-select v-model="reviewEntityTypeFilter" class="entity-filter" placeholder="实体类型" clearable>
              <el-option label="全部" value="" />
              <el-option v-for="type in entityTypes" :key="type" :label="type" :value="type" />
            </el-select>
          </div>

          <el-table v-loading="reviewLoading" :data="reviewRecords" border>
            <el-table-column label="实体类型" width="120">
              <template #default="{ row }: { row: FusionRecord }">
                <el-tag :type="entityTagType(row.entityType)">{{ row.entityType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="survivorName" label="待保留实体" min-width="160" show-overflow-tooltip />
            <el-table-column label="待合并实体" min-width="220" show-overflow-tooltip>
              <template #default="{ row }: { row: FusionRecord }">{{ mergedNamesText(row) }}</template>
            </el-table-column>
            <el-table-column label="置信度" width="110" align="center">
              <template #default>
                <el-tag type="warning">T3 建议</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="建议时间" min-width="180">
              <template #default="{ row }: { row: FusionRecord }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }: { row: FusionRecord }">
                <el-button type="success" size="small" @click="handleReview(row, 'approve')">确认合并</el-button>
                <el-button type="danger" size="small" plain @click="handleReview(row, 'reject')">拒绝</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getDedupStats,
  getFusionRecords,
  getPendingReviewRecords,
  reviewFusionRecord,
  triggerDedup
} from '@/api/dedup'

interface DedupTypeStats {
  pending: number
  canonical: number
  deduplicated: number
}

interface DedupStats {
  person: DedupTypeStats
  organization: DedupTypeStats
  event: DedupTypeStats
  narrative: DedupTypeStats
  lastJobRunAt: string | null
}

interface FusionRecord {
  id: string
  entityType: string
  survivorName: string
  mergedNames?: string[]
  mergedCount: number
  contentCountBefore: number
  contentCountAfter: number
  fusionMethod: string
  neo4jMerged: boolean
  createdAt: string
}

const emptyStats: DedupTypeStats = { pending: 0, canonical: 0, deduplicated: 0 }
const statsLoading = ref(false)
const recordsLoading = ref(false)
const reviewLoading = ref(false)
const triggering = ref(false)
const latestJobRunId = ref('')
const activeTab = ref('records')
const entityTypeFilter = ref('')
const reviewEntityTypeFilter = ref('')
const reviewCount = ref(0)
const reviewLoaded = ref(false)
const records = ref<FusionRecord[]>([])
const reviewRecords = ref<FusionRecord[]>([])
const stats = ref<DedupStats>({
  person: emptyStats,
  organization: emptyStats,
  event: emptyStats,
  narrative: emptyStats,
  lastJobRunAt: null
})

const formatTime = (time: string | null) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const statCards = computed(() => [
  { key: 'person', title: '人物', ...stats.value.person },
  { key: 'organization', title: '机构', ...stats.value.organization },
  { key: 'event', title: '事件', ...stats.value.event },
  { key: 'narrative', title: '叙事', ...stats.value.narrative }
])

const baseEntityTypes = ['person', 'organization', 'event', 'narrative']

const entityTypes = computed(() => {
  const types = [...baseEntityTypes, ...records.value.map(item => item.entityType), ...reviewRecords.value.map(item => item.entityType)]
  return Array.from(new Set(types)).filter(Boolean)
})

const filteredRecords = computed(() => {
  if (!entityTypeFilter.value) return records.value
  return records.value.filter(item => item.entityType === entityTypeFilter.value)
})

const entityTagType = (type: string) => {
  if (type === 'person') return 'primary'
  if (type === 'organization') return 'success'
  if (type === 'event') return 'warning'
  if (type === 'narrative') return 'info'
  return 'primary'
}

const mergedNamesText = (record: FusionRecord) => {
  if (Array.isArray(record.mergedNames) && record.mergedNames.length > 0) {
    return record.mergedNames.join(', ')
  }
  return '-'
}

const extractJobRunId = (result: unknown) => {
  if (typeof result === 'string') return result
  if (result && typeof result === 'object' && 'jobRunId' in result) {
    return String((result as { jobRunId: string }).jobRunId)
  }
  return ''
}

const loadStats = async () => {
  statsLoading.value = true
  try {
    stats.value = (await getDedupStats()) as unknown as DedupStats
  } catch {
    ElMessage.error('加载去重统计失败')
  } finally {
    statsLoading.value = false
  }
}

const loadRecords = async () => {
  recordsLoading.value = true
  try {
    const result = await getFusionRecords() as any
    records.value = (result?.records ?? result ?? []) as FusionRecord[]
  } catch {
    ElMessage.error('加载融合记录失败')
  } finally {
    recordsLoading.value = false
  }
}

const loadReviewCount = async () => {
  try {
    const result = await getPendingReviewRecords({ size: 1 }) as any
    reviewCount.value = result?.total ?? 0
  } catch {
    // ignore
  }
}

const loadReviewRecords = async () => {
  reviewLoading.value = true
  try {
    const result = await getPendingReviewRecords({
      entityType: reviewEntityTypeFilter.value || undefined,
      size: 100
    }) as any
    reviewRecords.value = (result?.records ?? result ?? []) as FusionRecord[]
    if (!reviewEntityTypeFilter.value) {
      reviewCount.value = result?.total ?? reviewRecords.value.length
    }
    reviewLoaded.value = true
  } catch {
    ElMessage.error('加载待审核记录失败')
  } finally {
    reviewLoading.value = false
  }
}

const handleReview = async (record: FusionRecord, action: 'approve' | 'reject') => {
  const label = action === 'approve' ? '确认合并' : '拒绝'
  try {
    await ElMessageBox.confirm(
      `确定${label}将「${record.survivorName}」与 ${record.mergedCount} 条记录的融合建议？`,
      `${label}融合`,
      { type: action === 'approve' ? 'warning' : 'info' }
    )
    await reviewFusionRecord(record.id, action)
    ElMessage.success(`已${label}`)
    reviewRecords.value = reviewRecords.value.filter(item => item.id !== record.id)
    reviewCount.value = Math.max(0, reviewCount.value - 1)
  } catch {
    // 取消操作
  }
}

const handleTriggerDedup = async () => {
  triggering.value = true
  try {
    const result = await triggerDedup()
    latestJobRunId.value = extractJobRunId(result)
    ElMessage.success('实体融合任务已触发')
    await Promise.all([loadStats(), loadRecords(), loadReviewCount()])
    if (activeTab.value === 'review') {
      await loadReviewRecords()
    }
  } catch {
    ElMessage.error('触发实体融合失败')
  } finally {
    triggering.value = false
  }
}

onMounted(() => {
  void Promise.all([loadStats(), loadRecords(), loadReviewCount()])
})

watch(activeTab, tab => {
  if (tab === 'review' && !reviewLoaded.value) {
    void loadReviewRecords()
  }
})

watch(reviewEntityTypeFilter, () => {
  if (activeTab.value === 'review') {
    void loadReviewRecords()
  }
})
</script>

<style scoped>
.system-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header,
.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  align-items: center;
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

.job-id {
  font-size: 13px;
  color: #16a34a;
}

.stat-card {
  min-height: 118px;
}

.stat-card__title {
  font-weight: 600;
  color: #111827;
}

.stat-values {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 18px;
}

.stat-values div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-values strong {
  font-size: 22px;
  line-height: 1.2;
}

.stat-values span {
  font-size: 12px;
  color: #6b7280;
}

.pending {
  color: #ea580c;
}

.canonical {
  color: #16a34a;
}

.deduplicated {
  color: #6b7280;
}

.entity-filter {
  width: 180px;
}

.dedup-tabs :deep(.el-tabs__content) {
  padding-top: 4px;
}

.dedup-tabs .table-header {
  margin-bottom: 12px;
}

.review-badge {
  margin-left: 8px;
}

.ok-mark {
  color: #16a34a;
  font-weight: 700;
}

.fail-mark {
  color: #dc2626;
  font-weight: 700;
}
</style>
