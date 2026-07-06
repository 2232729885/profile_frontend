import request from './request'

export const getPersonProfile = (personId: string) =>
  request.get(`/api/profiles/persons/${personId}`)

export const getProfileHistory = (personId: string) =>
  request.get(`/api/profiles/persons/${personId}/history`)

export const listProfiles = (params: any) =>
  request.post('/api/profiles/list', params)

export const reviewProfile = (profileId: string, data: any) =>
  request.put(`/api/profiles/${profileId}/review`, data)

export const getHighValueProfiles = () =>
  request.get('/api/profiles/high-value')

export const getPersonGraph = (personId: string) =>
  request.get(`/api/profiles/persons/${personId}/graph`)
