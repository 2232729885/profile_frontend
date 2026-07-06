<template>
  <div class="graph-view">
    <el-row :gutter="16">
      <el-col :span="6">
        <el-card class="control-card" shadow="never">
          <template #header>知识图谱</template>

          <section class="control-section">
            <h2>节点搜索</h2>
            <el-form label-position="top">
              <el-form-item label="关键词">
                <el-input v-model="searchForm.keyword" placeholder="搜索节点，如：Leila Farzan" clearable />
              </el-form-item>
              <el-form-item label="节点类型">
                <el-select v-model="searchForm.label" class="full-width" clearable placeholder="全部">
                  <el-option label="全部" value="" />
                  <el-option v-for="label in labelOptions" :key="label" :label="label" :value="label" />
                </el-select>
              </el-form-item>
              <el-button class="full-width" type="primary" :loading="searchLoading" @click="searchNodes">搜索节点</el-button>
            </el-form>

            <el-radio-group v-if="entityResults.length" v-model="selectedEntityId" class="entity-list">
              <el-radio
                v-for="entity in entityResults"
                :key="entity.id"
                class="entity-radio"
                :label="entity.id"
                @change="selectEntity(entity)"
              >
                <span>{{ entity.name }}</span>
                <el-tag size="small" :type="tagType(entity.label)">{{ entity.label }}</el-tag>
              </el-radio>
            </el-radio-group>
          </section>

          <section v-if="currentStart" class="control-section">
            <h2>当前起点</h2>
            <div class="start-node">
              <span>{{ currentStart.name }}</span>
              <el-tag :type="tagType(currentStart.label)">{{ currentStart.label }}</el-tag>
            </div>
            <div class="button-stack">
              <el-button type="primary" :loading="graphLoading" @click="reloadGraph">重新加载</el-button>
              <el-button @click="clearGraph">清空图谱</el-button>
            </div>
          </section>

          <section class="control-section">
            <h2>最短路径查询</h2>
            <el-form label-position="top">
              <el-form-item label="起始节点">
                <el-input v-model="pathForm.fromId" placeholder="起始节点 ID" clearable />
              </el-form-item>
              <el-form-item label="目标节点">
                <div class="inline-search">
                  <el-input v-model="targetKeyword" placeholder="搜索目标节点" clearable />
                  <el-button :loading="targetLoading" @click="searchTargetNodes">搜索</el-button>
                </div>
              </el-form-item>
              <el-select v-if="targetResults.length" v-model="pathForm.toId" class="full-width" placeholder="选择目标节点">
                <el-option
                  v-for="entity in targetResults"
                  :key="entity.id"
                  :label="`${entity.name} · ${entity.label}`"
                  :value="entity.id"
                />
              </el-select>
              <el-button class="full-width path-button" type="primary" :loading="pathLoading" @click="findPath">查找路径</el-button>
            </el-form>
          </section>

          <section v-if="graphData.nodes.length" class="control-section">
            <h2>图谱统计</h2>
            <div class="stats-row">
              <span>节点数：{{ graphData.nodes.length }}</span>
              <span>关系数：{{ graphData.relations.length }}</span>
            </div>
          </section>
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card v-loading="graphLoading || pathLoading" class="graph-card" shadow="never">
          <VChart
            v-if="graphData.nodes.length"
            class="graph-chart"
            :option="graphOption"
            autoresize
            @click="handleChartClick"
            @contextmenu="handleChartContextMenu"
          />
          <el-empty v-else class="graph-empty" description="请选择节点加载图谱" />
        </el-card>
      </el-col>
    </el-row>

    <el-dropdown
      ref="nodeMenuRef"
      trigger="contextmenu"
      :teleported="true"
      @command="handleNodeCommand"
    >
      <span class="context-menu-anchor" :style="{ left: `${contextMenuPosition.x}px`, top: `${contextMenuPosition.y}px` }" />
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="start">以此为起点</el-dropdown-item>
          <el-dropdown-item command="profile" :disabled="contextNode?.label !== 'Person'">查看画像</el-dropdown-item>
          <el-dropdown-item command="copy">复制节点 ID</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphChart } from 'echarts/charts'
import { LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'

use([CanvasRenderer, GraphChart, TitleComponent, TooltipComponent, LegendComponent])
</script>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import VChart from 'vue-echarts'
import { ElMessage } from 'element-plus'
import type { DropdownInstance } from 'element-plus'
import { searchEntities, searchGraph, searchPath } from '@/api/search'

interface EntityResult {
  id: string
  label: string
  name: string
  importanceScore?: number
}

interface GraphNode {
  id: string
  label: string
  properties: Record<string, unknown>
}

interface GraphRelation {
  sourceId: string
  targetId: string
  type: string
}

interface GraphData {
  nodes: GraphNode[]
  relations: GraphRelation[]
}

const LABEL_COLORS: Record<string, string> = {
  Person: '#2563eb',
  SocialAccount: '#0891b2',
  Organization: '#7c3aed',
  Narrative: '#ea580c',
  Event: '#dc2626',
  Location: '#16a34a',
  MediaContent: '#6b7280',
  MediaAsset: '#9ca3af'
}

const router = useRouter()
const labelOptions = Object.keys(LABEL_COLORS)
const searchLoading = ref(false)
const graphLoading = ref(false)
const targetLoading = ref(false)
const pathLoading = ref(false)
const selectedEntityId = ref('')
const entityResults = ref<EntityResult[]>([])
const targetResults = ref<EntityResult[]>([])
const targetKeyword = ref('')
const currentStart = ref<EntityResult | null>(null)
const graphData = ref<GraphData>({ nodes: [], relations: [] })
const highlightedRelationKeys = ref<Set<string>>(new Set())
const contextNode = ref<GraphNode | null>(null)
const nodeMenuRef = ref<DropdownInstance>()
const contextMenuPosition = reactive({ x: 0, y: 0 })

const searchForm = reactive({
  keyword: '',
  label: ''
})

const pathForm = reactive({
  fromId: '',
  toId: ''
})

const graphCategories = computed(() =>
  labelOptions.map(label => ({
    name: label,
    itemStyle: { color: LABEL_COLORS[label] }
  }))
)

const categoryIndex = computed(() => new Map(labelOptions.map((label, index) => [label, index])))

const relationKey = (relation: GraphRelation) => `${relation.sourceId}::${relation.targetId}::${relation.type}`

const getNodeName = (node: GraphNode) =>
  String(
    node.properties?.canonicalName ??
      node.properties?.canonicalLabel ??
      node.properties?.handle ??
      node.properties?.displayName ??
      node.properties?.platformContentId ??
      node.id.slice(0, 8)
  )

const tagType = (label: string) => {
  if (label === 'Person') return 'primary'
  if (label === 'SocialAccount' || label === 'Location') return 'success'
  if (label === 'Narrative' || label === 'Event') return 'warning'
  if (label === 'Organization') return 'danger'
  return 'info'
}

const symbolSize = (node: GraphNode) => {
  if (currentStart.value?.id === node.id) return 48
  if (node.label === 'Person' || node.label === 'Organization') return 32
  return 24
}

const normalizeEntities = (result: unknown) => {
  const items = Array.isArray(result)
    ? result
    : ((result as { items?: unknown[]; records?: unknown[] }).items ?? (result as { records?: unknown[] }).records ?? [])
  return (items as EntityResult[]).map(item => ({
    id: item.id,
    label: item.label,
    name: item.name,
    importanceScore: item.importanceScore
  }))
}

const normalizeGraphData = (result: unknown): GraphData => {
  const data = result as Partial<GraphData>
  return {
    nodes: data.nodes ?? [],
    relations: data.relations ?? []
  }
}

const mergeGraphData = (existing: GraphData, incoming: GraphData): GraphData => {
  const existingIds = new Set(existing.nodes.map(node => node.id))
  const newNodes = incoming.nodes.filter(node => !existingIds.has(node.id))
  const relationMap = new Map<string, GraphRelation>()
  ;[...existing.relations, ...incoming.relations].forEach(relation => {
    relationMap.set(relationKey(relation), relation)
  })
  return {
    nodes: [...existing.nodes, ...newNodes],
    relations: Array.from(relationMap.values())
  }
}

const graphOption = computed(() => ({
  tooltip: {
    formatter: (params: any) => {
      if (params.dataType === 'edge') return params.data.relType
      const node = graphData.value.nodes.find(item => item.id === params.data.id)
      if (!node) return params.data.name
      const rows = Object.entries(node.properties ?? {})
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join('<br />')
      return `<strong>${node.label}</strong><br />${getNodeName(node)}${rows ? `<br />${rows}` : ''}`
    }
  },
  legend: { data: graphCategories.value.map(item => item.name), top: 8 },
  series: [
    {
      type: 'graph',
      layout: 'force',
      roam: true,
      draggable: true,
      force: {
        repulsion: 300,
        gravity: 0.1,
        edgeLength: [80, 200]
      },
      label: { show: true, position: 'right', fontSize: 11 },
      edgeLabel: {
        show: true,
        fontSize: 10,
        formatter: (params: any) => params.data.relType
      },
      categories: graphCategories.value,
      nodes: graphData.value.nodes.map(node => ({
        id: node.id,
        name: getNodeName(node),
        symbolSize: symbolSize(node),
        category: categoryIndex.value.get(node.label) ?? 0,
        itemStyle: { color: LABEL_COLORS[node.label] ?? '#64748b' },
        label: { show: true },
        nodeLabel: node.label
      })),
      edges: graphData.value.relations.map(relation => {
        const key = relationKey(relation)
        const highlighted = highlightedRelationKeys.value.has(key)
        return {
          source: relation.sourceId,
          target: relation.targetId,
          relType: relation.type,
          lineStyle: {
            width: highlighted ? 4 : 1.5,
            color: highlighted ? '#facc15' : '#94a3b8'
          }
        }
      })
    }
  ]
}))

const searchNodes = async () => {
  if (!searchForm.keyword.trim()) {
    ElMessage.warning('请输入节点关键词')
    return
  }
  searchLoading.value = true
  try {
    entityResults.value = normalizeEntities(await searchEntities({
      keyword: searchForm.keyword.trim(),
      label: searchForm.label || undefined,
      limit: 10
    }))
  } catch {
    ElMessage.error('搜索节点失败')
  } finally {
    searchLoading.value = false
  }
}

const selectEntity = async (entity: EntityResult) => {
  currentStart.value = entity
  pathForm.fromId = entity.id
  await loadGraph(entity, false)
}

const loadGraph = async (entity: EntityResult, merge: boolean) => {
  graphLoading.value = true
  try {
    const incoming = normalizeGraphData(await searchGraph(entity.label, entity.id))
    graphData.value = merge ? mergeGraphData(graphData.value, incoming) : incoming
  } catch {
    ElMessage.error('加载图谱失败')
  } finally {
    graphLoading.value = false
  }
}

const reloadGraph = async () => {
  if (!currentStart.value) return
  highlightedRelationKeys.value = new Set()
  await loadGraph(currentStart.value, false)
}

const clearGraph = () => {
  graphData.value = { nodes: [], relations: [] }
  highlightedRelationKeys.value = new Set()
}

const searchTargetNodes = async () => {
  if (!targetKeyword.value.trim()) {
    ElMessage.warning('请输入目标节点关键词')
    return
  }
  targetLoading.value = true
  try {
    targetResults.value = normalizeEntities(await searchEntities({
      keyword: targetKeyword.value.trim(),
      limit: 10
    }))
  } catch {
    ElMessage.error('搜索目标节点失败')
  } finally {
    targetLoading.value = false
  }
}

const findPath = async () => {
  if (!pathForm.fromId || !pathForm.toId) {
    ElMessage.warning('请输入起始节点和目标节点')
    return
  }
  pathLoading.value = true
  try {
    const incoming = normalizeGraphData(await searchPath({
      fromId: pathForm.fromId,
      toId: pathForm.toId
    }))
    graphData.value = mergeGraphData(graphData.value, incoming)
    highlightedRelationKeys.value = new Set(incoming.relations.map(relationKey))
  } catch {
    ElMessage.error('查找路径失败')
  } finally {
    pathLoading.value = false
  }
}

const findGraphNode = (id: string) => graphData.value.nodes.find(node => node.id === id) ?? null

const handleChartClick = async (params: any) => {
  if (params.dataType !== 'node') return
  const node = findGraphNode(params.data.id)
  if (!node) return
  const entity = { id: node.id, label: node.label, name: getNodeName(node) }
  currentStart.value = entity
  pathForm.fromId = node.id
  await loadGraph(entity, true)
}

const handleChartContextMenu = (params: any) => {
  if (params.dataType !== 'node') return
  const event = params.event?.event
  event?.preventDefault?.()
  contextNode.value = findGraphNode(params.data.id)
  contextMenuPosition.x = event?.clientX ?? 0
  contextMenuPosition.y = event?.clientY ?? 0
  nodeMenuRef.value?.handleOpen()
}

const handleNodeCommand = async (command: string | number | object) => {
  if (!contextNode.value) return
  const node = contextNode.value
  if (command === 'start') {
    const entity = { id: node.id, label: node.label, name: getNodeName(node) }
    currentStart.value = entity
    pathForm.fromId = node.id
    await loadGraph(entity, false)
  }
  if (command === 'profile' && node.label === 'Person') {
    router.push(`/profiles/${node.id}`)
  }
  if (command === 'copy') {
    await navigator.clipboard.writeText(node.id)
    ElMessage.success('节点 ID 已复制')
  }
}
</script>

<style scoped>
.graph-view {
  height: 100%;
}

.control-card {
  min-height: calc(100vh - 120px);
}

.control-section {
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px solid #e5e7eb;
}

.control-section:last-child {
  border-bottom: none;
}

.control-section h2 {
  margin: 0 0 12px;
  font-size: 15px;
  color: #111827;
}

.full-width {
  width: 100%;
}

.entity-list {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  margin-top: 14px;
}

.entity-radio {
  display: flex;
  align-items: center;
  min-height: 32px;
  margin-right: 0;
}

.entity-radio :deep(.el-radio__label) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.start-node,
.stats-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: #374151;
}

.button-stack {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.button-stack .el-button {
  width: 100%;
  margin-left: 0;
}

.inline-search {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto;
  gap: 8px;
  width: 100%;
}

.path-button {
  margin-top: 12px;
}

.graph-card {
  height: calc(100vh - 120px);
}

.graph-card :deep(.el-card__body) {
  height: 100%;
  padding: 0;
}

.graph-chart,
.graph-empty {
  width: 100%;
  height: calc(100vh - 120px);
  min-height: 600px;
}

.context-menu-anchor {
  position: fixed;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
</style>
