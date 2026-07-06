import request from './request'

export const getAgents = () => request.get('/api/system/agents')
export const getAgent = (code: string) => request.get(`/api/system/agents/${code}`)

export const updateAgentUrlType = (code: string, urlType: string) =>
  request.put(`/api/system/agents/${code}/url-type`, { activeUrlType: urlType })

export const updateAgentBaseUrl = (code: string, baseUrl: string) =>
  request.put(`/api/system/agents/${code}/base-url`, { baseUrl })

export const healthCheck = (code: string) =>
  request.post(`/api/system/agents/${code}/health-check`)

export const getUsers = () => request.get('/api/system/users')
export const createUser = (data: any) => request.post('/api/system/users', data)

export const updateUserRole = (userId: string, role: string) =>
  request.put(`/api/system/users/${userId}/role`, { role })
