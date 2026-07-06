<template>
  <div class="metrics-view">
    <div class="page-header">
      <div>
        <h1>数据指标</h1>
        <p>流水线性能、数据规模和画像状态指标</p>
      </div>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="流水线性能" name="pipeline">
        <el-card class="filter-card" shadow="never">
          <span class="filter-label">时间范围</span>
          <el-radio-group v-model="queryHours" @change="loadPipelineMetrics">
            <el-radio-button :label="1">1h</el-radio-button>
            <el-radio-button :label="6">6h</el-radio-button>
            <el-radio-button :label="24">24h</el-radio-button>
            <el-radio-button :label="72">72h</el-radio-button>
          </el-radio-group>
        </el-card>

        <el-row :gutter="16" class="metric-row">
          <el-col v-for="card in pipelineCards" :key="card.label" :span="5">
            <el-card v-loading="pipelineLoading" class="metric-card" shadow="never">
              <div class="metric-value">{{ card.value }}</div>
              <div class="metric-label">{{ card.label }}</div>
            </el-card>
          </el-col>
          <el-col :span="4">
            <el-card v-loading="pipelineLoading" class="metric-card" shadow="never">
              <div class="metric-value">{{ formatDuration(pipelineMetrics.p95DurationMs) }}</div>
              <div class="metric-label">P95 耗时</div>
            </el-card>
          </el-col>
        </el-row>

        <el-card v-loading="pipelineLoading" class="chart-card" shadow="never">
          <template #header>阶段平均耗时</template>
          <VChart class="chart" :option="durationBarOption" autoresize />
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="数据规模" name="volume">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-card v-loading="volumeLoading" shadow="never">
              <template #header>数据规模明细</template>
              <el-table :data="dataVolumeRows" border>
                <el-table-column prop="label" label="数据类型" />
                <el-table-column prop="value" label="数量" width="160" align="right" />
              </el-table>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card v-loading="volumeLoading" class="chart-card" shadow="never">
              <template #header>原始记录按类型分布</template>
              <VChart v-if="hasRawTypeData" class="chart" :option="rawTypePieOption" autoresize />
              <el-empty v-else class="empty-state" description="暂无数据" />
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16" class="second-row">
          <el-col :span="12">
            <el-card v-loading="volumeLoading" class="chart-card" shadow="never">
              <template #header>画像状态分布</template>
              <VChart v-if="hasProfileStatusData" class="chart" :option="profileStatusPieOption" autoresize />
              <el-empty v-else class="empty-state" description="暂无数据" />
            </el-card>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'

use([CanvasRenderer, BarChart, PieChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent])
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import VChart from 'vue-echarts'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { getDataVolume } from '@/api/metrics'

interface PipelineMetrics {
  queryHours: number
  totalTasks: number
  completedTasks: number
  failedTasks: number
  avgDurationMs: number
  p95DurationMs: number
  t1AvgMs: number
  t2AvgMs: number
  t4AvgMs: number
}

interface DataVolume {
  rawRecords?: {
    total?: number
    byType?: Record<string, number>
  }
  mediaContents?: number
  socialAccounts?: number
  persons?: number
  personProfiles?: Record<string, number>
  narratives?: number
}

interface TableRow {
  label: string
  value: number
}

const activeTab = ref('pipeline')
const queryHours = ref(24)
const pipelineLoading = ref(false)
const volumeLoading = ref(false)
const pipelineMetrics = ref<PipelineMetrics>({
  queryHours: 24,
  totalTasks: 0,
  completedTasks: 0,
  failedTasks: 0,
  avgDurationMs: 0,
  p95DurationMs: 0,
  t1AvgMs: 0,
  t2AvgMs: 0,
  t4AvgMs: 0
})
const dataVolume = ref<DataVolume>({})

const formatDuration = (value?: number) => {
  const ms = Number(value ?? 0)
  if (!Number.isFinite(ms) || ms <= 0) return '0ms'
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

const successRate = computed(() => {
  const total = pipelineMetrics.value.totalTasks
  if (!total) return '0.0%'
  return `${((pipelineMetrics.value.completedTasks / total) * 100).toFixed(1)}%`
})

const pipelineCards = computed(() => [
  { label: '总任务数', value: pipelineMetrics.value.totalTasks },
  { label: '完成数', value: pipelineMetrics.value.completedTasks },
  { label: '失败数', value: pipelineMetrics.value.failedTasks },
  { label: '成功率', value: successRate.value }
])

const durationBarOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 56, right: 24, top: 24, bottom: 36 },
  xAxis: { type: 'category', data: ['T1', 'T2', 'T4'] },
  yAxis: { type: 'value', name: 'ms' },
  series: [
    {
      name: '平均耗时',
      type: 'bar',
      data: [
        pipelineMetrics.value.t1AvgMs,
        pipelineMetrics.value.t2AvgMs,
        pipelineMetrics.value.t4AvgMs
      ],
      itemStyle: { color: '#2563eb' },
      barMaxWidth: 48
    }
  ]
}))

const dataVolumeRows = computed<TableRow[]>(() => [
  { label: '原始记录总量', value: dataVolume.value.rawRecords?.total ?? 0 },
  { label: '媒体内容', value: dataVolume.value.mediaContents ?? 0 },
  { label: '社交账号', value: dataVolume.value.socialAccounts ?? 0 },
  { label: '人物实体', value: dataVolume.value.persons ?? 0 },
  { label: '已生成画像', value: dataVolume.value.personProfiles?.generated ?? 0 },
  { label: '叙事节点', value: dataVolume.value.narratives ?? 0 }
])

const hasRawTypeData = computed(() => Object.keys(dataVolume.value.rawRecords?.byType ?? {}).length > 0)
const hasProfileStatusData = computed(() => Object.keys(dataVolume.value.personProfiles ?? {}).length > 0)

const rawTypePieOption = computed(() => {
  const data = dataVolume.value.rawRecords?.byType ?? {}
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        name: '原始记录类型',
        type: 'pie',
        radius: ['38%', '64%'],
        center: ['50%', '44%'],
        data: Object.entries(data).map(([name, value]) => ({ name, value }))
      }
    ]
  }
})

const profileStatusPieOption = computed(() => {
  const data = dataVolume.value.personProfiles ?? {}
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        name: '画像状态',
        type: 'pie',
        radius: ['38%', '64%'],
        center: ['50%', '44%'],
        data: Object.entries(data).map(([name, value]) => ({ name, value }))
      }
    ]
  }
})

const loadPipelineMetrics = async () => {
  pipelineLoading.value = true
  try {
    pipelineMetrics.value = (await request.get('/api/metrics/pipeline', {
      params: { hours: queryHours.value }
    })) as unknown as PipelineMetrics
  } catch {
    ElMessage.error('加载流水线性能失败')
  } finally {
    pipelineLoading.value = false
  }
}

const loadDataVolume = async () => {
  volumeLoading.value = true
  try {
    dataVolume.value = (await getDataVolume()) as unknown as DataVolume
  } catch {
    ElMessage.error('加载数据规模失败')
  } finally {
    volumeLoading.value = false
  }
}

onMounted(() => {
  void Promise.all([loadPipelineMetrics(), loadDataVolume()])
})
</script>

<style scoped>
.metrics-view {
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

.filter-card {
  margin-bottom: 16px;
}

.filter-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-weight: 600;
  color: #111827;
}

.metric-row,
.second-row {
  margin-top: 16px;
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

.chart-card {
  min-height: 360px;
}

.chart {
  width: 100%;
  height: 300px;
}

.empty-state {
  height: 300px;
}
</style>
