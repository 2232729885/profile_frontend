<template>
  <div class="search-view">
    <div class="page-header">
      <div>
        <h1>综合检索</h1>
        <p class="page-subtitle">跨平台检索文本、图片、音频和视频内容</p>
      </div>
      <el-radio-group v-model="activeMode" class="mode-tabs" size="large" @change="handleModeChange">
        <el-radio-button value="content">内容</el-radio-button>
        <el-radio-button value="account">账号</el-radio-button>
        <el-radio-button value="entity">实体</el-radio-button>
      </el-radio-group>
    </div>

    <el-card class="primary-search-card" shadow="never">
      <!-- 内容 -->
      <div v-if="activeMode === 'content'" class="primary-input-area content-search-area">
        <div class="primary-search-row">
          <div class="primary-search-box">
            <input
              v-model="hybridForm.queryText"
              class="primary-search-native-input"
              placeholder="搜索内容、事件、账号线索，或上传图片"
              type="text"
              autocomplete="off"
              @keyup.enter="handleHybridSearch"
            />
            <button
              v-if="hybridForm.queryText"
              class="primary-search-clear"
              type="button"
              title="清空"
              @click="hybridForm.queryText = ''"
            >
              ×
            </button>
            <el-upload
              class="hybrid-upload-button primary-search-upload"
              :show-file-list="false"
              :http-request="handleHybridImageUpload"
              accept="image/*"
            >
              <el-button :icon="Picture" circle text title="上传图片搜索" />
            </el-upload>
          </div>
          <el-button
            type="primary"
            class="primary-search-button"
            :icon="Search"
            :loading="searchLoading"
            title="搜索"
            aria-label="搜索"
            @click="handleHybridSearch"
          >
            搜索
          </el-button>
        </div>
        <div v-if="uploadedImagePreviewUrl" class="hybrid-image-preview">
          <el-image :src="uploadedImagePreviewUrl" fit="cover" />
          <span>已用上传图片检索，可继续输入文字或换图</span>
        </div>
        <div class="content-filter-panel">
          <div class="filter-row filter-row--quick">
            <el-select v-model="hybridForm.platform" clearable placeholder="全部平台">
              <el-option v-for="platform in platformOptions" :key="platform" :label="platform" :value="platform" />
            </el-select>
            <el-select v-model="hybridForm.language" clearable placeholder="全部语言">
              <el-option v-for="language in languageOptions" :key="language" :label="language" :value="language" />
            </el-select>
            <el-button class="advanced-toggle" plain @click="advancedFilterVisible = !advancedFilterVisible">
              高级筛选
              <el-icon :class="['advanced-toggle__icon', { 'is-open': advancedFilterVisible }]"><ArrowDown /></el-icon>
            </el-button>
          </div>
          <div class="filter-chip-row">
            <span class="filter-chip-label">检索方式</span>
            <div class="chip-group">
              <button
                type="button"
                :class="['filter-chip', { 'is-active': hybridForm.enableEs }]"
                :aria-pressed="hybridForm.enableEs"
                @click="hybridForm.enableEs = !hybridForm.enableEs"
              >
                关键词
              </button>
              <button
                type="button"
                :class="['filter-chip', { 'is-active': hybridForm.enableMilvus }]"
                :aria-pressed="hybridForm.enableMilvus"
                @click="hybridForm.enableMilvus = !hybridForm.enableMilvus"
              >
                语义
              </button>
              <button
                type="button"
                :class="['filter-chip', { 'is-active': hybridForm.enableNeo4j }]"
                :aria-pressed="hybridForm.enableNeo4j"
                @click="hybridForm.enableNeo4j = !hybridForm.enableNeo4j"
              >
                实体关联
              </button>
            </div>
          </div>
          <div class="filter-chip-row">
            <span class="filter-chip-label">内容类型</span>
            <el-radio-group v-model="hybridForm.targetModalities" class="target-radio-group">
              <el-radio-button value="all">全部</el-radio-button>
              <el-radio-button value="text">文本</el-radio-button>
              <el-radio-button value="image">图片</el-radio-button>
              <el-radio-button value="video">视频</el-radio-button>
              <el-radio-button value="audio">音频</el-radio-button>
            </el-radio-group>
          </div>
          <transition name="advanced-filter">
            <div v-show="advancedFilterVisible" class="advanced-filter-panel">
              <div class="threshold-group">
                <div class="option-control option-control--slider">
                  <span class="option-control__label">
                    <span>语义相似度</span>
                    <strong>{{ hybridForm.semanticMinScore.toFixed(2) }}</strong>
                  </span>
                  <el-slider v-model="hybridForm.semanticMinScore" :min="0" :max="1" :step="0.01" />
                  <span class="option-control__hint">控制贴文、OCR 和语音文本的语义匹配精度</span>
                </div>
                <div class="option-control option-control--slider">
                  <span class="option-control__label">
                    <span>视觉相似度</span>
                    <strong>{{ hybridForm.visualMinScore.toFixed(2) }}</strong>
                  </span>
                  <el-slider v-model="hybridForm.visualMinScore" :min="0" :max="1" :step="0.01" />
                  <span class="option-control__hint">控制图片和视频画面的向量匹配精度</span>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- 账号 -->
      <div v-else-if="activeMode === 'account'" class="primary-input-area">
        <div class="primary-search-row">
          <div class="primary-search-box">
            <input
              v-model="accountForm.queryText"
              class="primary-search-native-input"
              placeholder="账号名称、简介关键词，或一段语义描述"
              type="text"
              autocomplete="off"
              @keyup.enter="handleAccountSearch"
            />
            <button
              v-if="accountForm.queryText"
              class="primary-search-clear"
              type="button"
              title="清空"
              @click="accountForm.queryText = ''"
            >
              ×
            </button>
          </div>
          <el-button
            type="primary"
            class="primary-search-button"
            :icon="Search"
            :loading="searchLoading"
            title="搜索"
            aria-label="搜索"
            @click="handleAccountSearch"
          >
            搜索
          </el-button>
        </div>
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
        <div class="primary-search-row">
          <div class="primary-search-box">
            <input
              v-model="entityForm.keyword"
              class="primary-search-native-input"
              placeholder="输入实体名称或别名关键词"
              type="text"
              autocomplete="off"
              @keyup.enter="handleEntitySearch"
            />
            <button
              v-if="entityForm.keyword"
              class="primary-search-clear"
              type="button"
              title="清空"
              @click="entityForm.keyword = ''"
            >
              ×
            </button>
          </div>
          <el-button
            type="primary"
            class="primary-search-button"
            :icon="Search"
            :loading="entityLoading"
            title="搜索"
            aria-label="搜索"
            @click="handleEntitySearch"
          >
            搜索
          </el-button>
        </div>
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
              <span>{{ accountResultMeta.total }} 条结果 · {{ accountResultMeta.durationMs }}ms</span>
              <div class="result-header__actions">
                <el-button size="small" @click="clearAccountResults">清空</el-button>
              </div>
            </div>
            <div v-else-if="activeMode === 'entity'" class="result-header">
              <span>{{ entityResults.length }} 条结果</span>
              <div class="result-header__actions">
                <el-button size="small" @click="entityResults = []">清空</el-button>
              </div>
            </div>
            <div v-else class="result-header">
              <span>{{ resultMeta.total }} 条结果 · {{ resultMeta.durationMs }}ms · {{ resultMeta.searchType || '待检索' }}</span>
              <div class="result-header__actions">
                <el-select
                  :model-value="contentPageSize"
                  size="small"
                  class="page-size-select"
                  @change="handleContentPageSizeChange"
                >
                  <el-option :value="10" label="每页 10 条" />
                  <el-option :value="20" label="每页 20 条" />
                  <el-option :value="50" label="每页 50 条" />
                  <el-option :value="100" label="每页 100 条" />
                </el-select>
                <el-button size="small" @click="clearResults">清空</el-button>
              </div>
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
            <div
              v-if="!searchLoading && !resultContentHits.length"
              class="search-empty-state"
            >
              <el-icon class="search-empty-state__icon"><Search /></el-icon>
              <h2>{{ hasContentSearched ? '没有找到相关结果' : '开始一次综合检索' }}</h2>
              <p>
                {{
                  hasContentSearched
                    ? '尝试降低语义或视觉阈值，或减少平台、语言、内容类型等筛选条件。'
                    : '输入关键词、完整句子，或上传一张图片，系统将同时检索文本和关联媒体资源。'
                }}
              </p>
              <div v-if="!hasContentSearched" class="search-empty-state__examples">
                <button type="button" @click="applyContentExample('霍尔木兹海峡油轮')">霍尔木兹海峡油轮</button>
                <button type="button" @click="applyContentExample('电影票房下降')">电影票房下降</button>
                <button type="button" @click="applyContentExample('Another pandemic release')">Another pandemic release</button>
              </div>
            </div>
            <div v-else class="mixed-result-layout">
              <div v-if="resultContentHits.length" class="result-list">
                <el-card
                  v-for="hit in resultContentHits"
                  :key="hit.contentId"
                  :class="[
                    'result-card',
                    'content-hit-card',
                    `content-hit-card--${hit.displaySuggestion?.toLowerCase() || 'text_first'}`,
                    mediaStrengthClass(hit)
                  ]"
                  shadow="hover"
                  @click="openContentDetailById(hit.contentId)"
                >
                  <div class="content-hit-layout">
                    <div
                      v-if="hit.primaryAsset && hit.displaySuggestion === 'MEDIA_FIRST'"
                      class="content-hit-media content-hit-media--lead"
                    >
                      <div class="content-hit-media__label">
                        命中{{ mediaTypeLabel(hit.primaryAsset.mediaType) }}
                      </div>
                      <component
                        :is="mediaPreviewComponent(hit.primaryAsset)"
                        v-bind="mediaPreviewProps(hit.primaryAsset)"
                        class="content-hit-media__preview"
                        controls
                        preload="metadata"
                        fit="cover"
                      >
                        <template v-if="isImageAsset(hit.primaryAsset)" #error>
                          <div class="asset-error">
                            <el-icon><Picture /></el-icon>
                            <span>媒体加载失败</span>
                          </div>
                        </template>
                      </component>
                      <div v-if="formatSegment(hit.primaryAsset)" class="content-hit-media__segment">
                        {{ formatSegment(hit.primaryAsset) }}
                      </div>
                    </div>

                    <div class="content-hit-main">
                      <div class="content-hit-topline">
                        <div class="content-hit-source">
                          {{ contentHitSourceMeta(hit) }}
                        </div>
                        <div class="content-hit-match-summary">
                          <span class="match-chip match-chip--muted">{{ displaySuggestionLabel(hit.displaySuggestion) }}</span>
                          <span v-if="dominantContributionLabel(hit)" class="match-chip match-chip--muted">{{ dominantContributionLabel(hit) }}</span>
                          <span :class="['match-chip', relevanceClass(hit)]">{{ relevanceLabel(hit) }}</span>
                        </div>
                      </div>
                      <div class="content-hit-time">
                        {{ formatTime(contentHitPost(hit)?.publishedAt || contentHitPost(hit)?.publishTime || contentHitPost(hit)?.createdAt) }}
                      </div>

                      <div v-if="displayContentHitTitle(hit)" class="content-hit-title">
                        {{ displayContentHitTitle(hit) }}
                      </div>

                      <div
                        class="body-text"
                        :class="{ collapsed: !isExpanded(hit.contentId) && shouldCollapseContentHit(hit) }"
                      >
                        <template v-if="getHighlight(hit.contentId) && !isExpanded(hit.contentId)">
                          <span
                            v-for="(fragment, idx) in getHighlight(hit.contentId)"
                            :key="idx"
                            v-html="fragment"
                            class="highlight-fragment"
                          />
                        </template>
                        <template v-else>
                          {{ displayContentHitBodyText(hit) }}
                        </template>
                      </div>
                      <el-button
                        v-if="shouldShowContentExpand(hit)"
                        link
                        type="primary"
                        @click.stop="toggleExpanded(hit.contentId)"
                      >
                        {{ isExpanded(hit.contentId) ? '收起' : '展开' }}
                      </el-button>

                      <div v-if="hit.primaryAsset && hit.displaySuggestion !== 'MEDIA_FIRST'" class="content-hit-inline-media">
                        <div class="content-hit-inline-media__thumb">
                          <component
                            :is="mediaPreviewComponent(hit.primaryAsset)"
                            v-bind="mediaPreviewProps(hit.primaryAsset)"
                            controls
                            preload="metadata"
                            fit="cover"
                          />
                        </div>
                        <div>
                          <div class="content-hit-inline-media__title">
                            {{ mediaEvidenceLabel(hit.primaryAsset, hit.evidences) }}
                          </div>
                          <div class="muted-text">{{ formatSegment(hit.primaryAsset) || '点击查看所属贴文详情' }}</div>
                        </div>
                      </div>

                      <div v-if="evidenceSummaryLabels(hit).length || hit.matchedAssets?.length" class="content-hit-evidence-summary">
                        <div v-if="evidenceSummaryLabels(hit).length" class="content-hit-evidence-summary__main">
                          <el-icon><Search /></el-icon>
                          <span>命中证据：{{ evidenceSummaryLabels(hit).join(' · ') }}</span>
                        </div>
                        <span v-if="hit.matchedAssets?.length" class="media-count">
                          <el-icon><Picture /></el-icon>
                          {{ hit.matchedAssets.length }} 个匹配媒体
                        </span>
                      </div>

                      <div class="result-card__stats">
                        <span>作者：@{{ contentHitPost(hit)?.authorPlatformUserId || '-' }}</span>
                        <span>赞 {{ contentHitPost(hit)?.likeCount ?? 0 }}</span>
                        <span>评 {{ contentHitPost(hit)?.commentCount ?? 0 }}</span>
                        <span>转 {{ contentHitPost(hit)?.repostCount ?? 0 }}</span>
                      </div>

                      <div class="result-card__footer">
                        <div class="hashtag-list">
                          <el-tag v-for="tag in getHashtags(contentHitPost(hit) || emptyContent)" :key="tag" size="small" type="info" effect="plain">#{{ tag }}</el-tag>
                        </div>
                        <div class="result-card__actions">
                          <el-button
                            v-if="hit.primaryAsset"
                            size="small"
                            @click.stop="openPrimaryAsset(hit)"
                          >
                            {{ primaryAssetActionLabel(hit) }}
                          </el-button>
                          <el-button size="small" @click.stop="openContentDetailById(hit.contentId)">查看详情</el-button>
                          <el-button size="small" :disabled="!hit.contentId" @click.stop="openGraphDialog('MediaContent', hit.contentId, contentHitTitle(hit) || contentHitBodyText(hit).slice(0, 20))">查看图谱</el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </el-card>
              </div>
            <el-pagination
              v-if="showContentPagination"
              class="result-pagination"
              background
              :current-page="contentPage + 1"
              :page-size="contentPageSize"
              :total="resultMeta.total"
              layout="prev, pager, next"
              @current-change="handleContentPageChange"
            />
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
import { computed, nextTick, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import VChart from 'vue-echarts'
import type { UploadRequestOptions } from 'element-plus'
import { ElMessage } from 'element-plus'
import { ArrowDown, Picture, Search, VideoPlay } from '@element-plus/icons-vue'
import { getContentDetail } from '@/api/ingestion'
import {
  searchAccounts,
  searchByImageUpload,
  searchEntitiesSemantic,
  searchGraph,
  searchHybrid
} from '@/api/search'

type SearchMode = 'content' | 'account' | 'entity'
type TargetModality = 'all' | 'text' | 'image' | 'video' | 'audio'
type ContentSearchReplay = 'content' | 'content-upload'

interface SearchResult {
  contentHits?: ContentHit[]
  total: number
  durationMs: number
  searchType: string
  highlights?: Record<string, Record<string, string[]>>
}

interface MediaContent {
  id: string
  platform?: string
  language?: string
  contentType?: string
  title?: string
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

interface ContributionSide {
  rrfScore?: number
  ratio?: number
}

interface ContentContribution {
  text?: ContributionSide
  media?: ContributionSide
}

interface AssetHit {
  entityId?: string
  assetId?: string
  contentId?: string
  mediaType?: string
  previewUrl?: string
  sourceUrl?: string
  storageUri?: string
  minioBucket?: string
  minioKey?: string
  mimeType?: string
  width?: number
  height?: number
  segmentStartMs?: number
  segmentEndMs?: number
  previewTimeMs?: number
  rrfContribution?: number
}

interface SearchEvidence {
  channel: string
  category: string
  rank?: number
  rrfContribution?: number
  rawScore?: number
  hitField?: string
  contentId?: string
  assetId?: string
  entityId?: string
}

interface ContentHit {
  contentId: string
  rrfScore?: number
  dominantHitType?: 'TEXT' | 'MEDIA_ASSET' | 'MIXED' | string
  displaySuggestion?: 'TEXT_FIRST' | 'MEDIA_FIRST' | 'MIXED' | string
  contribution?: ContentContribution
  primaryAsset?: AssetHit | null
  matchedAssets?: AssetHit[]
  evidences: SearchEvidence[]
  post?: MediaContent | null
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
const uploadedImagePreviewUrl = ref('')
const advancedFilterVisible = ref(false)
const searchLoading = ref(false)
const entityLoading = ref(false)
const graphLoading = ref(false)
const graphDialogVisible = ref(false)
const graphDialogReady = ref(false)
const contentDetailVisible = ref(false)
const contentDetailLoading = ref(false)
const contentDetail = ref<ContentDetail | null>(null)
const resultContentHits = ref<ContentHit[]>([])
const contentPage = ref(0)
const contentPageSize = ref(10)
const lastContentSearchKind = ref<ContentSearchReplay | null>(null)
const lastUploadedSearchFile = ref<File | null>(null)
const resultHighlights = ref<Record<string, Record<string, string[]>>>({})
const expandedIds = ref<Set<string>>(new Set())
const entityResults = ref<EntityResult[]>([])
const graphData = ref<GraphData>({ nodes: [], relations: [] })
const resultMeta = reactive({
  total: 0,
  durationMs: 0,
  searchType: ''
})
const showContentPagination = computed(() =>
  activeMode.value === 'content' && resultMeta.total > contentPageSize.value
)
const hasContentSearched = computed(() => Boolean(lastContentSearchKind.value))

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

const emptyContent: MediaContent = { id: '' }

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

const hybridForm = reactive({
  queryText: '',
  platform: '',
  language: '',
  enableEs: true,
  enableMilvus: true,
  enableNeo4j: false,
  targetModalities: 'all' as TargetModality,
  semanticMinScore: 0.45,
  visualMinScore: 0.9
})

const clearUploadedImagePreview = () => {
  if (uploadedImagePreviewUrl.value) {
    URL.revokeObjectURL(uploadedImagePreviewUrl.value)
    uploadedImagePreviewUrl.value = ''
  }
}

const normalizeResult = (result: unknown, fallbackType: string): SearchResult => {
  if (Array.isArray(result)) {
    return { contentHits: [], total: result.length, durationMs: 0, searchType: fallbackType }
  }
  const data = result as Partial<SearchResult>
  const contentHits = data.contentHits ?? []
  return {
    contentHits,
    total: data.total ?? contentHits.length,
    durationMs: data.durationMs ?? 0,
    searchType: data.searchType ?? fallbackType,
    highlights: data.highlights
  }
}

const applySearchResult = (result: unknown, fallbackType: string) => {
  const normalized = normalizeResult(result, fallbackType)
  resultContentHits.value = normalized.contentHits ?? []
  resultMeta.total = normalized.total
  resultMeta.durationMs = normalized.durationMs
  resultMeta.searchType = normalized.searchType
  resultHighlights.value = normalized.highlights ?? {}
  expandedIds.value = new Set()
}

const clearResults = () => {
  resultContentHits.value = []
  contentPage.value = 0
  lastContentSearchKind.value = null
  lastUploadedSearchFile.value = null
  resultMeta.total = 0
  resultMeta.durationMs = 0
  resultMeta.searchType = ''
  resultHighlights.value = {}
  expandedIds.value = new Set()
}

const applyContentExample = (queryText: string) => {
  hybridForm.queryText = queryText
  handleHybridSearch()
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

const shouldResetPage = (resetPage: boolean | Event = true) => resetPage !== false

const handleHybridSearch = async (resetPage: boolean | Event = true) => {
  if (!hybridForm.queryText.trim()) {
    ElMessage.warning('请输入查询文本')
    return
  }
  if (shouldResetPage(resetPage)) contentPage.value = 0
  lastContentSearchKind.value = 'content'
  await runSearch(
    () =>
      searchHybrid({
        queryText: hybridForm.queryText.trim() || undefined,
        platform: hybridForm.platform || undefined,
        language: hybridForm.language || undefined,
        page: contentPage.value,
        size: contentPageSize.value,
        enableEs: hybridForm.enableEs,
        enableMilvus: hybridForm.enableMilvus,
        enableNeo4j: hybridForm.enableNeo4j,
        targetModalities: hybridForm.targetModalities,
        semanticMinScore: hybridForm.semanticMinScore,
        visualMinScore: hybridForm.visualMinScore
      }),
    'hybrid'
  )
}

const fetchUploadedImageSearch = (file: File, targetModalities: TargetModality) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('targetModalities', targetModalities)
  formData.append('page', String(contentPage.value))
  formData.append('size', String(contentPageSize.value))
  formData.append('visualMinScore', String(hybridForm.visualMinScore))
  return searchByImageUpload(formData)
}

const handleHybridImageUpload = async (options: UploadRequestOptions) => {
  clearUploadedImagePreview()
  const file = options.file as File
  uploadedImagePreviewUrl.value = URL.createObjectURL(file)
  contentPage.value = 0
  lastContentSearchKind.value = 'content-upload'
  lastUploadedSearchFile.value = file

  searchLoading.value = true
  try {
    const result = await fetchUploadedImageSearch(file, hybridForm.targetModalities)
    applySearchResult(result, 'image')
    options.onSuccess?.(result)
  } catch (error) {
    ElMessage.error('图片上传检索失败')
    options.onError?.(error as any)
  } finally {
    searchLoading.value = false
  }
}

const rerunUploadedImageSearch = async () => {
  const file = lastUploadedSearchFile.value
  if (!file) {
    ElMessage.warning('请重新选择图片')
    return
  }
  await runSearch(() => fetchUploadedImageSearch(file, hybridForm.targetModalities), 'image')
}

const rerunCurrentContentSearch = async () => {
  switch (lastContentSearchKind.value) {
    case 'content':
      await handleHybridSearch(false)
      break
    case 'content-upload':
      await rerunUploadedImageSearch()
      break
  }
}

const handleContentPageChange = async (page: number) => {
  contentPage.value = Math.max(page - 1, 0)
  await rerunCurrentContentSearch()
}

const handleContentPageSizeChange = async (size: number) => {
  contentPageSize.value = size
  contentPage.value = 0
  await rerunCurrentContentSearch()
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

const isExpanded = (id: string) => expandedIds.value.has(id)

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

const contentHitPost = (hit: ContentHit): MediaContent | null => {
  return hit.post ?? null
}

const contentHitTitle = (hit: ContentHit): string => {
  const post = contentHitPost(hit)
  return post?.title || ''
}

const contentHitBodyText = (hit: ContentHit): string => {
  const post = contentHitPost(hit)
  return post ? getBodyText(post) : ''
}

const normalizePreviewText = (text: string): string =>
  text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

const compactPreviewText = (text: string, maxLength: number): string => {
  const normalized = normalizePreviewText(text)
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength).trim()}...`
}

const looksLikeLongTextTitle = (title: string): boolean => {
  const normalized = normalizePreviewText(title)
  return normalized.length > 80 || /https?:\/\//i.test(title) || normalized.split(/[，,。.\s]+/).length > 18
}

const isTextRepeated = (a: string, b: string): boolean => {
  const left = normalizePreviewText(a)
  const right = normalizePreviewText(b)
  if (!left || !right) return false
  return left === right || right.startsWith(left) || left.startsWith(right)
}

const displayContentHitTitle = (hit: ContentHit): string => {
  const title = contentHitTitle(hit)
  if (title && !looksLikeLongTextTitle(title)) return title
  const source = title || contentHitBodyText(hit)
  const shortTitle = compactPreviewText(source, 34)
  return shortTitle || contentTypeLabel(contentHitPost(hit)?.contentType)
}

const displayContentHitBodyText = (hit: ContentHit): string => {
  const body = contentHitBodyText(hit)
  if (isExpanded(hit.contentId)) return body
  const title = contentHitTitle(hit)
  let summary = body
  if (title && isTextRepeated(title, body)) {
    const normalizedBody = normalizePreviewText(body)
    const normalizedTitle = normalizePreviewText(title)
    summary = normalizedBody.startsWith(normalizedTitle)
      ? normalizedBody.slice(normalizedTitle.length)
      : normalizedBody
  }
  if (!normalizePreviewText(summary)) {
    summary = body || title
  }
  return compactPreviewText(summary, 180)
}

const shouldCollapseContentHit = (hit: ContentHit): boolean => {
  return contentHitBodyText(hit).length > 180 || Boolean(getHighlight(hit.contentId)?.length)
}

const shouldShowContentExpand = (hit: ContentHit): boolean => {
  return contentHitBodyText(hit).length > 180 || Boolean(getHighlight(hit.contentId)?.length)
}

const formatRatio = (ratio?: number): string => {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return '-'
  return `${Math.round(ratio * 100)}%`
}

const contentTypeLabel = (contentType?: string): string => {
  if (!contentType) return '-'
  if (contentType === 'post') return '贴文'
  if (contentType === 'comment') return '评论'
  if (contentType === 'article') return '文章'
  return contentType
}

const contentHitSourceMeta = (hit: ContentHit): string => {
  const post = contentHitPost(hit)
  return [
    post?.platform || '-',
    post?.language || '-',
    contentTypeLabel(post?.contentType)
  ].filter(Boolean).join(' · ')
}

const contributionPercent = (ratio?: number): number => {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return 0
  return Math.max(0, Math.min(100, Math.round(ratio * 100)))
}

const dominantContributionLabel = (hit: ContentHit): string => {
  const media = contributionPercent(hit.contribution?.media?.ratio)
  const text = contributionPercent(hit.contribution?.text?.ratio)
  if (media <= 0 && text <= 0) return ''
  if (media >= text) return `媒体贡献 ${media}%`
  return `文本贡献 ${text}%`
}

const relevanceLabel = (hit: ContentHit): string => {
  const level = relevanceLevel(hit)
  if (level === 'high') return '高度相关'
  if (level === 'medium') return '相关'
  return '可能相关'
}

const relevanceClass = (hit: ContentHit): string => {
  const level = relevanceLevel(hit)
  if (level === 'high') return 'match-chip--high'
  if (level === 'medium') return 'match-chip--medium'
  return 'match-chip--low'
}

const relevanceLevel = (hit: ContentHit): 'high' | 'medium' | 'low' => {
  const evidences = hit.evidences ?? []
  if (evidences.some(isHighQualityEvidence)) return 'high'
  if (evidences.some(isMediumQualityEvidence)) return 'medium'
  return 'low'
}

const isHighQualityEvidence = (evidence: SearchEvidence): boolean => {
  if (evidence.channel === 'ES_POST_KEYWORD') return (evidence.rank ?? 99) <= 2
  if (evidence.channel === 'ES_MEDIA_KEYWORD') return (evidence.rank ?? 99) <= 2
  const score = evidence.rawScore
  if (typeof score !== 'number' || !Number.isFinite(score)) return false
  if (evidence.hitField === 'visual_embedding') return score >= 0.92
  if (['ocr_embedding', 'asr_embedding', 'caption_embedding', 'text_embedding'].includes(evidence.hitField || '')) {
    return score >= 0.86
  }
  return score >= 0.9
}

const isMediumQualityEvidence = (evidence: SearchEvidence): boolean => {
  if (evidence.channel === 'ES_POST_KEYWORD' || evidence.channel === 'ES_MEDIA_KEYWORD') return true
  const score = evidence.rawScore
  if (typeof score !== 'number' || !Number.isFinite(score)) return false
  if (evidence.hitField === 'visual_embedding') return score >= 0.78
  if (['ocr_embedding', 'asr_embedding', 'caption_embedding', 'text_embedding'].includes(evidence.hitField || '')) {
    return score >= 0.72
  }
  return score >= 0.7
}

const mediaStrengthClass = (hit: ContentHit): string => {
  if (hit.displaySuggestion !== 'MEDIA_FIRST') return ''
  const media = hit.contribution?.media?.ratio ?? 0
  if (media >= 0.7) return 'content-hit-card--media-strong'
  if (media >= 0.55) return 'content-hit-card--media-medium'
  return 'content-hit-card--media-weak'
}

const evidenceSummaryLabels = (hit: ContentHit): string[] => {
  const labels = hit.evidences.map(evidence => evidenceSummaryLabel(hit, evidence)).filter(Boolean)
  return Array.from(new Set(labels)).slice(0, 4)
}

const evidenceSummaryLabel = (hit: ContentHit, evidence: SearchEvidence): string => {
  if (evidence.channel === 'ES_POST_KEYWORD') return '正文'
  if (evidence.channel === 'MILVUS_POST_SEMANTIC') return '正文语义'
  if (evidence.category === 'TEXT') return '正文'
  if (evidence.channel === 'ES_MEDIA_KEYWORD') {
    const asset = relatedAssetForEvidence(hit, evidence)
    if (isAudioAsset(asset)) return '音频文字'
    if (isVideoAsset(asset)) return '视频文字'
    return '图片文字'
  }
  if (evidence.channel === 'MILVUS_MEDIA_SEMANTIC') {
    const asset = relatedAssetForEvidence(hit, evidence)
    if (evidence.hitField === 'visual_embedding') return '画面语义'
    if (evidence.hitField === 'caption_embedding') return '媒体描述'
    if (evidence.hitField === 'ocr_embedding') return '图片文字语义'
    if (evidence.hitField === 'asr_embedding') return '音频语义'
    return '媒体语义'
  }
  return evidenceLabel(hit, evidence)
}

const displaySuggestionLabel = (suggestion?: string): string => {
  if (suggestion === 'MEDIA_FIRST') return '媒体优先'
  if (suggestion === 'MIXED') return '混合命中'
  return '文本优先'
}

const mediaTypeLabel = (mediaType?: string): string => {
  const normalized = mediaType?.toLowerCase()
  if (normalized === 'video') return '视频'
  if (normalized === 'audio') return '音频'
  if (normalized === 'image') return '图片'
  return '媒体'
}

const buildAssetHitUrl = (asset?: AssetHit | null): string => {
  if (!asset) return ''
  if (asset.minioKey && asset.minioBucket) {
    return `http://172.16.40.232:9000/${asset.minioBucket}/${asset.minioKey}`
  }
  return asset.sourceUrl || asset.previewUrl || asset.storageUri || ''
}

const withMediaTimeFragment = (url: string, asset?: AssetHit | null): string => {
  if (!url || !asset?.previewTimeMs || isImageAsset(asset)) return url
  const seconds = Math.max(0, Math.floor(asset.previewTimeMs / 1000))
  const cleanUrl = url.split('#')[0]
  return `${cleanUrl}#t=${seconds}`
}

const mediaPreviewUrl = (asset?: AssetHit | null): string => {
  const url = buildAssetHitUrl(asset)
  return withMediaTimeFragment(url, asset)
}

const isImageAsset = (asset?: AssetHit | null): boolean => {
  const type = asset?.mediaType?.toLowerCase()
  return type === 'image' || Boolean(asset?.mimeType?.startsWith('image/'))
}

const isVideoAsset = (asset?: AssetHit | null): boolean => {
  const type = asset?.mediaType?.toLowerCase()
  return type === 'video' || Boolean(asset?.mimeType?.startsWith('video/'))
}

const isAudioAsset = (asset?: AssetHit | null): boolean => {
  const type = asset?.mediaType?.toLowerCase()
  return type === 'audio' || Boolean(asset?.mimeType?.startsWith('audio/'))
}

const mediaPreviewComponent = (asset?: AssetHit | null): string => {
  if (isImageAsset(asset)) return 'el-image'
  if (isVideoAsset(asset)) return 'video'
  if (isAudioAsset(asset)) return 'audio'
  return 'div'
}

const mediaPreviewProps = (asset?: AssetHit | null): Record<string, unknown> => {
  const src = mediaPreviewUrl(asset)
  if (isImageAsset(asset)) {
    return { src, fit: shouldContainAsset(asset) ? 'contain' : 'cover' }
  }
  if (isVideoAsset(asset) || isAudioAsset(asset)) {
    return { src }
  }
  return {}
}

const shouldContainAsset = (asset?: AssetHit | null): boolean => {
  if (!asset?.width || !asset?.height) return false
  const ratio = asset.width / asset.height
  return ratio < 0.72 || ratio > 1.9
}

const formatSegment = (asset?: AssetHit | null): string => {
  if (!asset?.segmentStartMs && !asset?.segmentEndMs) return ''
  const start = formatMillis(asset.segmentStartMs)
  const end = formatMillis(asset.segmentEndMs)
  if (start && end) return `${start} - ${end}`
  return start || end
}

const formatMillis = (value?: number): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  const totalSeconds = Math.max(0, Math.floor(value / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

const primaryAssetActionLabel = (hit: ContentHit): string => {
  const asset = hit.primaryAsset
  if (!asset) return '查看附件'
  if (isVideoAsset(asset)) {
    const start = formatMillis(asset.segmentStartMs ?? asset.previewTimeMs)
    return start ? `从 ${start} 播放` : '查看视频'
  }
  if (isAudioAsset(asset)) {
    const start = formatMillis(asset.segmentStartMs ?? asset.previewTimeMs)
    return start ? `从 ${start} 播放` : '播放音频'
  }
  if (isImageAsset(asset)) {
    return hit.displaySuggestion === 'MEDIA_FIRST' ? '查看命中图片' : '查看附件'
  }
  return '查看附件'
}

const openPrimaryAsset = (hit: ContentHit) => {
  const url = mediaPreviewUrl(hit.primaryAsset)
  if (!url) {
    ElMessage.warning('暂无可打开的媒体地址')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

const relatedAssetForEvidence = (hit: ContentHit, evidence: SearchEvidence): AssetHit | null =>
  hit.matchedAssets?.find(asset =>
    asset.entityId === evidence.entityId || asset.assetId === evidence.assetId
  ) ?? hit.primaryAsset ?? null

const mediaEvidenceLabel = (asset?: AssetHit | null, evidences: SearchEvidence[] = []): string => {
  const related = evidences.find(evidence =>
    evidence.category === 'MEDIA' &&
    (evidence.entityId === asset?.entityId || evidence.assetId === asset?.assetId)
  )
  if (related?.channel === 'ES_MEDIA_KEYWORD') {
    if (isAudioAsset(asset)) return '音频转写命中'
    if (isVideoAsset(asset)) return '视频文字命中'
    return '图片文字命中'
  }
  if (related?.channel === 'MILVUS_MEDIA_SEMANTIC') {
    if (related.hitField === 'visual_embedding') return visualEvidenceLabel(related)
    if (related.hitField === 'asr_embedding') return '音频语义相关'
    if (related.hitField === 'caption_embedding') return '媒体描述相关'
    if (related.hitField === 'ocr_embedding') return '图片文字语义相关'
  }
  return `${mediaTypeLabel(asset?.mediaType)}资源命中`
}

const mediaKeywordEvidenceLabel = (asset?: AssetHit | null): string => {
  if (isAudioAsset(asset)) return '音频转写命中'
  if (isVideoAsset(asset)) return '视频文字命中'
  if (isImageAsset(asset)) return '图片文字命中'
  return '媒体文字命中'
}

const mediaSemanticEvidenceLabel = (asset: AssetHit | null, evidence: SearchEvidence): string => {
  if (evidence.hitField === 'visual_embedding') return visualEvidenceLabel(evidence)
  if (evidence.hitField === 'caption_embedding') return '媒体描述相关'
  if (evidence.hitField === 'ocr_embedding') {
    return isImageAsset(asset) ? '图片文字语义相关' : '媒体文字语义相关'
  }
  if (evidence.hitField === 'asr_embedding') {
    return isAudioAsset(asset) || isVideoAsset(asset) ? '音频语义相关' : '媒体语义相关'
  }
  return '媒体语义相关'
}

const visualEvidenceLabel = (evidence?: SearchEvidence): string => {
  const score = evidence?.rawScore
  if (typeof score === 'number' && Number.isFinite(score)) {
    if (score >= 0.98) return '原图/近似图命中'
    if (score >= 0.9) return '高度相似图片'
  }
  return '画面语义相关'
}

const evidenceLabel = (hit: ContentHit, evidence: SearchEvidence): string => {
  if (evidence.channel === 'ES_POST_KEYWORD') return '命中正文'
  if (evidence.channel === 'MILVUS_POST_SEMANTIC') return '文本语义相关'
  if (evidence.channel === 'NEO4J_GRAPH') return '实体关联'
  const asset = relatedAssetForEvidence(hit, evidence)
  if (evidence.channel === 'ES_MEDIA_KEYWORD') {
    return mediaKeywordEvidenceLabel(asset)
  }
  if (evidence.channel === 'MILVUS_MEDIA_SEMANTIC') {
    return mediaSemanticEvidenceLabel(asset, evidence)
  }
  return evidence.channel
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
  gap: 18px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: min(1120px, calc(100vw - 48px));
  margin: 0 auto;
}

.page-header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #111827;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.muted-text {
  margin: 6px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.mode-tabs {
  flex: 0 0 auto;
}

.primary-search-card {
  width: min(1120px, calc(100vw - 48px));
  margin: 0 auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgb(15 23 42 / 4%);
}

.primary-search-card :deep(.el-card__body) {
  padding: 22px 28px;
}

.primary-input-area {
  max-width: 1040px;
  margin: 0 auto;
  width: 100%;
}

.primary-input-area.content-search-area {
  max-width: 1040px;
  width: 100%;
}

.primary-search-row {
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
}

.primary-search-box {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  height: 52px;
  border: 1px solid #dcdfe6;
  border-right: 0;
  border-radius: 10px 0 0 10px;
  background: #fff;
  transition: border-color 0.15s ease;
}

.primary-search-box:focus-within {
  border-color: #409eff;
}

.primary-search-native-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  padding: 0 12px 0 20px;
  border: 0;
  outline: none;
  background: transparent;
  color: #111827;
  font-size: 15px;
}

.primary-search-native-input::placeholder {
  color: #a8abb2;
}

.primary-search-clear {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #909399;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
}

.primary-search-clear:hover {
  background: #f3f4f6;
}

.primary-search-upload {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  flex: 0 0 44px;
}

.primary-search-upload :deep(.el-upload) {
  display: inline-flex;
}

.primary-search-button {
  height: 52px;
  width: 88px;
  flex: 0 0 88px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
  font-size: 15px;
  font-weight: 600;
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

.content-filter-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #eef2f7;
}

.filter-row {
  display: grid;
  align-items: end;
  gap: 12px;
}

.filter-row--quick {
  grid-template-columns: minmax(160px, 220px) minmax(160px, 220px) max-content;
  align-items: center;
  justify-content: start;
}

.advanced-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.advanced-toggle__icon {
  transition: transform 0.16s ease;
}

.advanced-toggle__icon.is-open {
  transform: rotate(180deg);
}

.filter-chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.filter-chip-label {
  flex: 0 0 58px;
  color: #6b7280;
  font-size: 13px;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 999px;
  background: #fff;
  color: #606266;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s ease;
}

.filter-chip:hover {
  border-color: #409eff;
  color: #409eff;
}

.filter-chip.is-active {
  border-color: #409eff;
  background: #ecf5ff;
  color: #1677d2;
}

.advanced-filter-panel {
  margin-top: 2px;
  padding: 12px 16px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
}

.advanced-filter-enter-active,
.advanced-filter-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.advanced-filter-enter-from,
.advanced-filter-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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

.option-control {
  min-width: 180px;
}

.option-control--slider {
  min-width: 0;
}

.threshold-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 18px;
}

.option-control__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.2;
}

.option-control__label strong {
  color: #374151;
  font-weight: 600;
}

.option-control__hint {
  display: block;
  margin-top: -4px;
  color: #86909c;
  font-size: 12px;
}

.mt-sm {
  margin-top: 12px;
}

.target-radio-group {
  display: flex;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.target-radio-group :deep(.el-radio-button__inner) {
  border-color: #dcdfe6;
  background: #fff;
  color: #606266;
  padding-right: 12px;
  padding-left: 12px;
}

.target-radio-group :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: -1px 0 0 0 #409eff;
  color: #1677d2;
}

.mixed-result-layout {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.result-pagination {
  justify-content: flex-end;
  margin-top: 4px;
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

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #4b5563;
  font-size: 13px;
}

.result-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-size-select {
  width: 112px;
}

.result-panel {
  width: min(1120px, calc(100vw - 48px));
  margin: 0 auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgb(15 23 42 / 4%);
}

.result-panel :deep(.el-card__header) {
  padding: 14px 18px;
  border-bottom-color: #eef2f7;
  background: #fff;
}

.result-panel :deep(.el-card__body) {
  padding: 18px;
}

.result-body {
  min-height: 360px;
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

.search-empty-state {
  display: flex;
  min-height: 340px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  color: #6b7280;
  text-align: center;
}

.search-empty-state__icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #ecf5ff;
  color: #409eff;
  font-size: 22px;
}

.search-empty-state h2 {
  margin: 14px 0 6px;
  color: #111827;
  font-size: 18px;
}

.search-empty-state p {
  max-width: 520px;
  margin: 0;
  line-height: 1.6;
}

.search-empty-state__examples {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
}

.search-empty-state__examples button {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 999px;
  background: #fff;
  color: #4b5563;
  cursor: pointer;
}

.search-empty-state__examples button:hover {
  border-color: #409eff;
  color: #409eff;
}

.content-hit-card :deep(.el-card__body) {
  padding: 16px;
}

.content-hit-card--text_first :deep(.el-card__body),
.content-hit-card--mixed :deep(.el-card__body) {
  padding: 14px 16px;
}

.content-hit-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.content-hit-card--text_first .content-hit-layout,
.content-hit-card--mixed .content-hit-layout {
  gap: 10px;
}

.content-hit-card--media_first .content-hit-layout {
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  align-items: start;
  min-height: 210px;
}

.content-hit-card--media-medium .content-hit-layout {
  grid-template-columns: minmax(190px, 240px) minmax(0, 1fr);
}

.content-hit-card--media-weak .content-hit-layout {
  grid-template-columns: minmax(150px, 180px) minmax(0, 1fr);
}

.content-hit-media {
  position: relative;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f7f8fa;
}

.content-hit-media__label {
  position: absolute;
  z-index: 1;
  top: 8px;
  left: 8px;
  padding: 3px 8px;
  border-radius: 6px;
  backdrop-filter: blur(4px);
  background: rgb(17 24 39 / 72%);
  color: #fff;
  font-size: 12px;
}

.content-hit-media__preview {
  display: block;
  width: 100%;
  height: 190px;
  object-fit: cover;
}

.content-hit-media__preview:empty {
  min-height: 180px;
}

.content-hit-card--media-medium .content-hit-media__preview {
  height: 164px;
}

.content-hit-card--media-weak .content-hit-media__preview {
  height: 128px;
}

.content-hit-media__segment {
  padding: 7px 10px;
  color: #4b5563;
  font-size: 12px;
  background: #fff;
}

.content-hit-main {
  min-width: 0;
}

.content-hit-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.content-hit-source {
  color: #6b7280;
  font-size: 13px;
  line-height: 1.4;
}

.content-hit-match-summary {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
}

.match-chip {
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 12px;
}

.match-chip--muted {
  background: #f6f7f9;
  color: #6b7280;
}

.match-chip--high {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.match-chip--medium {
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
  color: #52606d;
}

.match-chip--low {
  border: 1px solid #fed7aa;
  background: #fff7ed;
  color: #9a3412;
}

.content-hit-time {
  margin-top: 4px;
  color: #9ca3af;
  font-size: 12px;
}

.content-hit-title {
  margin-top: 10px;
  color: #111827;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.content-hit-card--text_first .content-hit-title,
.content-hit-card--mixed .content-hit-title {
  margin-top: 8px;
  font-size: 15px;
}

.content-hit-inline-media {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
}

.content-hit-inline-media__thumb {
  width: 96px;
  height: 72px;
  flex: 0 0 96px;
  overflow: hidden;
  border-radius: 6px;
  background: #eef2f7;
}

.content-hit-inline-media__thumb :deep(.el-image),
.content-hit-inline-media__thumb video,
.content-hit-inline-media__thumb audio {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.content-hit-inline-media__title {
  color: #111827;
  font-size: 13px;
  font-weight: 600;
}

.content-hit-evidence-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 14px;
  margin-top: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
}

.content-hit-evidence-summary__main {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.content-hit-evidence-summary__main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-card__meta,
.result-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.content-hit-card--text_first .result-card__footer,
.content-hit-card--mixed .result-card__footer {
  margin-top: 4px;
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
  margin: 12px 0 8px;
  line-height: 1.6;
  color: #111827;
  white-space: pre-wrap;
}

.content-hit-card--text_first .body-text,
.content-hit-card--mixed .body-text {
  margin: 8px 0 6px;
  line-height: 1.55;
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
  margin: 10px 0;
  font-size: 13px;
  color: #4b5563;
}

.content-hit-card--text_first .result-card__stats,
.content-hit-card--mixed .result-card__stats {
  margin: 8px 0;
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
  .page-header {
    width: min(100%, calc(100vw - 32px));
    flex-direction: column;
    align-items: stretch;
  }

  .mode-tabs {
    align-self: flex-start;
  }

  .primary-search-card,
  .result-panel {
    width: min(100%, calc(100vw - 32px));
  }

  .primary-search-card :deep(.el-card__body) {
    padding: 16px;
  }

  .primary-search-button {
    width: 72px;
    flex-basis: 72px;
  }

  .filter-row,
  .filter-row--quick {
    grid-template-columns: 1fr;
  }

  .filter-chip-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }

  .filter-chip-label {
    flex-basis: auto;
  }

  .target-radio-group {
    justify-self: stretch;
    width: 100%;
  }

  .threshold-group {
    grid-template-columns: 1fr;
  }

  .target-radio-group :deep(.el-radio-button) {
    flex: 1;
  }

  .target-radio-group :deep(.el-radio-button__inner) {
    width: 100%;
  }

  .options-grid {
    grid-template-columns: 1fr;
  }

  .content-hit-card--media_first .content-hit-layout {
    grid-template-columns: 1fr;
  }

  .content-hit-topline {
    flex-direction: column;
    gap: 8px;
  }

  .content-hit-match-summary {
    justify-content: flex-start;
  }
}

.result-card__actions {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
</style>
