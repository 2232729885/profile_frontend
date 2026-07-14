import request from './request'

export const triggerImageEmbedding = () =>
  request.post('/api/jobs/image-embedding/trigger')

export const triggerAccountRelation = () =>
  request.post('/api/jobs/account-relation/trigger')

export const triggerContentPropagation = () =>
  request.post('/api/jobs/content-propagation/trigger')

export const triggerProfileGeneration = () =>
  request.post('/api/jobs/profile-generation/trigger')

export const retryPipelineTask = (rawRecordId: string) =>
  request.post(`/api/jobs/pipeline/retry/${rawRecordId}`)

export const retryStuckPipelineTasks = () =>
  request.post('/api/jobs/pipeline/retry-stuck')
