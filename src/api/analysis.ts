import request from './request'

export const createAnalysisTask = (params: any) => request.post('/api/analysis/tasks', params)
export const createTaskWithFile = (formData: FormData) =>
  request.post('/api/analysis/tasks/with-file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })
export const getAnalysisTask = (taskId: string) => request.get(`/api/analysis/tasks/${taskId}`)
export const cancelTask = (taskId: string) =>
  request.post(`/api/analysis/tasks/${taskId}/cancel`)
export const getSessions = () => request.get('/api/analysis/sessions')
export const getAgentInfo = () => request.get('/api/analysis/agent-info')
export const deleteSession = (sessionId: string) =>
  request.delete(`/api/analysis/sessions/${sessionId}`)
export const renameSession = (sessionId: string, title: string) =>
  request.put(`/api/analysis/sessions/${sessionId}/title`, { title })

export const getSessionMessages = (sessionId: string) =>
  request.get(`/api/analysis/sessions/${sessionId}/messages`)

export const getStreamUrl = (taskId: string) => `/api/analysis/${taskId}/stream`
