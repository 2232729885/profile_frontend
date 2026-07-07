import request from './request'

export const searchText = (params: any) => request.post('/api/search/text', params)
export const searchSemantic = (params: any) => request.post('/api/search/semantic', params)
export const searchHybrid = (params: any) => request.post('/api/search/hybrid', params)

export const searchGraph = (label: string, nodeId: string, hops = 1) =>
  request.get(`/api/search/graph/${label}/${nodeId}`, { params: { hops } })

export const getOverviewGraph = (limit = 300) =>
  request.get('/api/search/graph/overview', { params: { limit } })

export const searchPath = (params: any) => request.get('/api/search/path', { params })
export const searchEntities = (params: any) => request.get('/api/search/entities', { params })
export const searchByImage = (params: any) => request.post('/api/search/image', params)
export const searchByImageBase64 = (params: any) => request.post('/api/search/image/base64', params)

export const searchByImageUpload = (formData: FormData) =>
  request.post('/api/search/image/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
