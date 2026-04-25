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

export default api
