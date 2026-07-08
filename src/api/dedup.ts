import request from './request'

export const getFusionRecords = (params?: any) =>
  request.get('/api/dedup/fusion-records', { params })

export const getFusionRecordsByJob = (jobRunId: string) =>
  request.get(`/api/dedup/fusion-records/${jobRunId}`)

export const getPendingReviewRecords = (params?: {
  entityType?: string
  page?: number
  size?: number
}) => request.get('/api/dedup/fusion-records/pending-review', { params })

export const reviewFusionRecord = (recordId: string, action: 'approve' | 'reject') =>
  request.post(`/api/dedup/fusion-records/${recordId}/review`, { action })

export const getDedupStats = () => request.get('/api/dedup/stats')
export const triggerDedup = () => request.post('/api/dedup/trigger')
