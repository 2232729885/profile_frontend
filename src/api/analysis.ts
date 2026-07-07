import request from './request'

export const createAnalysisTask = (params: any) => request.post('/api/analysis/tasks', params)
export const getAnalysisTask = (taskId: string) => request.get(`/api/analysis/tasks/${taskId}`)
export const getSessions = () => request.get('/api/analysis/sessions')
export const getAgentInfo = () => request.get('/api/analysis/agent-info')

export const getSessionMessages = (sessionId: string) =>
  request.get(`/api/analysis/sessions/${sessionId}/messages`)

export const getStreamUrl = (taskId: string) => `/api/analysis/${taskId}/stream`
