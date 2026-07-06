<template>
  <div class="dashboard-view">
    <div class="dashboard-header">
      <div>
        <h1>概览大盘</h1>
        <p v-if="lastUpdated">最后更新时间：{{ lastUpdated }}</p>
      </div>
      <el-button type="primary" :loading="loading" @click="refreshDashboard">刷新</el-button>
    </div>

    <el-row :gutter="16" class="dashboard-row">
      <el-col v-for="card in metricCards" :key="card.title" :span="4">
        <el-card v-loading="loading" class="metric-card" shadow="never">
          <div class="metric-card__icon" :style="{ color: card.color, backgroundColor: card.bgColor }">
            <el-icon><component :is="card.icon" /></el-icon>
          </div>
          <div class="metric-card__content">
            <div class="metric-card__value">{{ card.value }}</div>
            <div class="metric-card__title">{{ card.title }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="dashboard-row">
      <el-col :span="12">
        <el-card v-loading="loading" class="chart-card" shadow="never">
          <template #header>流水线状态分布</template>
          <VChart v-if="hasPipelineStats" class="chart" :option="pipelinePieOption" autoresize />
          <el-empty v-else class="empty-state" description="暂无数据" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card v-loading="loading" class="chart-card" shadow="never">
          <template #header>图谱节点类型分布</template>
          <VChart v-if="hasNodeStats" class="chart" :option="nodeBarOption" autoresize />
          <el-empty v-else class="empty-state" description="暂无数据" />
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="dashboard-row">
      <el-col :span="12">
        <el-card v-loading="loading" class="table-card" shadow="never">
          <template #header>数据规模明细</template>
          <el-table :data="dataVolumeRows" border>
            <el-table-column prop="label" label="数据类型" />
            <el-table-column prop="value" label="数量" width="160" align="right" />
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card v-loading="loading" class="table-card" shadow="never">
          <template #header>图谱关系类型分布</template>
          <el-table :data="relationRows" border>
            <el-table-column prop="label" label="关系类型" />
            <el-table-column prop="value" label="数量" width="160" align="right" />
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, BarChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent, GridComponent } from 'echarts/components'

use([CanvasRenderer, PieChart, BarChart, TitleComponent, TooltipComponent, LegendComponent, GridComponent])
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'
import { Aim, DataAnalysis, Odometer, TrendCharts, Upload, User } from '@element-plus/icons-vue'
import { getOverview, getPipelineMetrics, getNeo4jStats, getDataVolume } from '@/api/metrics'
import { getPipelineStats } from '@/api/ingestion'

type NumericMap = Record<string, number>

interface OverviewMetrics {
  totalContents?: number
  totalAccounts?: number
  totalProfiles?: number
  graphNodeCount?: number
  last24hCount?: number
  t4IndexedSuccessRate?: number
}

interface PipelineStats {
  statusDistribution?: NumericMap
  totalCount?: number
  last24hCount?: number
}

interface Neo4jStats {
  nodeCount?: number
  nodesByLabel?: NumericMap
  relationCount?: number
  relationsByType?: NumericMap
}

interface DataVolume {
  rawRecords?: {
    total?: number
    byType?: NumericMap
  }
  mediaContents?: number
  socialAccounts?: number
  persons?: number
  personProfiles?: {
    generated?: number
    reviewed?: number
  }
  narratives?: number
}

interface TableRow {
  label: string
  value: number
}

const loading = ref(false)
const lastUpdated = ref('')
const overview = ref<OverviewMetrics>({})
const pipelineStats = ref<PipelineStats>({})
const neo4jStats = ref<Neo4jStats>({})
const dataVolume = ref<DataVolume>({})

const formatNumber = (value?: number) => {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return '0'
  if (Math.abs(num) > 100000000) return `${(num / 100000000).toFixed(1)}亿`
  if (Math.abs(num) > 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}

const formatPercent = (rate?: number) => `${((rate ?? 0) * 100).toFixed(1)}%`

const metricCards = computed(() => [
  {
    title: '内容总量',
    value: formatNumber(overview.value.totalContents),
    icon: Odometer,
    color: '#2563eb',
    bgColor: '#dbeafe'
  },
  {
    title: '账号总量',
    value: formatNumber(overview.value.totalAccounts),
    icon: User,
    color: '#0891b2',
    bgColor: '#cffafe'
  },
  {
    title: '已生成画像',
    value: formatNumber(overview.value.totalProfiles),
    icon: DataAnalysis,
    color: '#7c3aed',
    bgColor: '#ede9fe'
  },
  {
    title: '图谱节点数',
    value: formatNumber(overview.value.graphNodeCount),
    icon: Aim,
    color: '#16a34a',
    bgColor: '#dcfce7'
  },
  {
    title: '24h 新增内容',
    value: formatNumber(overview.value.last24hCount),
    icon: Upload,
    color: '#ea580c',
    bgColor: '#ffedd5'
  },
  {
    title: '流水线成功率',
    value: formatPercent(overview.value.t4IndexedSuccessRate),
    icon: TrendCharts,
    color: '#059669',
    bgColor: '#d1fae5'
  }
])

const hasPipelineStats = computed(() => Object.keys(pipelineStats.value.statusDistribution ?? {}).length > 0)
const hasNodeStats = computed(() => Object.keys(neo4jStats.value.nodesByLabel ?? {}).length > 0)

const pipelinePieOption = computed(() => {
  const distribution = pipelineStats.value.statusDistribution
  if (!distribution || Object.keys(distribution).length === 0) return {}

  const blueColors = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8']
  const getStatusColor = (status: string, index: number) => {
    if (status === 'T4_INDEXED') return '#16a34a'
    if (status === 'FAILED') return '#dc2626'
    return blueColors[index % blueColors.length]
  }

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      type: 'scroll',
      bottom: 0
    },
    series: [
      {
        name: '流水线状态',
        type: 'pie',
        radius: ['38%', '64%'],
        center: ['50%', '44%'],
        data: Object.entries(distribution).map(([name, value], index) => ({
          name,
          value,
          itemStyle: { color: getStatusColor(name, index) }
        }))
      }
    ]
  }
})

const nodeBarOption = computed(() => {
  const nodesByLabel = neo4jStats.value.nodesByLabel
  if (!nodesByLabel || Object.keys(nodesByLabel).length === 0) return {}

  const rows = Object.entries(nodesByLabel).sort((a, b) => a[1] - b[1])

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: 96,
      right: 24,
      top: 24,
      bottom: 24
    },
    xAxis: {
      type: 'value',
      minInterval: 1
    },
    yAxis: {
      type: 'category',
      data: rows.map(([label]) => label)
    },
    series: [
      {
        name: '节点数量',
        type: 'bar',
        data: rows.map(([, value]) => value),
        itemStyle: { color: '#2563eb' },
        barMaxWidth: 20
      }
    ]
  }
})

const dataVolumeRows = computed<TableRow[]>(() => [
  { label: '原始记录总量', value: dataVolume.value.rawRecords?.total ?? 0 },
  { label: '媒体内容', value: dataVolume.value.mediaContents ?? 0 },
  { label: '社交账号', value: dataVolume.value.socialAccounts ?? 0 },
  { label: '人物实体', value: dataVolume.value.persons ?? 0 },
  { label: '已生成画像', value: dataVolume.value.personProfiles?.generated ?? 0 },
  { label: '叙事节点', value: dataVolume.value.narratives ?? 0 }
])

const relationRows = computed<TableRow[]>(() =>
  Object.entries(neo4jStats.value.relationsByType ?? {})
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15)
)

const updateLastUpdated = () => {
  lastUpdated.value = new Date().toLocaleString('zh-CN', { hour12: false })
}

const loadOverview = async () => {
  overview.value = (await getOverview()) as unknown as OverviewMetrics
}

const loadPipelineStats = async () => {
  pipelineStats.value = (await getPipelineStats()) as unknown as PipelineStats
}

const loadNeo4jStats = async () => {
  neo4jStats.value = (await getNeo4jStats()) as unknown as Neo4jStats
}

const loadDataVolume = async () => {
  dataVolume.value = (await getDataVolume()) as unknown as DataVolume
}

const refreshDashboard = async () => {
  loading.value = true
  try {
    await Promise.all([loadOverview(), loadPipelineStats(), loadNeo4jStats(), loadDataVolume()])
    updateLastUpdated()
  } finally {
    loading.value = false
  }
}

void getPipelineMetrics

onMounted(async () => {
  await refreshDashboard()
})
</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dashboard-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.dashboard-header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.dashboard-row {
  width: 100%;
}

.metric-card {
  height: 104px;
}

.metric-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 12px;
}

.metric-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 8px;
  font-size: 22px;
}

.metric-card__content {
  min-width: 0;
}

.metric-card__value {
  font-size: 24px;
  line-height: 1.2;
  font-weight: 700;
  color: #111827;
}

.metric-card__title {
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}

.chart-card,
.table-card {
  min-height: 360px;
}

.chart-card :deep(.el-card__body) {
  height: 300px;
}

.chart {
  width: 100%;
  height: 300px;
}

.empty-state {
  height: 300px;
}

.table-card :deep(.el-card__body) {
  padding-top: 12px;
}

@media (max-width: 1200px) {
  .dashboard-row :deep(.el-col-4) {
    max-width: 33.3333%;
    flex: 0 0 33.3333%;
  }
}

@media (max-width: 900px) {
  .dashboard-row :deep(.el-col-4),
  .dashboard-row :deep(.el-col-12) {
    max-width: 100%;
    flex: 0 0 100%;
  }

  .dashboard-row {
    row-gap: 16px;
  }
}
</style>
