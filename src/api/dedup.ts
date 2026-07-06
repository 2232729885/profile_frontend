import request from './request'

export const getFusionRecords = (params?: any) =>
  request.get('/api/dedup/fusion-records', { params })

export const getFusionRecordsByJob = (jobRunId: string) =>
  request.get(`/api/dedup/fusion-records/${jobRunId}`)

export const getDedupStats = () => request.get('/api/dedup/stats')
export const triggerDedup = () => request.post('/api/dedup/trigger')
