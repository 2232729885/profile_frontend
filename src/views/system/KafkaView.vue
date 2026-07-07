<template>
  <div class="system-page">
    <div class="page-header">
      <div>
        <h1>消息队列监控</h1>
        <p>查看 Kafka Topic 消息总数和消费进度</p>
      </div>
      <div class="header-actions">
        <span class="updated-time">最后更新：{{ lastUpdated || '-' }}</span>
        <el-button type="primary" :loading="loading" @click="loadKafkaStats">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never" v-loading="loading">
      <el-table :data="rows" border>
        <el-table-column prop="topic" label="Topic" min-width="220">
          <template #default="{ row }">
            <span class="topic-name">{{ row.topic }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalMessages" label="消息总数" width="130" align="right">
          <template #default="{ row }">
            {{ formatCount(row.totalMessages) }}
          </template>
        </el-table-column>
        <el-table-column prop="consumed" label="已消费" width="130" align="right">
          <template #default="{ row }">
            <span :class="{ 'success-text': row.consumed >= 0 }">{{ formatCount(row.consumed) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lag" label="待消费(Lag)" width="150" align="right">
          <template #default="{ row }">
            <el-tag v-if="row.lag === 0" type="success" effect="plain">已追上</el-tag>
            <span v-else-if="row.lag > 0" class="warning-text">{{ row.lag }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="消费进度" min-width="220">
          <template #default="{ row }">
            <el-progress
              v-if="row.totalMessages >= 0"
              :percentage="progressPercentage(row)"
              :status="row.lag === 0 ? 'success' : undefined"
            />
            <span v-else class="muted-text">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="consumerGroup" label="Consumer Group" min-width="220">
          <template #default="{ row }">
            <span class="consumer-group">{{ row.consumerGroup }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="error" label="状态" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.error" type="danger" effect="plain">{{ row.error }}</el-tag>
            <el-tag v-else type="success" effect="plain">正常</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-tip">
        消息总数 = 各 Partition 最新 Offset 之和；Lag = 未消费消息数
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { getKafkaStats } from '@/api/metrics'

interface KafkaTopicStats {
  topic: string
  totalMessages: number
  consumed: number
  lag: number
  consumerGroup: string
  error?: string
}

const rows = ref<KafkaTopicStats[]>([])
const loading = ref(false)
const lastUpdated = ref('')
let refreshTimer: number | undefined

const normalizeRows = (data: unknown): KafkaTopicStats[] => {
  if (!Array.isArray(data)) return []
  return data.map(item => {
    const row = item as Record<string, unknown>
    return {
      topic: String(row.topic ?? ''),
      totalMessages: Number(row.totalMessages ?? -1),
      consumed: Number(row.consumed ?? -1),
      lag: Number(row.lag ?? -1),
      consumerGroup: String(row.consumerGroup ?? ''),
      error: row.error ? String(row.error) : undefined
    }
  })
}

const loadKafkaStats = async () => {
  loading.value = true
  try {
    rows.value = normalizeRows(await getKafkaStats())
    lastUpdated.value = dayjs().format('YYYY-MM-DD HH:mm:ss')
  } catch {
    ElMessage.error('加载 Kafka 监控数据失败')
  } finally {
    loading.value = false
  }
}

const formatCount = (value: number) => {
  if (value < 0) return '-'
  return value.toLocaleString()
}

const progressPercentage = (row: KafkaTopicStats) => {
  if (row.totalMessages < 0) return 0
  if (row.totalMessages === 0) return 100
  return Math.min(100, Math.round((row.consumed / row.totalMessages) * 100))
}

onMounted(() => {
  void loadKafkaStats()
  refreshTimer = window.setInterval(() => {
    void loadKafkaStats()
  }, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    window.clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.system-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.updated-time,
.muted-text,
.consumer-group {
  font-size: 12px;
  color: #6b7280;
}

.topic-name {
  font-family: Consolas, Monaco, monospace;
  font-size: 13px;
  color: #111827;
}

.success-text {
  color: #16a34a;
  font-weight: 600;
}

.warning-text {
  color: #d97706;
  font-weight: 600;
}

.table-tip {
  margin-top: 12px;
  font-size: 12px;
  color: #6b7280;
}
</style>
