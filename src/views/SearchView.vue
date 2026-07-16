<template>
  <div class="search-view">
    <div class="page-header">
      <h1>综合检索</h1>
    </div>

    <div class="scope-switcher">
      <el-radio-group v-model="activeMode" size="large" @change="handleModeChange">
        <el-radio-button value="content">内容</el-radio-button>
        <el-radio-button value="account">账号</el-radio-button>
        <el-radio-button value="entity">实体</el-radio-button>
      </el-radio-group>
    </div>

    <el-card class="primary-search-card" shadow="never">
      <div v-if="activeMode === 'content'" class="content-mode-switcher">
        <el-radio-group v-model="contentMode">
          <el-radio-button value="hybrid">智能融合</el-radio-button>
          <el-radio-button value="text">关键词</el-radio-button>
          <el-radio-button value="semantic">语义</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 内容 · 关键词 -->
      <div v-if="activeMode === 'content' && contentMode === 'text'" class="primary-input-area">
        <el-input
          v-model="textForm.keyword"
          size="large"
          placeholder="请输入关键词"
          clearable
          class="primary-search-input"
          @keyup.enter="handleTextSearch"
        >
          <template #append>
            <el-button type="primary" :loading="searchLoading" @click="handleTextSearch">搜索</el-button>
          </template>
        </el-input>
        <el-collapse class="more-options">
          <el-collapse-item title="更多选项">
            <div class="options-grid">
              <el-select v-model="textForm.platform" clearable placeholder="全部平台">
                <el-option v-for="platform in platformOptions" :key="platform" :label="platform" :value="platform" />
              </el-select>
              <el-select v-model="textForm.language" clearable placeholder="全部语言">
                <el-option v-for="language in languageOptions" :key="language" :label="language" :value="language" />
              </el-select>
              <el-input-number v-model="textForm.size" :min="1" :max="100" />
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 内容 · 语义 -->
      <div v-else-if="activeMode === 'content' && contentMode === 'semantic'" class="primary-input-area">
        <el-input
          v-model="semanticForm.queryText"
          type="textarea"
          :rows="3"
          size="large"
          placeholder="请输入查询文本，支持自然语言描述"
          class="primary-search-input"
        />
        <el-button
          type="primary"
          size="large"
          class="primary-search-button"
          :loading="searchLoading"
          @click="handleSemanticSearch"
        >
          搜索
        </el-button>
        <el-collapse class="more-options">
          <el-collapse-item title="更多选项">
            <div class="options-grid">
              <el-select v-model="semanticForm.platform" clearable placeholder="全部平台">
                <el-option v-for="platform in platformOptions" :key="platform" :label="platform" :value="platform" />
              </el-select>
              <el-select v-model="semanticForm.language" clearable placeholder="全部语言">
                <el-option v-for="language in languageOptions" :key="language" :label="language" :value="language" />
              </el-select>
              <el-input-number v-model="semanticForm.topK" :min="1" :max="100" />
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 内容 · 智能融合 -->
      <div v-else-if="activeMode === 'content' && contentMode === 'hybrid'" class="primary-input-area">
        <el-input
          v-model="hybridForm.queryText"
          size="large"
          placeholder="输入文字搜索，或点击右侧图片按钮上传图片"
          clearable
          class="primary-search-input"
          @keyup.enter="handleHybridSearch"
        >
          <template #suffix>
            <el-upload
              class="hybrid-upload-button"
              :show-file-list="false"
              :http-request="handleHybridImageUpload"
              accept="image/*"
            >
              <el-button :icon="Picture" circle text title="上传图片搜索" />
            </el-upload>
          </template>
          <template #append>
            <el-button type="primary" :loading="searchLoading" @click="handleHybridSearch">搜索</el-button>
          </template>
        </el-input>
        <div v-if="uploadedImagePreviewUrl" class="hybrid-image-preview">
          <el-image :src="uploadedImagePreviewUrl" fit="cover" />
          <span>已用上传图片检索，可继续输入文字或换图</span>
        </div>
        <el-collapse class="more-options">
          <el-collapse-item title="更多选项">
            <div class="options-grid">
              <el-input v-model="hybridForm.imageUrl" placeholder="图片 URL（可选）" clearable />
              <el-input-number v-model="hybridForm.topK" :min="1" :max="100" />
            </div>
            <div class="switch-row">
              <el-switch v-model="hybridForm.enableEs" active-text="关键词召回" />
              <el-switch v-model="hybridForm.enableMilvus" active-text="语义召回" />
              <el-switch v-model="hybridForm.enableNeo4j" active-text="图谱扩展" />
            </div>
            <el-radio-group v-model="hybridForm.targetModalities" class="mt-sm">
              <el-radio value="all">全部结果</el-radio>
              <el-radio value="text">只看贴文</el-radio>
              <el-radio value="image">只看图片</el-radio>
            </el-radio-group>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 内容 · 以图搜索 -->
      <div v-else-if="activeMode === 'content' && contentMode === 'image'" class="primary-input-area">
        <div class="image-source-switcher">
          <el-radio-group v-model="imageInputMode">
            <el-radio-button value="url">URL</el-radio-button>
            <el-radio-button value="upload">上传文件</el-radio-button>
            <el-radio-button value="base64">Base64</el-radio-button>
          </el-radio-group>
        </div>

        <template v-if="imageInputMode === 'url'">
          <el-input
            v-model="imageForm.imageUrl"
            size="large"
            placeholder="请输入图片 URL"
            clearable
            class="primary-search-input"
            @keyup.enter="handleImageUrlSearch"
          >
            <template #append>
              <el-button type="primary" :loading="searchLoading" @click="handleImageUrlSearch">搜索</el-button>
            </template>
          </el-input>
        </template>
        <template v-else-if="imageInputMode === 'upload'">
          <el-upload drag :show-file-list="false" :http-request="handleImageUpload" accept="image/*">
            <div class="upload-text">拖拽图片到此处，或点击选择文件</div>
          </el-upload>
          <div v-if="uploadedImagePreviewUrl" class="image-preview">
            <p class="image-preview__label">已选择图片：</p>
            <el-image :src="uploadedImagePreviewUrl" class="image-preview__image" fit="contain" />
          </div>
        </template>
        <template v-else>
          <el-input
            v-model="imageForm.base64"
            type="textarea"
            :rows="4"
            placeholder="粘贴图片 base64"
            class="primary-search-input"
          />
          <el-button
            type="primary"
            size="large"
            class="primary-search-button"
            :loading="searchLoading"
            @click="handleImageBase64Search"
          >
            搜索
          </el-button>
        </template>

        <el-collapse class="more-options">
          <el-collapse-item title="更多选项">
            <el-radio-group v-model="imageForm.targetModalities">
              <el-radio value="all">全部（以图搜文 + 以图搜图）</el-radio>
              <el-radio value="text">仅文字内容（以图搜文）</el-radio>
              <el-radio value="image">仅图片内容（以图搜图）</el-radio>
            </el-radio-group>
            <el-input-number v-model="imageForm.topK" :min="1" :max="100" class="mt-sm" />
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 账号 -->
      <div v-else-if="activeMode === 'account'" class="primary-input-area">
        <el-input
          v-model="accountForm.queryText"
          size="large"
          placeholder="账号名称、简介关键词，或一段语义描述"
          clearable
          class="primary-search-input"
          @keyup.enter="handleAccountSearch"
        >
          <template #append>
            <el-button type="primary" :loading="searchLoading" @click="handleAccountSearch">搜索</el-button>
          </template>
        </el-input>
        <el-collapse class="more-options">
          <el-collapse-item title="更多选项">
            <div class="options-grid">
              <el-select v-model="accountForm.platform" clearable placeholder="全部平台">
                <el-option v-for="platform in platformOptions" :key="platform" :label="platform" :value="platform" />
              </el-select>
              <el-select v-model="accountForm.accountType" clearable placeholder="全部类别">
                <el-option v-for="type in accountTypeOptions" :key="type" :label="type" :value="type" />
              </el-select>
              <el-input-number v-model="accountForm.topK" :min="1" :max="100" />
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>

      <!-- 实体 -->
      <div v-else class="primary-input-area">
        <el-input
          v-model="entityForm.keyword"
          size="large"
          placeholder="输入实体名称或别名关键词"
          clearable
          class="primary-search-input"
          @keyup.enter="handleEntitySearch"
        >
          <template #append>
            <el-button type="primary" :loading="entityLoading" @click="handleEntitySearch">搜索</el-button>
          </template>
        </el-input>
        <el-collapse class="more-options">
          <el-collapse-item title="更多选项">
            <el-select v-model="entityForm.label" clearable placeholder="全部类型">
              <el-option v-for="label in entityLabels" :key="label" :label="label" :value="label" />
            </el-select>
          </el-collapse-item>
        </el-collapse>
      </div>
    </el-card>

    <el-card class="result-panel" shadow="never">
          <template #header>
            <div v-if="activeMode === 'account'" class="result-header">
              <span>共 {{ accountResultMeta.total }} 条结果，耗时 {{ accountResultMeta.durationMs }}ms</span>
              <el-button size="small" @click="clearAccountResults">清空</el-button>
            </div>
            <div v-else-if="activeMode === 'entity'" class="result-header">
              <span>共 {{ entityResults.length }} 条结果</span>
              <el-button size="small" @click="entityResults = []">清空</el-button>
            </div>
            <div v-else class="result-header">
              <span>共 {{ resultMeta.total }} 条结果，耗时 {{ resultMeta.durationMs }}ms，检索类型：{{ resultMeta.searchType || '-' }}</span>
              <el-button size="small" @click="clearResults">清空</el-button>
            </div>
          </template>
          <div v-if="activeMode === 'account'" v-loading="searchLoading" class="result-body">
            <el-empty v-if="!searchLoading && !accountResults.length" description="暂无检索结果" />
            <div v-else class="result-list">
              <el-card v-for="item in accountResults" :key="item.id" class="result-card" shadow="hover">
                <div class="result-card__meta">
                  <div class="tag-group">
                    <el-tag :type="platformTagType(item.platform)">{{ item.platform || '-' }}</el-tag>
                    <el-tag type="info" effect="plain">{{ item.accountType || '未分类' }}</el-tag>
                    <el-tag v-if="item.verified" type="success" effect="plain">已认证</el-tag>
                    <el-tag v-if="item.isSuspended" type="danger" effect="plain">疑似封禁</el-tag>
                  </div>
                </div>
                <div class="body-text">
                  <strong>{{ item.displayName || item.handle || '-' }}</strong>
                  <span class="muted-text"> @{{ item.handle || '-' }}</span>
                </div>
                <div class="body-text">{{ item.bio || '（无简介）' }}</div>
                <div class="result-card__stats">
                  <span>粉丝 {{ item.followersCount ?? 0 }}</span>
                  <span>关注 {{ item.followingCount ?? 0 }}</span>
                  <span>发帖 {{ item.postCount ?? 0 }}</span>
                </div>
              </el-card>
            </div>
          </div>
          <div v-else-if="activeMode === 'entity'" v-loading="entityLoading" class="result-body">
            <el-empty v-if="!entityLoading && !entityResults.length" description="暂无检索结果" />
            <div v-else class="entity-result-grid">
              <el-card
                v-for="entity in entityResults"
                :key="entity.id"
                :class="['entity-result-card', { 'entity-result-card--clickable': entity.canOpenGraph }]"
                shadow="hover"
                @click="handleEntityCardClick(entity)"
              >
                <div class="entity-result-card__meta">
                  <el-tag size="small" effect="plain">{{ entity.label }}</el-tag>
                  <el-tag v-if="entity.resultType !== entity.label" size="small" type="info" effect="plain">
                    {{ entity.resultType }}
                  </el-tag>
                </div>
                <div class="entity-result-card__name">{{ entity.name }}</div>
                <div v-if="entity.description" class="entity-result-card__description">{{ entity.description }}</div>
                <div class="entity-result-card__scores">
                  <span v-if="entity.esScore !== null">关键词命中</span>
                  <span v-if="entity.similarityScore !== null">语义 {{ formatScore(entity.similarityScore) }}</span>
                  <span v-if="entity.fusionScore !== null">综合 {{ formatScore(entity.fusionScore) }}</span>
                </div>
                <div class="entity-result-card__hint">
                  {{ entity.canOpenGraph ? '点击查看图谱' : '全域融合结果' }}
                </div>
              </el-card>
            </div>
          </div>
          <div v-else v-loading="searchLoading" class="result-body">
            <el-empty
              v-if="!searchLoading && !results.length && !resultImageItems.length"
              description="暂无检索结果"
            />
            <div v-else-if="isImageResultGrid" class="image-result-grid">
              <el-card
                v-for="image in resultImageItems"
                :key="image.assetId"
                class="image-result-card"
                shadow="hover"
                @click="openContentDetailById(image.contentId)"
              >
                <div class="image-result-card__thumb">
                  <el-image :src="buildImageResultUrl(image)" fit="cover">
                    <template #error>
                      <div class="asset-error">
                        <el-icon><Picture /></el-icon>
                        <span>图片加载失败</span>
                      </div>
                    </template>
                  </el-image>
                </div>
                <div class="image-result-card__meta">
                  <div class="tag-group">
                    <el-tag size="small" :type="platformTagType(image.platform)">{{ image.platform || '-' }}</el-tag>
                    <el-tag v-if="image.similarityScore !== undefined" size="small" type="success" effect="plain">
                      相似度 {{ image.similarityScore.toFixed(3) }}
                    </el-tag>
                  </div>
                  <div class="image-result-card__title">
                    {{ image.contentTitle || image.contentBodyText || '无标题内容' }}
                  </div>
                  <div class="image-result-card__caption">
                    {{ image.contentBodyText || '点击查看所属贴文' }}
                  </div>
                </div>
              </el-card>
            </div>
            <div v-else class="result-list">
              <el-alert
                v-if="resultMeta.searchType === 'image'"
                style="margin-bottom: 12px"
                type="info"
                :closable="false"
                show-icon
              >
                <template #title>
                  以图搜索结果（共 {{ resultMeta.total }} 条）
                </template>
                <template #default>
                  结果包含「以图搜文」（图像语义匹配的文字内容）和「以图搜图」（相似图片内容）两类。
                  当前数据集中图片资产较少，主要结果来自以图搜文。
                </template>
              </el-alert>
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
                    <el-tooltip
                      v-if="getContentScore(item.id) !== null"
                      content="关键词匹配得分，仅用于同一次检索内部参考，不同检索模式之间的分值不可比较"
                      placement="top"
                    >
                      <el-tag type="warning" effect="plain">关键词 {{ getContentScore(item.id)?.toFixed(2) }}</el-tag>
                    </el-tooltip>
                    <el-tooltip
                      v-if="getSimilarityScore(item.id) !== null"
                      content="向量语义相似度，越接近1越相似"
                      placement="top"
                    >
                      <el-tag type="success" effect="plain">语义 {{ getSimilarityScore(item.id)?.toFixed(3) }}</el-tag>
                    </el-tooltip>
                    <el-tooltip
                      v-if="getFusionScore(item.id) !== null"
                      content="多路检索融合（RRF）后的综合排序分数，决定了智能融合模式的最终排序，本身没有绝对意义"
                      placement="top"
                    >
                      <el-tag type="primary" effect="plain">综合排序 {{ getFusionScore(item.id)?.toFixed(4) }}</el-tag>
                    </el-tooltip>
                  </div>
                  <span class="muted-text">{{ formatTime(item.publishTime || item.createdAt) }}</span>
                </div>

                <div class="body-text" :class="{ collapsed: !getHighlight(item.id) && !isExpanded(item.id) && getBodyText(item).length > 200 }">
                  <template v-if="getHighlight(item.id)">
                    <span
                      v-for="(fragment, idx) in getHighlight(item.id)"
                      :key="idx"
                      v-html="fragment"
                      class="highlight-fragment"
                    />
                  </template>
                  <template v-else>
                    {{ displayBodyText(item) }}
                  </template>
                </div>
                <el-button v-if="!getHighlight(item.id) && getBodyText(item).length > 200" link type="primary" @click.stop="toggleExpanded(item.id)">
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
                    <el-button size="small" type="primary" :disabled="!item.id" @click.stop="openGraphDialog('MediaContent', item.id, getBodyText(item).slice(0, 20))">查看图谱</el-button>
                  </div>
                </div>
              </el-card>
            </div>
          </div>
        </el-card>

    <el-dialog
      v-model="graphDialogVisible"
      :title="graphDialogTitle"
      width="900px"
      destroy-on-close
      @opened="handleGraphDialogOpened"
      @closed="graphDialogReady = false"
    >
      <div class="graph-hops-switcher">
        <span class="muted-text">默认只显示当前节点，按需展开查看邻近关系：</span>
        <el-radio-group :model-value="graphCurrentHops" size="small" @change="(val: string | number) => expandGraph(Number(val))">
          <el-radio-button :value="0">仅本节点</el-radio-button>
          <el-radio-button :value="1">展开1跳</el-radio-button>
          <el-radio-button :value="2">展开2跳</el-radio-button>
        </el-radio-group>
      </div>
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
  searchAccounts,
  searchByImage,
  searchByImageBase64,
  searchByImageUpload,
  searchEntitiesSemantic,
  searchGraph,
  searchHybrid,
  searchSemantic,
  searchText
} from '@/api/search'

type SearchMode = 'content' | 'account' | 'entity'
type ContentSearchMode = 'text' | 'semantic' | 'hybrid' | 'image'
type TargetModality = 'all' | 'text' | 'image'

interface SearchResult {
  items: MediaContent[]
  imageItems?: ImageResultItem[]
  total: number
  durationMs: number
  searchType: string
  highlights?: Record<string, Record<string, string[]>>
  scores?: Record<string, number>
  similarityScores?: Record<string, number>
  fusionScores?: Record<string, number>
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
  resultType: string
  description: string
  esScore: number | null
  similarityScore: number | null
  fusionScore: number | null
  canOpenGraph: boolean
}

interface ImageResultItem {
  assetId: string
  contentId: string
  sourceUrl?: string
  storageUri?: string
  minioBucket?: string
  minioKey?: string
  mimeType?: string
  width?: number
  height?: number
  similarityScore?: number
  platform?: string
  language?: string
  contentType?: string
  contentTitle?: string
  contentBodyText?: string
  publishedAt?: string
}

interface SocialAccountResult {
  id: string
  platform?: string
  handle?: string
  displayName?: string
  bio?: string
  accountType?: string
  verified?: boolean
  isSuspended?: boolean
  followersCount?: number
  followingCount?: number
  postCount?: number
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

const router = useRouter()
const activeMode = ref<SearchMode>('content')
const contentMode = ref<ContentSearchMode>('hybrid')
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
const resultImageItems = ref<ImageResultItem[]>([])
const resultHighlights = ref<Record<string, Record<string, string[]>>>({})
const resultScores = ref<Record<string, number>>({})
const resultSimilarityScores = ref<Record<string, number>>({})
const resultFusionScores = ref<Record<string, number>>({})
const expandedIds = ref<Set<string>>(new Set())
const entityResults = ref<EntityResult[]>([])
const graphData = ref<GraphData>({ nodes: [], relations: [] })
const resultMeta = reactive({
  total: 0,
  durationMs: 0,
  searchType: ''
})
const isImageResultGrid = computed(() =>
  resultImageItems.value.length > 0 && ['hybrid-image', 'image'].includes(resultMeta.searchType)
)

const platformOptions = ['x', 'telegram', 'youtube', 'news']
const languageOptions = ['zh', 'en', 'fa', 'ar', 'vi']
const entityLabels = ['Person', 'Organization', 'Event', 'Location', 'SocialAccount', 'MediaContent']
const accountTypeOptions = [
  'ordinary_user', 'news_media', 'state_affiliated_media', 'government_agency',
  'political_actor', 'political_party_or_campaign', 'military_security_agency',
  'international_organization', 'ngo_or_civil_society', 'academic_or_expert',
  'commercial_brand', 'platform_official', 'influencer_kol', 'community_group',
  'anonymous_account', 'suspected_bot_or_automated', 'unknown', 'other'
]

const accountResults = ref<SocialAccountResult[]>([])
const accountResultMeta = reactive({
  total: 0,
  durationMs: 0
})

const accountForm = reactive({
  queryText: '',
  platform: '',
  accountType: '',
  topK: 20
})

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
    imageItems: data.imageItems ?? [],
    total: data.total ?? items.length,
    durationMs: data.durationMs ?? 0,
    searchType: data.searchType ?? fallbackType,
    highlights: data.highlights,
    scores: data.scores,
    similarityScores: data.similarityScores,
    fusionScores: data.fusionScores
  }
}

const applySearchResult = (result: unknown, fallbackType: string) => {
  const normalized = normalizeResult(result, fallbackType)
  results.value = normalized.items
  resultImageItems.value = normalized.imageItems ?? []
  resultMeta.total = normalized.total
  resultMeta.durationMs = normalized.durationMs
  resultMeta.searchType = normalized.searchType
  resultHighlights.value = normalized.highlights ?? {}
  resultScores.value = normalized.scores ?? {}
  resultSimilarityScores.value = normalized.similarityScores ?? {}
  resultFusionScores.value = normalized.fusionScores ?? {}
  expandedIds.value = new Set()
}

const clearResults = () => {
  results.value = []
  resultImageItems.value = []
  resultMeta.total = 0
  resultMeta.durationMs = 0
  resultMeta.searchType = ''
  resultHighlights.value = {}
  resultScores.value = {}
  resultSimilarityScores.value = {}
  resultFusionScores.value = {}
  expandedIds.value = new Set()
}

const clearAccountResults = () => {
  accountResults.value = []
  accountResultMeta.total = 0
  accountResultMeta.durationMs = 0
}

const handleModeChange = () => {
  clearResults()
  clearAccountResults()
  entityResults.value = []
}

const handleAccountSearch = async () => {
  if (!accountForm.queryText.trim()) {
    ElMessage.warning('请输入关键词或语义描述')
    return
  }
  searchLoading.value = true
  const startedAt = Date.now()
  try {
    const data = (await searchAccounts({
      queryText: accountForm.queryText.trim(),
      platform: accountForm.platform || undefined,
      accountType: accountForm.accountType || undefined,
      topK: accountForm.topK
    })) as unknown as SocialAccountResult[]
    accountResults.value = data ?? []
    accountResultMeta.total = accountResults.value.length
    accountResultMeta.durationMs = Date.now() - startedAt
  } catch {
    ElMessage.error('检索失败')
  } finally {
    searchLoading.value = false
  }
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

const handleHybridImageUpload = async (options: UploadRequestOptions) => {
  clearUploadedImagePreview()
  uploadedImagePreviewUrl.value = URL.createObjectURL(options.file as File)

  const formData = new FormData()
  formData.append('file', options.file)
  formData.append('topK', String(hybridForm.topK))
  formData.append('targetModalities', hybridForm.targetModalities)
  searchLoading.value = true
  try {
    const result = await searchByImageUpload(formData)
    applySearchResult(result, 'image')
    options.onSuccess?.(result)
  } catch (error) {
    ElMessage.error('图片上传检索失败')
    options.onError?.(error as any)
  } finally {
    searchLoading.value = false
  }
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
    'image'
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
    'image'
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
    applySearchResult(result, 'image')
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
    const result = await searchEntitiesSemantic({
      keyword: entityForm.keyword.trim(),
      entityType: entityForm.label || undefined,
      topK: 10
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
  const resultType = String(data.resultType ?? data.label ?? data.entityType ?? '-')
  const label = String(data.label ?? data.entityType ?? resultType)
  const name = String(
    data.canonicalName ??
      data.canonical_name ??
      data.displayName ??
      data.handle ??
      data.title ??
      data.platformContentId ??
      data.platform_content_id ??
      data.name ??
      '-'
  )
  return {
    id: String(data.id ?? index),
    label,
    name,
    resultType,
    description: entityDescription(data),
    esScore: numericOrNull(data.esScore),
    similarityScore: numericOrNull(data.similarityScore),
    fusionScore: numericOrNull(data.fusionScore),
    canOpenGraph: ['Person', 'Organization', 'Event', 'Location', 'SocialAccount', 'MediaContent'].includes(label)
  }
}

const numericOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const entityDescription = (data: Record<string, unknown>): string => {
  const resultType = String(data.resultType ?? data.label ?? data.entityType ?? '')
  if (resultType === 'SocialAccount') {
    const handle = data.handle ? `@${data.handle}` : ''
    const platform = data.platform ? String(data.platform) : ''
    return [platform, handle, data.bio].filter(Boolean).join(' · ')
  }
  if (resultType === 'MediaContent') {
    const platform = data.platform ? String(data.platform) : ''
    const language = data.language ? String(data.language) : ''
    return [platform, language, data.bodyText].filter(Boolean).join(' · ')
  }
  const aliases = Array.isArray(data.aliases) ? data.aliases.slice(0, 3).join(' / ') : ''
  return aliases ? `别名：${aliases}` : ''
}

const formatScore = (score: number): string => {
  if (!Number.isFinite(score)) return '-'
  if (Math.abs(score) >= 100) return score.toFixed(0)
  if (Math.abs(score) >= 10) return score.toFixed(2)
  return score.toFixed(3)
}

const handleEntityCardClick = (entity: EntityResult) => {
  if (!entity.canOpenGraph) return
  openGraphDialog(entity.label, entity.id, entity.name)
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

const getHighlight = (contentId: string): string[] | null => {
  const highlight = resultHighlights.value[contentId]
  if (!highlight) return null
  return highlight.body_text ?? highlight.title ?? null
}

const getContentScore = (contentId: string): number | null => {
  const score = resultScores.value[contentId]
  return score === undefined ? null : score
}

const getSimilarityScore = (contentId: string): number | null => {
  const score = resultSimilarityScores.value[contentId]
  return score === undefined ? null : score
}

const getFusionScore = (contentId: string): number | null => {
  const score = resultFusionScores.value[contentId]
  return score === undefined ? null : score
}

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

const openContentDetail = async (item: MediaContent) => {
  await openContentDetailById(item.id)
}

const openContentDetailById = async (contentId?: string) => {
  if (!contentId) return
  contentDetailVisible.value = true
  contentDetailLoading.value = true
  contentDetail.value = null
  try {
    contentDetail.value = (await getContentDetail(contentId)) as unknown as ContentDetail
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

const buildImageResultUrl = (image: ImageResultItem): string => {
  if (image.minioKey && image.minioBucket) {
    return `http://172.16.40.232:9000/${image.minioBucket}/${image.minioKey}`
  }
  return image.sourceUrl || image.storageUri || ''
}

const imageAssetUrls = (assets: MediaAsset[]): string[] =>
  assets.filter(asset => asset.assetType === 'image').map(buildAssetUrl).filter(Boolean)

const hasPropagation = (prop?: ContentPropagation | null): boolean =>
  Boolean(prop && (prop.parent || prop.repostOf || prop.quotedContent))

const graphCurrentLabel = ref('')
const graphCurrentId = ref('')
const graphCurrentName = ref('')
const graphCurrentHops = ref(0)

const graphDialogTitle = computed(() => {
  const labelText = graphCurrentLabel.value || '节点'
  const nameText = graphCurrentName.value ? `「${graphCurrentName.value}」` : ''
  const hopsText = graphCurrentHops.value === 0 ? '' : `· ${graphCurrentHops.value}跳邻近关系`
  return `${labelText}${nameText} ${hopsText}`.trim()
})

const openGraphDialog = async (label: string, id: string, name?: string) => {
  graphCurrentLabel.value = label
  graphCurrentId.value = id
  graphCurrentName.value = name ?? ''
  graphCurrentHops.value = 0
  graphDialogReady.value = false
  graphData.value = { nodes: [], relations: [] }
  graphDialogVisible.value = true
  await fetchGraph(0)
}

const expandGraph = async (hops: number) => {
  await fetchGraph(hops)
}

const fetchGraph = async (hops: number) => {
  graphLoading.value = true
  try {
    graphData.value = (await searchGraph(
      graphCurrentLabel.value,
      graphCurrentId.value,
      hops
    )) as unknown as GraphData
    graphCurrentHops.value = hops
  } catch {
    ElMessage.error('加载图谱失败')
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
  { name: 'Organization', itemStyle: { color: '#7c3aed' } },
  { name: 'Event', itemStyle: { color: '#dc2626' } },
  { name: 'Location', itemStyle: { color: '#16a34a' } },
  { name: 'MediaContent', itemStyle: { color: '#6b7280' } },
  { name: 'MediaAsset', itemStyle: { color: '#9ca3af' } }
]

const activeGraphCategories = computed(() => {
  const presentLabels = new Set(graphData.value.nodes.map(node => node.label))
  return graphCategories.filter(category => presentLabels.has(category.name))
})

const activeLabelIndexMap = computed(
  () => new Map(activeGraphCategories.value.map((item, index) => [item.name, index]))
)
const hasGraphData = computed(() => graphData.value.nodes.length > 0)

const truncateText = (value: unknown, maxLength = 24): string => {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1)}…`
}

const getNodeDisplayName = (node: GraphNode) => {
  const props = node.properties ?? {}
  const name =
    props.canonicalName ??
    props.canonicalLabel ??
    props.displayName ??
    props.handle ??
    props.title ??
    props.platformContentId
  return String(name ?? node.id)
}

const getNodeGraphName = (node: GraphNode) => {
  const props = node.properties ?? {}
  if (node.label === 'MediaContent') {
    const contentId = props.platformContentId ?? props.platform_content_id
    if (contentId) return `内容 ${truncateText(contentId, 14)}`
    return truncateText(props.title ?? props.bodyText ?? node.id, 18)
  }
  if (node.label === 'MediaAsset') {
    return `素材 ${truncateText(props.assetType ?? node.id, 12)}`
  }
  return truncateText(getNodeDisplayName(node), 24)
}

const TOOLTIP_PROPERTY_LABELS: Record<string, string> = {
  platformContentId: '内容ID',
  title: '标题',
  bodyText: '正文',
  entityType: '实体类型',
  importanceScore: '重要性',
  platform: '平台',
  language: '语言',
  contentType: '内容类型',
  publishedAt: '发布时间',
  accountType: '账号类别',
  bio: '简介',
  handle: 'handle',
  verified: '是否认证'
}

const buildNodeTooltip = (node: GraphNode): string => {
  const props = node.properties ?? {}
  const lines = [`<strong>${node.label}</strong>：${getNodeDisplayName(node)}`]
  for (const [key, label] of Object.entries(TOOLTIP_PROPERTY_LABELS)) {
    const value = props[key]
    if (value !== undefined && value !== null && value !== '') {
      lines.push(`${label}：${truncateText(value, key === 'bodyText' ? 120 : 80)}`)
    }
  }
  return lines.join('<br/>')
}

const graphOption = computed(() => {
  if (!hasGraphData.value) return {}
  const nodeTooltips = new Map(graphData.value.nodes.map(node => [node.id, buildNodeTooltip(node)]))
  return {
    tooltip: {
      formatter: (params: { dataType?: string; data?: { id?: string; type?: string } }) => {
        if (params.dataType === 'edge') return params.data?.type || ''
        return (params.data?.id ? nodeTooltips.get(params.data.id) : null) || ''
      }
    },
    legend: [{ data: activeGraphCategories.value.map(item => item.name), bottom: 0 }],
    series: [
      {
        type: 'graph',
        layout: 'force',
        draggable: true,
        roam: true,
        categories: activeGraphCategories.value,
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
          name: getNodeGraphName(node),
          symbolSize: node.label === 'MediaContent' ? 40 : 24,
          category: activeLabelIndexMap.value.get(node.label) ?? 0,
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

.muted-text {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.scope-switcher {
  display: flex;
  justify-content: center;
}

.primary-search-card :deep(.el-card__body) {
  padding: 24px 32px;
}

.content-mode-switcher {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.primary-input-area {
  max-width: 720px;
  margin: 0 auto;
}

.primary-search-input :deep(.el-input__wrapper),
.primary-search-input :deep(.el-textarea__inner) {
  font-size: 15px;
}

.primary-search-input {
  display: block;
}

.primary-search-button {
  display: block;
  width: 100%;
  margin-top: 12px;
}

.hybrid-upload-button {
  display: inline-flex;
  align-items: center;
}

.hybrid-upload-button :deep(.el-upload) {
  display: inline-flex;
  align-items: center;
}

.hybrid-image-preview {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
  color: #6b7280;
  font-size: 12px;
}

.hybrid-image-preview :deep(.el-image) {
  width: 52px;
  height: 52px;
  border-radius: 6px;
  overflow: hidden;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
}

.image-source-switcher {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.more-options {
  margin-top: 16px;
  border: none;
}

.more-options :deep(.el-collapse-item__header) {
  font-size: 13px;
  color: #6b7280;
  border: none;
  justify-content: center;
}

.more-options :deep(.el-collapse-item__wrap),
.more-options :deep(.el-collapse-item__content) {
  border: none;
  padding-bottom: 4px;
}

.options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.mt-sm {
  margin-top: 12px;
}

.image-result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.image-result-card {
  cursor: pointer;
  overflow: hidden;
}

.image-result-card :deep(.el-card__body) {
  padding: 0;
}

.image-result-card__thumb {
  width: 100%;
  aspect-ratio: 4 / 3;
  background: #f3f4f6;
}

.image-result-card__thumb :deep(.el-image) {
  width: 100%;
  height: 100%;
  display: block;
}

.image-result-card__meta {
  padding: 10px;
}

.image-result-card__title {
  margin-top: 8px;
  color: #111827;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.image-result-card__caption {
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entity-result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.entity-result-card {
  transition: transform 0.15s ease;
}

.entity-result-card--clickable {
  cursor: pointer;
}

.entity-result-card--clickable:hover {
  transform: translateY(-2px);
}

.entity-result-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.entity-result-card__name {
  margin-top: 8px;
  font-weight: 500;
}

.entity-result-card__description {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.entity-result-card__scores {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.entity-result-card__hint {
  margin-top: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.switch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
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

:deep(.highlight) {
  padding: 0 2px;
  border-radius: 2px;
  background-color: #fef08a;
  color: #1e293b;
  font-style: normal;
}

.highlight-fragment {
  display: block;
  margin-bottom: 4px;
  line-height: 1.6;
}

.highlight-fragment + .highlight-fragment::before {
  margin-right: 4px;
  color: #94a3b8;
  content: '...';
}

.result-card__stats {
  margin: 12px 0;
  font-size: 13px;
  color: #4b5563;
}

.graph-hops-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.graph-dialog-body {
  height: 560px;
}

.graph-chart,
.graph-empty {
  width: 100%;
  height: 540px;
}

@media (max-width: 768px) {
  .primary-search-card :deep(.el-card__body) {
    padding: 16px;
  }

  .options-grid {
    grid-template-columns: 1fr;
  }
}
</style>
