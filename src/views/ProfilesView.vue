<template>
  <div class="profiles-view">
    <div class="page-header">
      <div>
        <h1>画像管理</h1>
        <p>人物画像列表、风险过滤和高价值目标快速查看</p>
      </div>
      <el-button :type="highValueMode ? 'success' : 'primary'" :loading="highValueLoading" @click="loadHighValueProfiles">
        高价值目标
      </el-button>
    </div>

    <el-card shadow="never">
      <el-form :model="queryForm" inline class="filter-form">
        <el-form-item label="目标类型">
          <el-select
            v-model="queryForm.targetTypes"
            multiple
            collapse-tags
            collapse-tags-tooltip
            clearable
            placeholder="T00~T10"
            class="filter-select"
          >
            <el-option v-for="type in targetTypeOptions" :key="type" :label="type" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="操控风险">
          <el-select v-model="queryForm.manipulationRisk" clearable placeholder="全部" class="filter-select">
            <el-option v-for="risk in riskOptions" :key="risk" :label="risk" :value="risk" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="queryForm.isHighValue">高价值目标</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table
        v-loading="loading || highValueLoading"
        :data="profiles"
        :row-class-name="getRowClassName"
        border
      >
        <el-table-column label="人物名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }: { row: ProfileListItem }">
            <el-button link type="primary" @click="goDetail(row)">{{ row.canonicalName || row.personId }}</el-button>
          </template>
        </el-table-column>
        <el-table-column label="目标类型" width="120" sortable>
          <template #default="{ row }: { row: ProfileListItem }">
            <el-tag :type="targetTypeTagType(row.targetType)">{{ row.targetType || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操控风险" width="120" sortable>
          <template #default="{ row }: { row: ProfileListItem }">
            <el-tag :type="riskTagType(row.manipulationRisk)" :class="{ 'risk-medium': row.manipulationRisk === 'medium' }">
              {{ row.manipulationRisk || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操控评分" min-width="170" prop="manipulationScore" sortable>
          <template #default="{ row }: { row: ProfileListItem }">
            <el-progress
              :percentage="normalizeScore(row.manipulationScore)"
              :color="scoreColor(row.manipulationScore)"
              :stroke-width="10"
            />
          </template>
        </el-table-column>
        <el-table-column label="影响力" width="100" align="right" prop="influenceScore" sortable>
          <template #default="{ row }: { row: ProfileListItem }">{{ row.influenceScore ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="画像版本" width="110" prop="portraitVersion" sortable>
          <template #default="{ row }: { row: ProfileListItem }">v{{ row.portraitVersion ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110" prop="status" sortable>
          <template #default="{ row }: { row: ProfileListItem }">
            <el-tag :type="row.status === 'reviewed' ? 'success' : 'primary'">{{ row.status || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="生成时间" min-width="180" prop="generatedAt" sortable>
          <template #default="{ row }: { row: ProfileListItem }">{{ formatTime(row.generatedAt) }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-bar">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="loadProfiles"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { getHighValueProfiles, listProfiles } from '@/api/profiles'

interface ProfileListQuery {
  targetType?: string
  manipulationRisk?: string
  isHighValue?: boolean
  page: number
  size: number
}

interface IPage<T> {
  records: T[]
  total: number
  current: number
  size: number
}

interface ProfileListItem {
  id?: string
  profileId?: string
  personId: string
  canonicalName: string
  targetType: string
  manipulationRisk: 'critical' | 'high' | 'medium' | 'low' | string
  manipulationScore: number
  influenceScore: number
  portraitVersion: number
  status: 'generated' | 'reviewed' | string
  generatedAt: string
  isHighValue?: boolean
}

const router = useRouter()
const loading = ref(false)
const highValueLoading = ref(false)
const highValueMode = ref(false)
const profiles = ref<ProfileListItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const highValueIds = ref<Set<string>>(new Set())

const targetTypeOptions = Array.from({ length: 11 }, (_, index) => `T${String(index).padStart(2, '0')}`)
const riskOptions = ['critical', 'high', 'medium', 'low']
const queryForm = reactive({
  targetTypes: [] as string[],
  manipulationRisk: '',
  isHighValue: false
})

const formatTime = (time?: string) => (time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-')

const buildQuery = (): ProfileListQuery => ({
  targetType: queryForm.targetTypes.length ? queryForm.targetTypes.join(',') : undefined,
  manipulationRisk: queryForm.manipulationRisk || undefined,
  isHighValue: queryForm.isHighValue || undefined,
  page: currentPage.value - 1,
  size: pageSize.value
})

const normalizeScore = (score?: number) => {
  const value = Number(score ?? 0)
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

const scoreColor = (score?: number) => {
  const value = normalizeScore(score)
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

const getProfileKey = (profile: ProfileListItem) => profile.personId || profile.profileId || profile.id || ''

const normalizePageResult = (result: unknown): IPage<ProfileListItem> => {
  if (Array.isArray(result)) {
    return { records: result as ProfileListItem[], total: result.length, current: 0, size: result.length }
  }
  const page = result as Partial<IPage<ProfileListItem>>
  return {
    records: page.records ?? [],
    total: page.total ?? 0,
    current: page.current ?? 0,
    size: page.size ?? pageSize.value
  }
}

const loadProfiles = async () => {
  loading.value = true
  highValueMode.value = false
  try {
    const page = normalizePageResult(await listProfiles(buildQuery()))
    profiles.value = page.records
    total.value = page.total
    highValueIds.value = new Set(page.records.filter(item => item.isHighValue).map(getProfileKey))
  } catch {
    ElMessage.error('加载画像列表失败')
  } finally {
    loading.value = false
  }
}

const loadHighValueProfiles = async () => {
  highValueLoading.value = true
  try {
    const result = await getHighValueProfiles()
    const records = Array.isArray(result) ? (result as ProfileListItem[]) : normalizePageResult(result).records
    profiles.value = records
    total.value = records.length
    currentPage.value = 1
    highValueMode.value = true
    highValueIds.value = new Set(records.map(getProfileKey))
    ElMessage.success('已加载高价值目标')
  } catch {
    ElMessage.error('加载高价值目标失败')
  } finally {
    highValueLoading.value = false
  }
}

const handleSearch = () => {
  currentPage.value = 1
  void loadProfiles()
}

const handleReset = () => {
  queryForm.targetTypes = []
  queryForm.manipulationRisk = ''
  queryForm.isHighValue = false
  currentPage.value = 1
  void loadProfiles()
}

const goDetail = (profile: ProfileListItem) => {
  router.push(`/profiles/${profile.personId}`)
}

const getRowClassName = ({ row }: { row: ProfileListItem }) => {
  return highValueIds.value.has(getProfileKey(row)) ? 'high-value-row' : ''
}

onMounted(() => {
  void loadProfiles()
})
</script>

<style scoped>
.profiles-view {
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

.filter-form {
  margin-bottom: -18px;
}

.filter-select {
  width: 220px;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.risk-medium {
  --el-tag-bg-color: #fef9c3;
  --el-tag-border-color: #fde047;
  --el-tag-text-color: #a16207;
}

:deep(.high-value-row) {
  --el-table-tr-bg-color: #f0fdf4;
}
</style>
