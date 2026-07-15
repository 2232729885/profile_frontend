<template>
  <div class="profile-detail-view">
    <div class="page-header">
      <div>
        <h1>{{ profile?.canonicalName || personId }}</h1>
        <p>人物画像详情与 2 跳知识图谱</p>
      </div>
      <el-button v-if="profile?.status === 'generated'" type="success" :loading="reviewSubmitting" @click="handleReview">
        审核通过
      </el-button>
    </div>

    <el-card v-loading="loading" shadow="never">
      <el-descriptions :column="4" border>
        <el-descriptions-item label="人物 ID">{{ profile?.personId || personId }}</el-descriptions-item>
        <el-descriptions-item label="目标类型">
          <el-tag :type="targetTypeTagType(profile?.targetType)">{{ profile?.targetType || '-' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操控风险">
          <el-tag :type="riskTagType(profile?.manipulationRisk)" :class="{ 'risk-medium': profile?.manipulationRisk === 'medium' }">
            {{ profile?.manipulationRisk || '-' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="操控评分">{{ profile?.manipulationScore ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="画像版本">v{{ profile?.portraitVersion ?? 0 }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="profile?.status === 'reviewed' ? 'success' : 'primary'">{{ profile?.status || '-' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="生成时间">{{ formatTime(profile?.generatedAt) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card v-loading="loading" shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="政治与情感" name="politics">
          <el-row :gutter="16">
            <el-col :span="12">
              <section class="panel">
                <h2>政治倾向</h2>
                <p>{{ profile?.politicalOrientation || '-' }}</p>
                <el-progress :percentage="politicalPercentage" :color="politicalColor" :stroke-width="12" />
                <div class="scale-labels">
                  <span>反西方</span>
                  <span>中性</span>
                  <span>亲西方</span>
                </div>
              </section>
            </el-col>
            <el-col :span="12">
              <section class="panel">
                <h2>情感特征</h2>
                <VChart v-if="hasEmotionProfile" class="chart" :option="emotionRadarOption" autoresize />
                <el-empty v-else class="empty-state" description="暂无数据" />
              </section>
            </el-col>
          </el-row>
          <section class="panel">
            <h2>立场分布</h2>
            <el-table :data="stanceRows" border>
              <el-table-column prop="issue" label="议题" min-width="180" />
              <el-table-column prop="stance" label="立场" min-width="160" />
              <el-table-column label="置信度" width="180">
                <template #default="{ row }: { row: StanceRow }">
                  <el-progress :percentage="normalizePercent(row.confidence)" :stroke-width="10" />
                </template>
              </el-table-column>
            </el-table>
          </section>
        </el-tab-pane>

        <el-tab-pane label="行为模式" name="behavior">
          <el-row :gutter="16">
            <el-col :span="12">
              <section class="panel">
                <h2>BEND 手法分布</h2>
                <VChart v-if="hasBendProfile" class="chart" :option="bendPieOption" autoresize />
                <el-empty v-else class="empty-state" description="暂无数据" />
              </section>
            </el-col>
            <el-col :span="12">
              <section class="panel">
                <h2>活跃时间</h2>
                <VChart v-if="hasActiveTimePattern" class="chart" :option="activeTimeOption" autoresize />
                <el-empty v-else class="empty-state" description="暂无数据" />
              </section>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col v-for="item in behaviorCards" :key="item.label" :span="4">
              <el-card class="metric-card" shadow="never">
                <div class="metric-value">{{ item.value }}</div>
                <div class="metric-label">{{ item.label }}</div>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="影响力网络" name="network">
          <el-row :gutter="16">
            <el-col :span="8">
              <section class="panel">
                <h2>影响力评分</h2>
                <el-progress :percentage="normalizePercent(profile?.influenceScore)" :color="scoreColor(profile?.influenceScore)" />
              </section>
            </el-col>
            <el-col :span="8">
              <section class="panel">
                <h2>触达评分</h2>
                <el-progress :percentage="normalizePercent(profile?.reachScore)" :color="scoreColor(profile?.reachScore)" />
              </section>
            </el-col>
            <el-col :span="8">
              <section class="panel">
                <h2>病毒传播</h2>
                <el-progress :percentage="normalizePercent(profile?.viralityScore)" :color="scoreColor(profile?.viralityScore)" />
              </section>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <section class="panel">
                <h2>协同网络</h2>
                <el-table :data="coordinationRows" border>
                  <el-table-column prop="name" label="对象" min-width="160" />
                  <el-table-column prop="type" label="类型" width="120" />
                  <el-table-column prop="score" label="评分" width="120" align="right" />
                </el-table>
              </section>
            </el-col>
            <el-col :span="12">
              <section class="panel">
                <h2>叙事偏好</h2>
                <el-table :data="narrativeRows" border>
                  <el-table-column prop="narrative" label="叙事" min-width="180" />
                  <el-table-column prop="weight" label="权重" width="120" align="right" />
                  <el-table-column prop="confidence" label="置信度" width="120" align="right" />
                </el-table>
              </section>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="知识图谱" name="graph">
          <section class="panel graph-panel">
            <VChart v-if="hasGraphData" class="graph-chart" :option="graphOption" autoresize />
            <el-empty v-else class="empty-state graph-empty" description="暂无图谱数据" />
          </section>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, GraphChart, PieChart, RadarChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'

use([CanvasRenderer, BarChart, GraphChart, PieChart, RadarChart, GridComponent, LegendComponent, TitleComponent, TooltipComponent])
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import dayjs from 'dayjs'
import VChart from 'vue-echarts'
import { ElMessage } from 'element-plus'
import request from '@/api/request'
import { getPersonGraph, getPersonProfile } from '@/api/profiles'
import { useAuthStore } from '@/stores/auth'

type JsonValue = Record<string, unknown> | Array<unknown>

interface PersonProfile {
  id?: string
  profileId?: string
  personId: string
  canonicalName?: string
  targetType?: string
  manipulationRisk?: 'critical' | 'high' | 'medium' | 'low' | string
  manipulationScore?: number
  portraitVersion?: number
  status?: 'generated' | 'reviewed' | string
  generatedAt?: string
  politicalOrientation?: string
  politicalScore?: number
  emotionProfile?: string
  stanceProfile?: string
  bendProfile?: string
  activeTimePattern?: string
  postingFrequency?: string | number
  originalRatio?: string | number
  mbtiType?: string
  decisionStyle?: string
  languageStyle?: string
  interestDomains?: string[] | string
  influenceScore?: number
  reachScore?: number
  viralityScore?: number
  coordinationNetwork?: string
  preferredNarratives?: string
}

interface GraphNode {
  id: string
  label: string
  properties: Record<string, unknown>
}

interface GraphRelation {
  fromId: string
  toId: string
  type: string
}

interface GraphData {
  nodes: GraphNode[]
  relations: GraphRelation[]
}

interface StanceRow {
  issue: string
  stance: string
  confidence: number
}

interface CoordinationRow {
  name: string
  type: string
  score: number | string
}

interface NarrativeRow {
  narrative: string
  weight: number | string
  confidence: number | string
}

const route = useRoute()
const authStore = useAuthStore()
const personId = String(route.params.personId || '')
const loading = ref(false)
const reviewSubmitting = ref(false)
const activeTab = ref('politics')
const profile = ref<PersonProfile | null>(null)
const graphData = ref<GraphData>({ nodes: [], relations: [] })

const formatTime = (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const safeParse = <T extends JsonValue>(value?: string, fallback: T = {} as T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const normalizePercent = (value?: number | string) => {
  const num = Number(value ?? 0)
  if (!Number.isFinite(num)) return 0
  return Math.min(100, Math.max(0, Math.round(num)))
}

const scoreColor = (score?: number) => {
  const value = normalizePercent(score)
  if (value >= 80) return '#dc2626'
  if (value >= 60) return '#ea580c'
  return '#2563eb'
}

const targetTypeTagType = (type?: string) => {
  if (!type || type === 'T00') return 'info'
  if (['T01', 'T02', 'T03', 'T04'].includes(type)) return 'primary'
  if (['T05', 'T06', 'T07'].includes(type)) return 'warning'
  if (['T08', 'T09', 'T10'].includes(type)) return 'danger'
  return 'info'
}

const riskTagType = (risk?: string) => {
  if (risk === 'critical') return 'danger'
  if (risk === 'high') return 'warning'
  if (risk === 'low') return 'success'
  return 'warning'
}

const politicalPercentage = computed(() => normalizePercent(((Number(profile.value?.politicalScore ?? 0) + 100) / 200) * 100))
const politicalColor = computed(() => (Number(profile.value?.politicalScore ?? 0) >= 0 ? '#2563eb' : '#dc2626'))

const emotionProfile = computed<Record<string, number>>(() => safeParse<Record<string, number>>(profile.value?.emotionProfile, {}))
const hasEmotionProfile = computed(() => Object.keys(emotionProfile.value).length > 0)

const emotionRadarOption = computed(() => {
  const entries = Object.entries(emotionProfile.value)
  if (!entries.length) return {}
  return {
    tooltip: {},
    radar: {
      indicator: entries.map(([name]) => ({ name, max: 100 }))
    },
    series: [
      {
        name: '情感特征',
        type: 'radar',
        data: [{ value: entries.map(([, value]) => Number(value ?? 0)), name: '情感强度' }]
      }
    ]
  }
})

const stanceRows = computed<StanceRow[]>(() => {
  const parsed = safeParse<Record<string, unknown> | unknown[]>(profile.value?.stanceProfile, [])
  if (Array.isArray(parsed)) {
    return parsed.map((item, index) => {
      const row = item as Record<string, unknown>
      return {
        issue: String(row.issue ?? row.topic ?? `议题 ${index + 1}`),
        stance: String(row.stance ?? '-'),
        confidence: Number(row.confidence ?? 0)
      }
    })
  }
  return Object.entries(parsed).map(([issue, value]) => {
    const row = value as Record<string, unknown>
    return {
      issue,
      stance: String(row.stance ?? value ?? '-'),
      confidence: Number(row.confidence ?? 0)
    }
  })
})

const bendProfile = computed<Record<string, number>>(() => safeParse<Record<string, number>>(profile.value?.bendProfile, {}))
const hasBendProfile = computed(() => Object.keys(bendProfile.value).length > 0)

const bendPieOption = computed(() => {
  const entries = Object.entries(bendProfile.value)
  if (!entries.length) return {}
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        name: 'BEND 手法',
        type: 'pie',
        radius: ['38%', '64%'],
        center: ['50%', '44%'],
        data: entries.map(([name, value]) => ({ name, value }))
      }
    ]
  }
})

const activeTimeValues = computed<number[]>(() => {
  const parsed = safeParse<Record<string, number> | number[]>(profile.value?.activeTimePattern, {})
  if (Array.isArray(parsed)) return Array.from({ length: 24 }, (_, hour) => Number(parsed[hour] ?? 0))
  return Array.from({ length: 24 }, (_, hour) => Number(parsed[String(hour)] ?? parsed[`${hour}:00`] ?? 0))
})

const hasActiveTimePattern = computed(() => activeTimeValues.value.some(value => value > 0))

const activeTimeOption = computed(() => {
  if (!hasActiveTimePattern.value) return {}
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 24, bottom: 32 },
    xAxis: { type: 'category', data: Array.from({ length: 24 }, (_, hour) => `${hour}`) },
    yAxis: { type: 'value', name: '占比' },
    series: [
      {
        name: '活跃占比',
        type: 'bar',
        data: activeTimeValues.value,
        itemStyle: { color: '#2563eb' },
        barMaxWidth: 18
      }
    ]
  }
})

const behaviorCards = computed(() => [
  { label: '发帖频率', value: profile.value?.postingFrequency ?? '-' },
  { label: '原创比例', value: profile.value?.originalRatio ?? '-' },
  { label: 'MBTI 类型', value: profile.value?.mbtiType ?? '-' },
  { label: '决策风格', value: profile.value?.decisionStyle ?? '-' },
  { label: '语言风格', value: profile.value?.languageStyle ?? '-' },
  {
    label: '兴趣领域',
    value: Array.isArray(profile.value?.interestDomains)
      ? profile.value?.interestDomains.join('、')
      : profile.value?.interestDomains || '-'
  }
])

const coordinationRows = computed<CoordinationRow[]>(() => {
  const parsed = safeParse<Record<string, unknown> | unknown[]>(profile.value?.coordinationNetwork, [])
  if (Array.isArray(parsed)) {
    return parsed.map((item, index) => {
      const row = item as Record<string, unknown>
      return {
        name: String(row.name ?? row.account ?? row.id ?? `对象 ${index + 1}`),
        type: String(row.type ?? '-'),
        score: Number(row.score ?? row.weight ?? 0)
      }
    })
  }
  return Object.entries(parsed).map(([name, value]) => {
    const row = value as Record<string, unknown>
    return {
      name,
      type: String(row.type ?? '-'),
      score: Number(row.score ?? row.weight ?? 0)
    }
  })
})

const narrativeRows = computed<NarrativeRow[]>(() => {
  const parsed = safeParse<Record<string, unknown> | unknown[]>(profile.value?.preferredNarratives, [])
  if (Array.isArray(parsed)) {
    return parsed.map((item, index) => {
      const row = item as Record<string, unknown>
      return {
        narrative: String(row.narrative ?? row.name ?? `叙事 ${index + 1}`),
        weight: Number(row.weight ?? row.score ?? 0),
        confidence: Number(row.confidence ?? 0)
      }
    })
  }
  return Object.entries(parsed).map(([narrative, value]) => {
    const row = value as Record<string, unknown>
    return {
      narrative,
      weight: Number(row.weight ?? value ?? 0),
      confidence: Number(row.confidence ?? 0)
    }
  })
})

const graphCategories = [
  { name: 'Person', itemStyle: { color: '#2563eb' } },
  { name: 'SocialAccount', itemStyle: { color: '#0891b2' } },
  { name: 'Narrative', itemStyle: { color: '#ea580c' } },
  { name: 'Organization', itemStyle: { color: '#7c3aed' } },
  { name: 'Event', itemStyle: { color: '#dc2626' } },
  { name: 'Location', itemStyle: { color: '#16a34a' } },
  { name: 'MediaContent', itemStyle: { color: '#6b7280' } },
  { name: 'MediaAsset', itemStyle: { color: '#9ca3af' } }
]

const labelIndexMap = computed(() => new Map(graphCategories.map((item, index) => [item.name, index])))
const hasGraphData = computed(() => graphData.value.nodes.length > 0)

const getNodeDisplayName = (node: GraphNode) => {
  const props = node.properties ?? {}
  return String(props.canonicalName ?? props.canonicalLabel ?? props.handle ?? props.id ?? node.id)
}

const isCurrentPersonNode = (node: GraphNode) => {
  return node.label === 'Person' && (node.id === personId || node.properties?.id === personId || node.properties?.personId === personId)
}

const graphOption = computed(() => {
  if (!hasGraphData.value) return {}
  return {
    tooltip: {
      formatter: (params: { dataType?: string; data?: { name?: string; type?: string } }) => {
        if (params.dataType === 'edge') return params.data?.type || ''
        return params.data?.name || ''
      }
    },
    legend: [{ data: graphCategories.map(item => item.name), bottom: 0 }],
    series: [
      {
        type: 'graph',
        layout: 'force',
        draggable: true,
        roam: true,
        categories: graphCategories,
        force: {
          repulsion: 180,
          edgeLength: 90
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{b}'
        },
        edgeLabel: {
          show: true,
          fontSize: 10,
          formatter: (params: { data?: { type?: string } }) => params.data?.type || ''
        },
        data: graphData.value.nodes.map(node => ({
          id: node.id,
          name: getNodeDisplayName(node),
          symbolSize: isCurrentPersonNode(node) ? 40 : 24,
          category: labelIndexMap.value.get(node.label) ?? 0,
          label: { show: true }
        })),
        links: graphData.value.relations.map(relation => ({
          source: relation.fromId,
          target: relation.toId,
          type: relation.type
        }))
      }
    ]
  }
})

const loadDetail = async () => {
  loading.value = true
  try {
    const [profileResult, graphResult] = await Promise.all([
      getPersonProfile(personId),
      getPersonGraph(personId)
    ])
    profile.value = profileResult as unknown as PersonProfile
    graphData.value = (graphResult as unknown as GraphData) ?? { nodes: [], relations: [] }
  } catch {
    ElMessage.error('加载画像详情失败')
  } finally {
    loading.value = false
  }
}

const handleReview = async () => {
  const profileId = profile.value?.profileId || profile.value?.id
  if (!profileId) {
    ElMessage.error('缺少画像 ID，无法审核')
    return
  }
  reviewSubmitting.value = true
  try {
    await request.put(
      `/api/profiles/${profileId}/review`,
      { status: 'reviewed' },
      { headers: { 'X-User-Id': authStore.user?.id || '' } }
    )
    ElMessage.success('审核通过')
    await loadDetail()
  } catch {
    ElMessage.error('审核失败')
  } finally {
    reviewSubmitting.value = false
  }
}

onMounted(() => {
  void loadDetail()
})
</script>

<style scoped>
.profile-detail-view {
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

.panel {
  min-height: 180px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.panel h2 {
  margin: 0 0 12px;
  font-size: 16px;
  color: #111827;
}

.panel p {
  margin: 0 0 12px;
  color: #374151;
}

.chart {
  width: 100%;
  height: 300px;
}

.empty-state {
  height: 300px;
}

.graph-panel {
  min-height: 560px;
}

.graph-chart,
.graph-empty {
  width: 100%;
  height: 520px;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.metric-card {
  min-height: 96px;
  margin-bottom: 16px;
}

.metric-value {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  overflow-wrap: anywhere;
}

.metric-label {
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
}

.risk-medium {
  --el-tag-bg-color: #fef9c3;
  --el-tag-border-color: #fde047;
  --el-tag-text-color: #a16207;
}
</style>
