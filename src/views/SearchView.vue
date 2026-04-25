<template>
  <div class="search-view">
    <div class="content">
      <div class="header">
        <h1 class="text-h4 mb-2 font-weight-bold">
          智能搜索
        </h1>
        <p class="text-body-1 text-grey mb-4">通过标签组合智能检索文档，了解文档与标签的匹配程度</p>
      </div>

      <v-card class="mb-6">
        <v-card-text class="pa-5">
          <v-alert type="info" variant="tonal" class="mb-4">
            <template v-slot:title>💡 温馨提示</template>
            <ul class="mt-1" style="padding-left: 20px; line-height: 1.8;">
              <li>选择多个标签进行组合检索，系统会按匹配度智能排序</li>
              <li><strong class="text-success">精确匹配</strong>：文档包含所有选中的标签</li>
              <li><strong class="text-primary">相关度</strong>：文档标签与选中标签的匹配比例，比例越高越相关</li>
            </ul>
          </v-alert>

          <div class="tag-selection-area">
            <div class="d-flex align-center flex-wrap gap-4 mb-3">
              <div class="section-label">
                <v-icon class="mr-2" size="small">mdi-tag-multiple</v-icon>
                选择标签
              </div>
              <v-btn 
                v-if="selectedTags.length"
                variant="text" 
                size="small" 
                color="primary"
                @click="selectedTags = []"
              >
                清空
              </v-btn>
            </div>

            <div class="tags-container">
              <v-chip
                v-for="tag in availableTags"
                :key="tag.tagId"
                :color="isSelected(tag.tagId) ? 'primary' : 'default'"
                :variant="isSelected(tag.tagId) ? 'flat' : 'outlined'"
                size="large"
                class="tag-chip mr-2 mb-2"
                @click="toggleTag(tag)"
              >
                <v-icon start size="small">{{ isSelected(tag.tagId) ? 'mdi-check-circle' : 'mdi-tag' }}</v-icon>
                {{ tag.tagName }}
              </v-chip>
            </div>

            <v-expand-transition>
              <div v-if="selectedTags.length" class="selected-info mt-4">
                <div class="d-flex align-center justify-space-between">
                  <span class="text-body-2">
                    已选择 <span class="text-primary font-weight-bold">{{ selectedTags.length }}</span> 个标签
                  </span>
                  <v-btn 
                    color="primary"
                    :loading="loading"
                    prepend-icon="mdi-magnify"
                    @click="search"
                  >
                    开始搜索
                  </v-btn>
                </div>
                <div class="mt-2">
                  <v-chip
                    v-for="tag in selectedTags"
                    :key="tag.tagId"
                    color="primary"
                    variant="tonal"
                    size="small"
                    class="mr-1 mb-1"
                    closable
                    @click:close="removeTag(tag.tagId)"
                  >
                    {{ tag.tagName }}
                  </v-chip>
                </div>
              </div>
            </v-expand-transition>
          </div>
        </v-card-text>
      </v-card>

      <v-expand-transition>
        <v-card v-if="searched">
          <v-card-title class="d-flex align-center pa-5 pb-0">
            <v-icon class="mr-2" color="primary">mdi-file-search</v-icon>
            <span>搜索结果</span>
            <v-chip v-if="total > 0" color="primary" size="small" class="ml-2">
              {{ total }} 篇文档
            </v-chip>
          </v-card-title>

          <v-card-text class="pa-5">
            <div v-if="loading" class="d-flex justify-center align-center py-8">
              <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
            </div>

            <div v-else-if="items.length">
              <v-table>
                <thead>
                  <tr>
                    <th style="width: 30%">文档</th>
                    <th style="width: 15%">匹配类型</th>
                    <th style="width: 25%">相关度</th>
                    <th>标签</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in items"
                    :key="item.docId"
                    class="result-row"
                  >
                    <td>
                      <div class="d-flex align-center">
                        <v-icon color="primary" class="mr-2" size="small">mdi-file-document</v-icon>
                        <span class="font-weight-medium">{{ item.docTitle }}</span>
                      </div>
                    </td>
                    <td>
                      <v-chip
                        :color="item.isExactMatch ? 'success' : 'grey'"
                        :variant="item.isExactMatch ? 'flat' : 'tonal'"
                        size="small"
                      >
                        {{ item.isExactMatch ? '精确匹配' : '部分匹配' }}
                      </v-chip>
                    </td>
                    <td>
                      <div class="d-flex align-center gap-2">
                        <v-progress-linear
                          :model-value="item.relevanceScore * 100"
                          color="primary"
                          height="20"
                          rounded
                          style="width: 100px"
                        >
                          <span class="text-caption text-white">{{ Math.round(item.relevanceScore * 100) }}%</span>
                        </v-progress-linear>
                        <span class="text-caption text-grey">
                          {{ item.matchCount }}/{{ selectedTags.length }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <v-chip
                        v-for="tag in item.tags"
                        :key="tag.tagId"
                        size="x-small"
                        :color="isTagSelected(tag.tagId) ? 'primary' : 'grey'"
                        :variant="isTagSelected(tag.tagId) ? 'flat' : 'tonal'"
                        class="mr-1"
                      >
                        {{ tag.tagName }}
                      </v-chip>
                    </td>
                  </tr>
                </tbody>
              </v-table>

              <div v-if="total > items.length" class="d-flex justify-center mt-4">
                <v-pagination
                  v-model="page"
                  :length="Math.ceil(total / pageSize)"
                  :total-visible="5"
                  @update:model-value="search({ page: $event })"
                ></v-pagination>
              </div>
            </div>

            <div v-else class="empty-state py-8 text-center">
              <v-icon size="64" color="grey-lighten-1">mdi-file-search-outline</v-icon>
              <p class="text-body-1 text-grey mt-3">未找到匹配的文档</p>
              <p class="text-caption text-grey-darken-1">尝试选择其他标签组合进行搜索</p>
            </div>
          </v-card-text>
        </v-card>
      </v-expand-transition>
    </div>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">关闭</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { docApi, tagApi } from '@/api'

const loading = ref(false)
const searched = ref(false)
const selectedTags = ref([])
const availableTags = ref([])
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
})

const showMessage = (text, color = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

const isSelected = (tagId) => {
  return selectedTags.value.some(t => t.tagId === tagId)
}

const isTagSelected = (tagId) => {
  return selectedTags.value.some(t => t.tagId === tagId)
}

const toggleTag = (tag) => {
  if (isSelected(tag.tagId)) {
    removeTag(tag.tagId)
  } else {
    selectedTags.value.push(tag)
  }
}

const removeTag = (tagId) => {
  selectedTags.value = selectedTags.value.filter(t => t.tagId !== tagId)
}

const fetchTags = async () => {
  try {
    const res = await tagApi.getPage(1, 100)
    if (res.data.code === 200) {
      availableTags.value = res.data.data.list || []
    }
  } catch (e) {
    console.error('获取标签失败:', e)
    showMessage('获取标签失败', 'error')
  }
}

const search = async (options = {}) => {
  if (!selectedTags.value.length) return
  
  loading.value = true
  searched.value = true
  try {
    const currentPage = options.page || page.value
    const tagIds = selectedTags.value.map(t => t.tagId)
    
    const res = await docApi.searchByTags(tagIds, currentPage, pageSize.value)
    if (res.data.code === 200) {
      items.value = res.data.data.list || []
      total.value = res.data.data.total || 0
      page.value = currentPage
    } else {
      showMessage(res.data.message || '搜索失败', 'error')
    }
  } catch (e) {
    console.error('搜索失败:', e)
    showMessage('搜索失败: ' + (e.response?.data?.message || e.message), 'error')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchTags()
})
</script>

<style scoped>
.search-view {
  min-height: 100vh;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header {
  margin-bottom: 24px;
}

.section-label {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
}

.tag-chip {
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-chip:hover {
  transform: scale(1.05);
}

.selected-info {
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.result-row {
  transition: background 0.2s ease;
}

.result-row:hover {
  background: #f5f5f5 !important;
}

.empty-state {
  background: #fafafa;
  border-radius: 8px;
}
</style>
