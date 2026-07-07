import request from './request'

export const uploadFile = (formData: FormData) =>
  request.post('/api/ingestion/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const getPipelineStats = () => request.get('/api/ingestion/pipeline/stats')
export const getCollectionTasks = () => request.get('/api/ingestion/collection-tasks')

export const listRawRecords = (params?: {
  recordType?: string
  pipelineStatus?: string
  platform?: string
  page?: number
  size?: number
}) => request.get('/api/ingestion/raw-records', { params })

export const getRawRecord = (id: string) =>
  request.get(`/api/ingestion/raw-records/${id}`)

export const getContentDetail = (contentId: string) =>
  request.get(`/api/ingestion/contents/${contentId}`)
