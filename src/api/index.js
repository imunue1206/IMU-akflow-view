import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const docApi = {
  getPage: (page = 1, pageSize = 10, keyword = '') => {
    return api.get('/docs/page', { params: { page, pageSize, keyword } })
  },
  getById: (docId) => {
    return api.get(`/docs/${docId}`)
  },
  upload: (path, tagIds = []) => {
    return api.post('/docs/upload', { path, tagIds })
  },
  updateTags: (docId, tagIds) => {
    return api.put(`/docs/tags/${docId}`, tagIds)
  },
  updateContent: (docId, content) => {
    return api.put(`/docs/${docId}/content`, content, {
      headers: { 'Content-Type': 'text/plain' }
    })
  },
  export: (docId) => {
    return api.get(`/docs/${docId}/export`, {
      responseType: 'blob'
    })
  },
  delete: (docId) => {
    return api.delete(`/docs/${docId}`)
  },
  batchDelete: (ids) => {
    return api.delete('/docs/batch', { data: ids })
  },
  searchByTags: (tagIds, page = 1, pageSize = 10) => {
    const tagIdsStr = Array.isArray(tagIds) ? tagIds.join(',') : tagIds
    return api.get('/docs/search-by-tags', { 
      params: { tagIds: tagIdsStr, page, pageSize } 
    })
  }
}

export const tagApi = {
  getPage: (page = 1, pageSize = 10, keyword = '') => {
    return api.get('/tags/page', { params: { page, pageSize, keyword } })
  },
  getById: (tagId) => {
    return api.get(`/tags/${tagId}`)
  },
  getDocs: (tagId, page = 1, pageSize = 10) => {
    return api.get(`/tags/${tagId}/docs`, { params: { page, pageSize } })
  },
  create: (data) => {
    return api.post('/tags', data)
  },
  update: (tagId, data) => {
    return api.put(`/tags/${tagId}`, data)
  },
  delete: (tagId) => {
    return api.delete(`/tags/${tagId}`)
  },
  batchDelete: (ids) => {
    return api.delete('/tags/batch', { data: ids })
  }
}

export const aiProviderApi = {
  getPage: (page = 1, pageSize = 10, keyword = '') => {
    return api.get('/ai/providers/page', { params: { page, pageSize, keyword } })
  },
  getById: (providerId) => {
    return api.get(`/ai/providers/${providerId}`)
  },
  getList: () => {
    return api.get('/ai/providers/list')
  },
  create: (data) => {
    return api.post('/ai/providers', data)
  },
  update: (providerId, data) => {
    return api.put(`/ai/providers/${providerId}`, data)
  },
  delete: (providerId) => {
    return api.delete(`/ai/providers/${providerId}`)
  }
}

export const aiModelApi = {
  getPage: (page = 1, pageSize = 10, providerId = null, keyword = '') => {
    return api.get('/ai/models/page', { params: { page, pageSize, providerId, keyword } })
  },
  getById: (modelId) => {
    return api.get(`/ai/models/${modelId}`)
  },
  getList: (providerId = null) => {
    return api.get('/ai/models/list', { params: { providerId } })
  },
  create: (data) => {
    return api.post('/ai/models', data)
  },
  update: (modelId, data) => {
    return api.put(`/ai/models/${modelId}`, data)
  },
  delete: (modelId) => {
    return api.delete(`/ai/models/${modelId}`)
  }
}

export const aiStatisticsApi = {
  getOverview: (startDate = null, endDate = null) => {
    return api.get('/ai/statistics/overview', { params: { startDate, endDate } })
  }
}

export const aiConversationApi = {
  getPage: (page = 1, pageSize = 10, modelId = null, status = null) => {
    return api.get('/ai/conversations/page', { params: { page, pageSize, modelId, status } })
  },
  getById: (conversationId) => {
    return api.get(`/ai/conversations/${conversationId}`)
  },
  create: (modelId, title = '') => {
    return api.post('/ai/conversations', { modelId, title })
  },
  archive: (conversationId) => {
    return api.put(`/ai/conversations/${conversationId}/archive`)
  },
  delete: (conversationId) => {
    return api.delete(`/ai/conversations/${conversationId}`)
  },
  getMessages: (conversationId, page = 1, pageSize = 20) => {
    return api.get(`/ai/conversations/${conversationId}/messages`, { params: { page, pageSize } })
  },
  sendMessage: (conversationId, content) => {
    return api.post(`/ai/conversations/${conversationId}/messages`, { content })
  }
}

export default api
