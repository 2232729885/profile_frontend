import request from './request'

export const getPipelineMetrics = () => request.get('/api/metrics/pipeline')
export const getDataVolume = () => request.get('/api/metrics/data-volume')
export const getNeo4jStats = () => request.get('/api/metrics/neo4j')
export const getOverview = () => request.get('/api/metrics/overview')
export const getKafkaStats = () => request.get('/api/metrics/kafka')
