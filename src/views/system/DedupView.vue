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
      <template #header>
        <div class="table-header">
          <span>融合记录</span>
          <el-select v-model="entityTypeFilter" class="entity-filter" placeholder="实体类型" clearable>
            <el-option label="全部" value="" />
            <el-option v-for="type in entityTypes" :key="type" :label="type" :value="type" />
          </el-select>
        </div>
      </template>
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
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { getDedupStats, getFusionRecords, triggerDedup } from '@/api/dedup'

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
  id?: string
  entityType: string
  survivorName: string
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
const triggering = ref(false)
const latestJobRunId = ref('')
const entityTypeFilter = ref('')
const records = ref<FusionRecord[]>([])
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

const entityTypes = computed(() => Array.from(new Set(records.value.map(item => item.entityType))).filter(Boolean))

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
    records.value = (await getFusionRecords()) as unknown as FusionRecord[]
  } catch {
    ElMessage.error('加载融合记录失败')
  } finally {
    recordsLoading.value = false
  }
}

const handleTriggerDedup = async () => {
  triggering.value = true
  try {
    const result = await triggerDedup()
    latestJobRunId.value = extractJobRunId(result)
    ElMessage.success('实体融合任务已触发')
    await Promise.all([loadStats(), loadRecords()])
  } catch {
    ElMessage.error('触发实体融合失败')
  } finally {
    triggering.value = false
  }
}

onMounted(() => {
  void Promise.all([loadStats(), loadRecords()])
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

.ok-mark {
  color: #16a34a;
  font-weight: 700;
}

.fail-mark {
  color: #dc2626;
  font-weight: 700;
}
</style>
