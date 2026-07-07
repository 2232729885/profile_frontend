<template>
  <div class="search-view">
    <div class="page-header">
      <div>
        <h1>综合检索</h1>
        <p>文本、语义、混合与图片多模态检索</p>
      </div>
    </div>

    <el-card class="entity-search-card" shadow="never">
      <template #header>实体快速查找</template>
      <div class="entity-search-form">
        <el-input v-model="entityForm.keyword" placeholder="输入实体关键词" clearable @keyup.enter="handleEntitySearch" />
        <el-select v-model="entityForm.label" placeholder="节点类型" clearable>
          <el-option v-for="label in entityLabels" :key="label" :label="label" :value="label" />
        </el-select>
        <el-button type="primary" :loading="entityLoading" @click="handleEntitySearch">搜索</el-button>
      </div>
      <div class="entity-result">
        <span class="muted-text">结果：</span>
        <el-tag
          v-for="entity in entityResults"
          :key="entity.id"
          class="entity-tag"
          effect="plain"
          @click="goProfiles(entity)"
        >
          {{ entity.label }} · {{ entity.name }}
        </el-tag>
        <span v-if="!entityResults.length" class="muted-text">暂无结果</span>
      </div>
    </el-card>

    <el-row :gutter="16">
      <el-col :span="7">
        <el-card class="search-panel" shadow="never">
          <el-tabs v-model="activeMode" tab-position="top" @tab-change="handleModeChange">
            <el-tab-pane label="文本检索" name="text">
              <el-form label-position="top">
                <el-form-item label="关键词">
                  <el-input v-model="textForm.keyword" placeholder="请输入关键词" clearable />
                </el-form-item>
                <el-form-item label="平台过滤">
                  <el-select v-model="textForm.platform" class="full-width" clearable placeholder="全部平台">
                    <el-option v-for="platform in platformOptions" :key="platform" :label="platform" :value="platform" />
                  </el-select>
                </el-form-item>
                <el-form-item label="语言过滤">
                  <el-select v-model="textForm.language" class="full-width" clearable placeholder="全部语言">
                    <el-option v-for="language in languageOptions" :key="language" :label="language" :value="language" />
                  </el-select>
                </el-form-item>
                <el-form-item label="每页数量">
                  <el-input-number v-model="textForm.size" :min="1" :max="100" />
                </el-form-item>
                <el-button type="primary" class="full-width" :loading="searchLoading" @click="handleTextSearch">搜索</el-button>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="语义检索" name="semantic">
              <el-form label-position="top">
                <el-form-item label="查询文本">
                  <el-input v-model="semanticForm.queryText" type="textarea" :rows="4" placeholder="请输入查询文本" />
                </el-form-item>
                <el-form-item label="平台过滤">
                  <el-select v-model="semanticForm.platform" class="full-width" clearable placeholder="全部平台">
                    <el-option v-for="platform in platformOptions" :key="platform" :label="platform" :value="platform" />
                  </el-select>
                </el-form-item>
                <el-form-item label="语言过滤">
                  <el-select v-model="semanticForm.language" class="full-width" clearable placeholder="全部语言">
                    <el-option v-for="language in languageOptions" :key="language" :label="language" :value="language" />
                  </el-select>
                </el-form-item>
                <el-form-item label="返回数量 topK">
                  <el-input-number v-model="semanticForm.topK" :min="1" :max="100" />
                </el-form-item>
                <el-button type="primary" class="full-width" :loading="searchLoading" @click="handleSemanticSearch">搜索</el-button>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="混合检索" name="hybrid">
              <el-form label-position="top">
                <el-form-item label="查询文本">
                  <el-input v-model="hybridForm.queryText" type="textarea" :rows="3" placeholder="请输入查询文本" />
                </el-form-item>
                <el-form-item label="图片 URL">
                  <el-input v-model="hybridForm.imageUrl" placeholder="可选，支持图文混合查询" clearable />
                </el-form-item>
                <el-form-item label="返回数量 topK">
                  <el-input-number v-model="hybridForm.topK" :min="1" :max="100" />
                </el-form-item>
                <div class="switch-row">
                  <el-switch v-model="hybridForm.enableEs" active-text="ES" />
                  <el-switch v-model="hybridForm.enableMilvus" active-text="Milvus" />
                  <el-switch v-model="hybridForm.enableNeo4j" active-text="Neo4j" />
                </div>
                <el-form-item label="跨模态">
                  <el-radio-group v-model="hybridForm.targetModalities">
                    <el-radio label="all">all</el-radio>
                    <el-radio label="text">text</el-radio>
                    <el-radio label="image">image</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-button type="primary" class="full-width" :loading="searchLoading" @click="handleHybridSearch">搜索</el-button>
              </el-form>
            </el-tab-pane>

            <el-tab-pane label="图片检索" name="image">
              <el-form label-position="top">
                <el-form-item label="返回数量 topK">
                  <el-input-number v-model="imageForm.topK" :min="1" :max="100" />
                </el-form-item>
                <el-form-item label="跨模态">
                  <el-radio-group v-model="imageForm.targetModalities">
                    <el-radio label="all">all</el-radio>
                    <el-radio label="text">text</el-radio>
                    <el-radio label="image">image</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-tabs v-model="imageInputMode" class="image-input-tabs">
                  <el-tab-pane label="URL 方式" name="url">
                    <el-form-item label="图片 URL">
                      <el-input v-model="imageForm.imageUrl" placeholder="请输入图片 URL" clearable />
                    </el-form-item>
                    <el-button type="primary" class="full-width" :loading="searchLoading" @click="handleImageUrlSearch">
                      搜索
                    </el-button>
                  </el-tab-pane>
                  <el-tab-pane label="文件上传" name="upload">
                    <el-upload
                      drag
                      :show-file-list="false"
                      :http-request="handleImageUpload"
                      accept="image/*"
                    >
                      <div class="upload-text">拖拽图片到此处，或点击选择文件</div>
                    </el-upload>
                    <div v-if="uploadedImagePreviewUrl" class="image-preview">
                      <p class="image-preview__label">已选择图片：</p>
                      <el-image :src="uploadedImagePreviewUrl" class="image-preview__image" fit="contain" />
                    </div>
                  </el-tab-pane>
                  <el-tab-pane label="Base64" name="base64">
                    <el-form-item label="Base64">
                      <el-input v-model="imageForm.base64" type="textarea" :rows="5" placeholder="粘贴图片 base64" />
                    </el-form-item>
                    <el-button type="primary" class="full-width" :loading="searchLoading" @click="handleImageBase64Search">
                      搜索
                    </el-button>
                  </el-tab-pane>
                </el-tabs>
              </el-form>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>

      <el-col :span="17">
        <el-card class="result-panel" shadow="never">
          <template #header>
            <div class="result-header">
              <span>共 {{ resultMeta.total }} 条结果，耗时 {{ resultMeta.durationMs }}ms，检索类型：{{ resultMeta.searchType || '-' }}</span>
              <el-button size="small" @click="clearResults">清空</el-button>
            </div>
          </template>
          <div v-loading="searchLoading" class="result-body">
            <el-empty v-if="!searchLoading && !results.length" description="暂无检索结果" />
            <div v-else class="result-list">
              <el-card
                v-for="item in results"
                :key="item.id"
                class="result-card"
                shadow="hover"
                @click="openContentDetail(item)"
              >
                <div class="result-card__meta">
                  <div class="tag-group">
                    <el-tag :type="platformTagType(item.platform)">{{ item.platform || '-' }}</el-tag>
                    <el-tag type="info">{{ item.language || '-' }}</el-tag>
                    <el-tag effect="plain">{{ item.contentType || '-' }}</el-tag>
                  </div>
                  <span class="muted-text">{{ formatTime(item.publishTime || item.createdAt) }}</span>
                </div>

                <div class="body-text" :class="{ collapsed: !isExpanded(item.id) && getBodyText(item).length > 200 }">
                  {{ displayBodyText(item) }}
                </div>
                <el-button v-if="getBodyText(item).length > 200" link type="primary" @click.stop="toggleExpanded(item.id)">
                  {{ isExpanded(item.id) ? '收起' : '展开' }}
                </el-button>

                <div class="result-card__stats">
                  <span>作者：@{{ item.authorPlatformUserId || '-' }}</span>
                  <span>赞 {{ item.likeCount ?? 0 }}</span>
                  <span>评 {{ item.commentCount ?? 0 }}</span>
                  <span>转 {{ item.repostCount ?? 0 }}</span>
                </div>

                <div class="result-card__footer">
                  <div class="hashtag-list">
                    <el-tag v-for="tag in getHashtags(item)" :key="tag" size="small" type="info" effect="plain">#{{ tag }}</el-tag>
                    <span v-if="item.mediaAssetIds?.length" class="media-count">
                      <el-icon><Picture /></el-icon>
                      {{ item.mediaAssetIds.length }} 张图片
                    </span>
                  </div>
                  <div>
                    <el-button size="small" :disabled="!item.authorAccountId" @click.stop="goAuthorProfile(item)">查看画像</el-button>
                    <el-button size="small" type="primary" :disabled="!item.id" @click.stop="openGraphDialog(item)">查看图谱</el-button>
                  </div>
                </div>
              </el-card>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-dialog
      v-model="graphDialogVisible"
      title="内容 2 跳图谱"
      width="900px"
      destroy-on-close
      @opened="handleGraphDialogOpened"
      @closed="graphDialogReady = false"
    >
      <div v-loading="graphLoading" class="graph-dialog-body">
        <VChart v-if="graphDialogReady && hasGraphData" class="graph-chart" :option="graphOption" autoresize />
        <el-empty v-else-if="!graphLoading" class="graph-empty" description="暂无图谱数据" />
      </div>
    </el-dialog>

    <el-dialog
      v-model="contentDetailVisible"
      title="贴文详情"
      width="760px"
      destroy-on-close
    >
      <div v-loading="contentDetailLoading">
        <template v-if="contentDetail">
          <el-descriptions :column="2" border size="small" class="content-detail-descriptions">
            <el-descriptions-item label="平台">{{ contentDetail.content.platform || '-' }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ contentDetail.content.contentType || '-' }}</el-descriptions-item>
            <el-descriptions-item label="语言">{{ contentDetail.content.language || '-' }}</el-descriptions-item>
            <el-descriptions-item label="发布时间">{{ formatTime(contentDetail.content.publishedAt || contentDetail.content.publishTime) }}</el-descriptions-item>
            <el-descriptions-item label="作者" :span="2">@{{ contentDetail.content.authorPlatformUserId || '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="contentDetail.content.url" label="原始链接" :span="2">
              <el-link :href="contentDetail.content.url" target="_blank" type="primary">{{ contentDetail.content.url }}</el-link>
            </el-descriptions-item>
          </el-descriptions>

          <div class="content-body-section">
            <div class="section-title">正文</div>
            <div class="content-body">{{ contentDetail.content.bodyText || contentDetail.content.text || '（无文字内容）' }}</div>
          </div>

          <template v-if="contentDetail.assets?.length">
            <div class="section-title asset-section-title">媒体资产（{{ contentDetail.assets.length }} 个）</div>
            <div class="asset-grid">
              <div v-for="asset in contentDetail.assets" :key="asset.id" class="asset-item">
                <template v-if="asset.assetType === 'image'">
                  <el-image
                    :src="buildAssetUrl(asset)"
                    :preview-src-list="imageAssetUrls(contentDetail.assets)"
                    fit="cover"
                    class="asset-image"
                  >
                    <template #error>
                      <div class="asset-error">
                        <el-icon><Picture /></el-icon>
                        <span>图片加载失败</span>
                      </div>
                    </template>
                  </el-image>
                  <div v-if="asset.ocrText" class="asset-ocr">OCR: {{ asset.ocrText }}</div>
                  <el-tag v-if="asset.sceneLabel" size="small" class="asset-scene">{{ asset.sceneLabel }}</el-tag>
                </template>

                <template v-else>
                  <div class="asset-non-image">
                    <el-icon><VideoPlay /></el-icon>
                    <span>{{ asset.assetType || '-' }} · {{ asset.mimeType || '-' }}</span>
                    <el-link v-if="asset.sourceUrl" :href="asset.sourceUrl" target="_blank" type="primary">原始链接</el-link>
                  </div>
                </template>
              </div>
            </div>
          </template>

          <template v-if="hasPropagation(contentDetail.propagation)">
            <div class="section-title propagation-title">传播链</div>
            <div class="propagation-section">
              <div v-if="contentDetail.propagation.parent" class="prop-item">
                <el-tag size="small" type="warning">回复自</el-tag>
                <span class="prop-text">{{ contentDetail.propagation.parent.bodyText || '（无文字）' }}</span>
              </div>
              <div v-if="contentDetail.propagation.repostOf" class="prop-item">
                <el-tag size="small" type="success">转发自</el-tag>
                <span class="prop-text">{{ contentDetail.propagation.repostOf.bodyText || '（无文字）' }}</span>
                <span class="muted-text">@{{ contentDetail.propagation.repostOf.authorPlatformUserId }}</span>
              </div>
              <div v-if="contentDetail.propagation.quotedContent" class="prop-item">
                <el-tag size="small" type="info">引用自</el-tag>
                <span class="prop-text">{{ contentDetail.propagation.quotedContent.bodyText || '（无文字）' }}</span>
                <span class="muted-text">@{{ contentDetail.propagation.quotedContent.authorPlatformUserId }}</span>
              </div>
            </div>
          </template>

          <div class="content-stats-row">
            <span>赞 {{ contentDetail.content.likeCount ?? 0 }}</span>
            <span>评论 {{ contentDetail.content.commentCount ?? 0 }}</span>
            <span>转发 {{ contentDetail.content.repostCount ?? 0 }}</span>
            <span>引用 {{ contentDetail.content.quoteCount ?? 0 }}</span>
            <span>浏览 {{ contentDetail.content.viewCount ?? 0 }}</span>
          </div>
        </template>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphChart } from 'echarts/charts'
import { LegendComponent, TitleComponent, TooltipComponent } from 'echarts/components'

use([CanvasRenderer, GraphChart, LegendComponent, TitleComponent, TooltipComponent])
</script>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import VChart from 'vue-echarts'
import type { UploadRequestOptions } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Picture, VideoPlay } from '@element-plus/icons-vue'
import { getContentDetail } from '@/api/ingestion'
import {
  searchByImage,
  searchByImageBase64,
  searchByImageUpload,
  searchEntities,
  searchGraph,
  searchHybrid,
  searchSemantic,
  searchText
} from '@/api/search'

type SearchMode = 'text' | 'semantic' | 'hybrid' | 'image'
type TargetModality = 'all' | 'text' | 'image'

interface SearchResult {
  items: MediaContent[]
  total: number
  durationMs: number
  searchType: string
}

interface MediaContent {
  id: string
  platform?: string
  language?: string
  contentType?: string
  publishedAt?: string
  publishTime?: string
  createdAt?: string
  bodyText?: string
  text?: string
  url?: string
  authorPlatformUserId?: string
  authorAccountId?: string
  likeCount?: number
  commentCount?: number
  shareCount?: number
  repostCount?: number
  quoteCount?: number
  viewCount?: number
  hashtags?: string[] | string
  mediaAssetIds?: string[]
}

interface MediaAsset {
  id: string
  assetType?: string
  sourceUrl?: string
  mimeType?: string
  minioBucket?: string
  minioKey?: string
  ocrText?: string
  sceneLabel?: string
}

interface ContentPropagation {
  parent?: MediaContent | null
  repostOf?: MediaContent | null
  quotedContent?: MediaContent | null
}

interface ContentDetail {
  content: MediaContent
  assets: MediaAsset[]
  propagation: ContentPropagation
}

interface EntityResult {
  id: string
  label: string
  name: string
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

const router = useRouter()
const activeMode = ref<SearchMode>('text')
const imageInputMode = ref<'url' | 'upload' | 'base64'>('url')
const uploadedImagePreviewUrl = ref('')
const searchLoading = ref(false)
const entityLoading = ref(false)
const graphLoading = ref(false)
const graphDialogVisible = ref(false)
const graphDialogReady = ref(false)
const contentDetailVisible = ref(false)
const contentDetailLoading = ref(false)
const contentDetail = ref<ContentDetail | null>(null)
const results = ref<MediaContent[]>([])
const expandedIds = ref<Set<string>>(new Set())
const entityResults = ref<EntityResult[]>([])
const graphData = ref<GraphData>({ nodes: [], relations: [] })
const resultMeta = reactive({
  total: 0,
  durationMs: 0,
  searchType: ''
})

const platformOptions = ['x', 'telegram', 'youtube', 'news']
const languageOptions = ['zh', 'en', 'fa', 'ar', 'vi']
const entityLabels = ['Person', 'SocialAccount', 'Organization', 'Narrative', 'Event', 'Location', 'MediaContent']

const entityForm = reactive({
  keyword: '',
  label: ''
})

const textForm = reactive({
  keyword: '',
  platform: '',
  language: '',
  size: 20
})

const semanticForm = reactive({
  queryText: '',
  platform: '',
  language: '',
  topK: 20
})

const hybridForm = reactive({
  queryText: '',
  imageUrl: '',
  topK: 20,
  enableEs: true,
  enableMilvus: true,
  enableNeo4j: false,
  targetModalities: 'all' as TargetModality
})

const imageForm = reactive({
  imageUrl: '',
  base64: '',
  topK: 20,
  targetModalities: 'all' as TargetModality
})

const clearUploadedImagePreview = () => {
  if (uploadedImagePreviewUrl.value) {
    URL.revokeObjectURL(uploadedImagePreviewUrl.value)
    uploadedImagePreviewUrl.value = ''
  }
}

const normalizeResult = (result: unknown, fallbackType: string): SearchResult => {
  if (Array.isArray(result)) {
    return { items: result as MediaContent[], total: result.length, durationMs: 0, searchType: fallbackType }
  }
  const data = result as Partial<SearchResult>
  const items = data.items ?? []
  return {
    items,
    total: data.total ?? items.length,
    durationMs: data.durationMs ?? 0,
    searchType: data.searchType ?? fallbackType
  }
}

const applySearchResult = (result: unknown, fallbackType: string) => {
  const normalized = normalizeResult(result, fallbackType)
  results.value = normalized.items
  resultMeta.total = normalized.total
  resultMeta.durationMs = normalized.durationMs
  resultMeta.searchType = normalized.searchType
  expandedIds.value = new Set()
}

const clearResults = () => {
  results.value = []
  resultMeta.total = 0
  resultMeta.durationMs = 0
  resultMeta.searchType = ''
  expandedIds.value = new Set()
}

const handleModeChange = () => {
  clearResults()
}

const runSearch = async (searcher: () => Promise<unknown>, fallbackType: string) => {
  searchLoading.value = true
  try {
    const result = await searcher()
    applySearchResult(result, fallbackType)
  } catch {
    ElMessage.error('检索失败')
  } finally {
    searchLoading.value = false
  }
}

const handleTextSearch = async () => {
  if (!textForm.keyword.trim()) {
    ElMessage.warning('请输入关键词')
    return
  }
  await runSearch(
    () =>
      searchText({
        keyword: textForm.keyword.trim(),
        platform: textForm.platform || undefined,
        language: textForm.language || undefined,
        page: 0,
        size: textForm.size
      }),
    'text'
  )
}

const handleSemanticSearch = async () => {
  if (!semanticForm.queryText.trim()) {
    ElMessage.warning('请输入查询文本')
    return
  }
  await runSearch(
    () =>
      searchSemantic({
        queryText: semanticForm.queryText.trim(),
        platform: semanticForm.platform || undefined,
        language: semanticForm.language || undefined,
        topK: semanticForm.topK
      }),
    'semantic'
  )
}

const handleHybridSearch = async () => {
  if (!hybridForm.queryText.trim() && !hybridForm.imageUrl.trim()) {
    ElMessage.warning('请输入查询文本或图片 URL')
    return
  }
  await runSearch(
    () =>
      searchHybrid({
        queryText: hybridForm.queryText.trim() || undefined,
        imageUrl: hybridForm.imageUrl.trim() || undefined,
        topK: hybridForm.topK,
        enableEs: hybridForm.enableEs,
        enableMilvus: hybridForm.enableMilvus,
        enableNeo4j: hybridForm.enableNeo4j,
        targetModalities: hybridForm.targetModalities
      }),
    'hybrid'
  )
}

const handleImageUrlSearch = async () => {
  if (!imageForm.imageUrl.trim()) {
    ElMessage.warning('请输入图片 URL')
    return
  }
  await runSearch(
    () =>
      searchByImage({
        imageUrl: imageForm.imageUrl.trim(),
        topK: imageForm.topK,
        targetModalities: imageForm.targetModalities
      }),
    'image-url'
  )
}

const handleImageBase64Search = async () => {
  if (!imageForm.base64.trim()) {
    ElMessage.warning('请输入 base64')
    return
  }
  await runSearch(
    () =>
      searchByImageBase64({
        base64: imageForm.base64.trim(),
        topK: imageForm.topK,
        targetModalities: imageForm.targetModalities
      }),
    'image-base64'
  )
}

const handleImageUpload = async (options: UploadRequestOptions) => {
  clearUploadedImagePreview()
  uploadedImagePreviewUrl.value = URL.createObjectURL(options.file as File)

  const formData = new FormData()
  formData.append('file', options.file)
  formData.append('topK', String(imageForm.topK))
  formData.append('targetModalities', imageForm.targetModalities)
  searchLoading.value = true
  try {
    const result = await searchByImageUpload(formData)
    applySearchResult(result, 'image-upload')
    options.onSuccess?.(result)
  } catch (error) {
    ElMessage.error('图片上传检索失败')
    options.onError?.(error as any)
  } finally {
    searchLoading.value = false
  }
}

const handleEntitySearch = async () => {
  if (!entityForm.keyword.trim()) {
    ElMessage.warning('请输入实体关键词')
    return
  }
  entityLoading.value = true
  try {
    const result = await searchEntities({
      keyword: entityForm.keyword.trim(),
      label: entityForm.label || undefined,
      limit: 10
    })
    const items = Array.isArray(result) ? result : ((result as { records?: unknown[]; items?: unknown[] }).items ?? (result as { records?: unknown[] }).records ?? [])
    entityResults.value = items.map((item, index) => normalizeEntity(item, index))
  } catch {
    ElMessage.error('实体搜索失败')
  } finally {
    entityLoading.value = false
  }
}

const normalizeEntity = (item: unknown, index: number): EntityResult => {
  const data = item as Record<string, unknown>
  const properties = (data.properties ?? {}) as Record<string, unknown>
  return {
    id: String(data.id ?? properties.id ?? index),
    label: String(data.label ?? data.entityType ?? '-'),
    name: String(data.name ?? properties.canonicalName ?? properties.canonicalLabel ?? properties.handle ?? data.id ?? '-')
  }
}

const formatTime = (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const platformTagType = (platform?: string) => {
  if (platform === 'x') return 'primary'
  if (platform === 'telegram') return 'success'
  if (platform === 'youtube') return 'danger'
  if (platform === 'news') return 'warning'
  return 'info'
}

const getBodyText = (item: MediaContent) => item.bodyText || item.text || ''

const isExpanded = (id: string) => expandedIds.value.has(id)

const displayBodyText = (item: MediaContent) => {
  const text = getBodyText(item)
  if (text.length <= 200 || isExpanded(item.id)) return text
  return `${text.slice(0, 200)}...`
}

const toggleExpanded = (id: string) => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

const getHashtags = (item: MediaContent) => {
  if (Array.isArray(item.hashtags)) return item.hashtags.slice(0, 5)
  if (typeof item.hashtags === 'string') {
    return item.hashtags
      .split(',')
      .map(tag => tag.trim().replace(/^#/, ''))
      .filter(Boolean)
      .slice(0, 5)
  }
  return []
}

const goAuthorProfile = (item: MediaContent) => {
  router.push({ path: '/profiles', query: { authorAccountId: item.authorAccountId } })
}

const goProfiles = (entity: EntityResult) => {
  router.push({ path: '/profiles', query: { entityId: entity.id, label: entity.label } })
}

const openContentDetail = async (item: MediaContent) => {
  contentDetailVisible.value = true
  contentDetailLoading.value = true
  contentDetail.value = null
  try {
    contentDetail.value = (await getContentDetail(item.id)) as unknown as ContentDetail
  } catch {
    ElMessage.error('加载详情失败')
  } finally {
    contentDetailLoading.value = false
  }
}

const buildAssetUrl = (asset: MediaAsset): string => {
  if (asset.minioKey && asset.minioBucket) {
    return `http://172.16.40.232:9000/${asset.minioBucket}/${asset.minioKey}`
  }
  return asset.sourceUrl || ''
}

const imageAssetUrls = (assets: MediaAsset[]): string[] =>
  assets.filter(asset => asset.assetType === 'image').map(buildAssetUrl).filter(Boolean)

const hasPropagation = (prop?: ContentPropagation | null): boolean =>
  Boolean(prop && (prop.parent || prop.repostOf || prop.quotedContent))

const openGraphDialog = async (item: MediaContent) => {
  graphDialogReady.value = false
  graphData.value = { nodes: [], relations: [] }
  graphDialogVisible.value = true
  graphLoading.value = true
  try {
    graphData.value = (await searchGraph('MediaContent', item.id)) as unknown as GraphData
  } catch {
    ElMessage.error('加载内容图谱失败')
  } finally {
    graphLoading.value = false
  }
}

const handleGraphDialogOpened = async () => {
  await nextTick()
  graphDialogReady.value = true
}

watch(imageInputMode, mode => {
  if (mode !== 'upload') {
    clearUploadedImagePreview()
  }
})

onUnmounted(() => {
  clearUploadedImagePreview()
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
          symbolSize: node.label === 'MediaContent' ? 40 : 24,
          category: labelIndexMap.value.get(node.label) ?? 0,
          label: { show: true }
        })),
        links: graphData.value.relations.map(relation => ({
          source: relation.sourceId,
          target: relation.targetId,
          type: relation.type
        }))
      }
    ]
  }
})
</script>

<style scoped>
.search-view {
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

.entity-search-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entity-search-form {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 180px auto;
  gap: 12px;
}

.entity-result {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.entity-tag {
  cursor: pointer;
}

.search-panel,
.result-panel {
  min-height: 680px;
}

.full-width {
  width: 100%;
}

.switch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.image-input-tabs {
  margin-top: 8px;
}

.upload-text {
  padding: 24px 12px;
  color: #6b7280;
}

.image-preview {
  margin-top: 8px;
}

.image-preview__label {
  margin: 8px 0 4px;
  color: #909399;
  font-size: 12px;
}

.image-preview__image {
  max-width: 100%;
  max-height: 200px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.result-body {
  min-height: 560px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  border-radius: 8px;
  cursor: pointer;
}

.result-card__meta,
.result-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.tag-group,
.hashtag-list,
.result-card__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.media-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #6b7280;
  font-size: 12px;
}

.content-detail-descriptions {
  margin-bottom: 16px;
}

.section-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #111827;
}

.content-body-section {
  margin-top: 12px;
}

.content-body {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
  color: #374151;
  line-height: 1.6;
  white-space: pre-wrap;
}

.asset-section-title,
.propagation-title {
  margin-top: 16px;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.asset-item {
  min-width: 0;
}

.asset-image {
  width: 100%;
  height: 140px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.asset-error,
.asset-non-image {
  display: flex;
  min-height: 120px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #6b7280;
  background: #f9fafb;
}

.asset-non-image {
  flex-direction: column;
  padding: 12px;
}

.asset-ocr {
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
}

.asset-scene {
  margin-top: 4px;
}

.propagation-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prop-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #f9fafb;
}

.prop-text {
  overflow: hidden;
  color: #374151;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 16px;
  color: #374151;
  font-size: 13px;
}

.body-text {
  margin: 14px 0 8px;
  line-height: 1.6;
  color: #111827;
  white-space: pre-wrap;
}

.body-text.collapsed {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.result-card__stats {
  margin: 12px 0;
  font-size: 13px;
  color: #4b5563;
}

.graph-dialog-body {
  height: 560px;
}

.graph-chart,
.graph-empty {
  width: 100%;
  height: 540px;
}

@media (max-width: 1100px) {
  .entity-search-form {
    grid-template-columns: 1fr;
  }

  :deep(.el-col-7),
  :deep(.el-col-17) {
    max-width: 100%;
    flex: 0 0 100%;
  }
}
</style>
