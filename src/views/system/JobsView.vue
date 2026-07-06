<template>
  <div class="system-page">
    <div class="page-header">
      <div>
        <h1>定时任务</h1>
        <p>手动触发后端任务并查看触发结果</p>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col v-for="task in tasks" :key="task.key" :span="12">
        <el-card class="job-card" shadow="never">
          <div class="job-card__header">
            <div>
              <div class="job-card__title">{{ task.name }}</div>
              <p>{{ task.description }}</p>
            </div>
            <el-button type="primary" :loading="loadingMap[task.key]" @click="triggerTask(task)">立即触发</el-button>
          </div>
          <div v-if="results[task.key]" class="job-result">
            jobId：{{ results[task.key].jobId || '-' }} · {{ results[task.key].time }}
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { triggerDedup } from '@/api/dedup'
import {
  triggerAccountRelation,
  triggerContentPropagation,
  triggerImageEmbedding,
  triggerProfileGeneration
} from '@/api/jobs'

interface JobTask {
  key: string
  name: string
  description: string
  trigger: () => Promise<unknown>
}

interface JobResult {
  jobId: string
  time: string
}

const tasks: JobTask[] = [
  {
    key: 'imageEmbedding',
    name: '图像标注回填 + 向量化',
    description: 'T1 图像标注回填 + T4 向量化',
    trigger: triggerImageEmbedding
  },
  {
    key: 'accountRelation',
    name: '账号关系回填',
    description: '课题三账号关系写入 Neo4j',
    trigger: triggerAccountRelation
  },
  {
    key: 'contentPropagation',
    name: '传播链关系回填',
    description: '补写传播链 Neo4j 关系',
    trigger: triggerContentPropagation
  },
  {
    key: 'profileGeneration',
    name: '画像生成',
    description: '批量生成人物全息画像',
    trigger: triggerProfileGeneration
  },
  {
    key: 'dedup',
    name: '实体融合',
    description: '精确匹配 + T3 跨语言归一',
    trigger: triggerDedup
  }
]

const loadingMap = reactive<Record<string, boolean>>({})
const results = reactive<Record<string, JobResult>>({})

const extractJobId = (result: unknown) => {
  if (typeof result === 'string') return result
  if (!result || typeof result !== 'object') return ''
  const data = result as Record<string, unknown>
  return String(data.jobId ?? data.jobRunId ?? data.taskId ?? '')
}

const triggerTask = async (task: JobTask) => {
  loadingMap[task.key] = true
  try {
    const result = await task.trigger()
    results[task.key] = {
      jobId: extractJobId(result),
      time: dayjs().format('YYYY-MM-DD HH:mm:ss')
    }
    ElMessage.success(`${task.name} 已触发`)
  } catch {
    ElMessage.error(`${task.name} 触发失败`)
  } finally {
    loadingMap[task.key] = false
  }
}
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

.job-card {
  min-height: 140px;
  margin-bottom: 16px;
}

.job-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.job-card__title {
  font-weight: 700;
  color: #111827;
}

.job-card p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #6b7280;
}

.job-result {
  margin-top: 18px;
  font-size: 13px;
  color: #16a34a;
}
</style>
