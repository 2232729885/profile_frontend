import request from './request'

export const uploadFile = (formData: FormData) =>
  request.post('/api/ingestion/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const getPipelineStats = () => request.get('/api/ingestion/pipeline/stats')
export const getCollectionTasks = () => request.get('/api/ingestion/collection-tasks')
