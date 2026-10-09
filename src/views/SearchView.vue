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
              <li><strong class="text-primary">双击直搜</strong>：双击任意标签，立即按当前组合发起搜索，无需再点按钮</li>
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
              <v-tooltip
                v-for="tag in availableTags"
                :key="tag.tagId"
                location="top"
                text="单击选中 / 取消 · 双击直接搜索"
              >
                <template v-slot:activator="{ props: tooltipProps }">
                  <v-chip
                    v-bind="tooltipProps"
                    :color="isSelected(tag.tagId) ? 'primary' : 'default'"
                    :variant="isSelected(tag.tagId) ? 'flat' : 'outlined'"
                    size="large"
                    class="tag-chip mr-2 mb-2"
                    :class="{ 'dbl-searching': dblClickTagId === tag.tagId }"
                    @click="toggleTag(tag)"
                    @dblclick="handleTagDblClick(tag)"
                  >
                    <v-icon start size="small">{{ isSelected(tag.tagId) ? 'mdi-check-circle' : 'mdi-tag' }}</v-icon>
                    {{ tag.tagName }}
                  </v-chip>
                </template>
              </v-tooltip>
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
                    <th style="width: 15%">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in items"
                    :key="item.docId"
                    class="result-row"
                  >
                    <td>
                      <div class="d-flex align-center cursor-pointer" @click="viewDoc(item)">
                        <v-icon color="primary" class="mr-2" size="small">mdi-file-document</v-icon>
                        <span class="font-weight-medium text-primary">{{ item.docTitle }}</span>
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
                      <v-btn icon size="small" variant="text" title="查看" @click="viewDoc(item)">
                        <v-icon size="small">mdi-eye</v-icon>
                      </v-btn>
                      <v-btn icon size="small" variant="text" color="primary" title="导出" @click="quickExport(item)">
                        <v-icon size="small">mdi-download</v-icon>
                      </v-btn>
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

    <v-dialog v-model="viewDialog" fullscreen>
      <v-card class="doc-viewer-card">
        <v-toolbar color="transparent" flat>
          <v-btn icon variant="text" @click="viewDialog = false">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <v-toolbar-title class="font-weight-medium">
            {{ viewItem?.docTitle }}
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn 
            variant="text" 
            prepend-icon="mdi-download"
            @click="exportDoc"
          >
            导出
          </v-btn>
        </v-toolbar>

        <v-divider></v-divider>

        <v-card-text class="pa-0">
          <div v-if="viewLoading" class="d-flex justify-center align-center py-16">
            <v-progress-circular indeterminate color="primary" size="48"></v-progress-circular>
          </div>

          <div v-else-if="viewError" class="pa-8 text-center">
            <v-icon size="64" color="error">mdi-alert-circle</v-icon>
            <p class="mt-4 text-body-1 text-grey">{{ viewError }}</p>
          </div>

          <div v-else class="doc-container">
            <div class="markdown-content" v-html="renderedContent"></div>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions class="pa-3">
          <v-chip
            v-for="tag in viewItem?.tags"
            :key="tag.tagId"
            size="small"
            class="mr-1"
            color="primary"
            variant="tonal"
          >
            {{ tag.tagName }}
          </v-chip>
          <v-spacer></v-spacer>
          <span class="text-caption text-grey">
            创建于 {{ viewItem?.createTime?.slice(0, 10) }}
          </span>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">关闭</v-btn>
      </template>
    </v-snackbar>

    <!-- 双击直搜：毛玻璃结果弹层（苹果 spring 弹入） -->
    <Teleport to="body">
      <Transition name="rp-fade">
        <div
          v-if="resultPanel"
          class="rp-overlay"
          @click.self="resultPanel = false"
        >
          <div class="rp-panel">
            <div class="rp-header">
              <div class="rp-header__title">
                <v-icon color="primary">mdi-file-search</v-icon>
                <span class="text-h6 font-weight-bold">检索结果</span>
                <v-chip v-if="loading" size="small" variant="tonal" color="primary">搜索中…</v-chip>
                <v-chip v-else-if="total > 0" size="small" variant="tonal" color="primary">{{ total }} 篇文档</v-chip>
                <v-chip v-else size="small" variant="tonal" color="grey">无匹配</v-chip>
              </div>
              <div class="rp-header__tags">
                <v-chip
                  v-for="t in selectedTags"
                  :key="t.tagId"
                  size="x-small"
                  variant="tonal"
                  color="primary"
                  class="mr-1 mb-1"
                >
                  {{ t.tagName }}
                </v-chip>
              </div>
              <v-btn icon variant="text" size="small" @click="resultPanel = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </div>

            <v-divider></v-divider>

            <div class="rp-body">
              <div v-if="loading" class="d-flex justify-center align-center py-14">
                <v-progress-circular indeterminate color="primary" size="44"></v-progress-circular>
              </div>

              <template v-else-if="items.length">
                <div
                  v-for="item in items"
                  :key="item.docId"
                  class="rp-row"
                  @click="viewDoc(item)"
                >
                  <div class="rp-row__main">
                    <v-icon color="primary" size="small" class="mr-2">mdi-file-document</v-icon>
                    <span class="rp-row__title text-primary">{{ item.docTitle }}</span>
                    <v-chip
                      :color="item.isExactMatch ? 'success' : 'grey'"
                      :variant="item.isExactMatch ? 'flat' : 'tonal'"
                      size="x-small"
                      class="ml-2"
                    >
                      {{ item.isExactMatch ? '精确匹配' : '部分匹配' }}
                    </v-chip>
                  </div>
                  <div class="rp-row__meta">
                    <v-progress-linear
                      :model-value="item.relevanceScore * 100"
                      color="primary"
                      height="16"
                      rounded
                      style="width: 110px"
                    >
                      <span class="text-caption text-white">{{ Math.round(item.relevanceScore * 100) }}%</span>
                    </v-progress-linear>
                    <span class="text-caption text-grey ml-2">{{ item.matchCount }}/{{ selectedTags.length }}</span>
                    <v-btn icon size="x-small" variant="text" color="primary" title="导出" @click.stop="quickExport(item)">
                      <v-icon size="small">mdi-download</v-icon>
                    </v-btn>
                  </div>
                </div>

                <div v-if="total > pageSize" class="d-flex justify-center pt-3">
                  <v-pagination
                    v-model="page"
                    :length="Math.ceil(total / pageSize)"
                    :total-visible="5"
                    density="compact"
                    @update:model-value="search({ page: $event })"
                  ></v-pagination>
                </div>
              </template>

              <div v-else class="rp-empty">
                <v-icon size="56" color="grey-lighten-1">mdi-file-search-outline</v-icon>
                <p class="text-body-2 text-grey mt-3">未找到匹配的文档</p>
                <p class="text-caption text-grey-darken-1">试试其他标签组合</p>
              </div>
            </div>

            <v-divider></v-divider>
            <div class="rp-footer text-caption text-grey">
              点击行查看全文 · ESC 或点击空白处关闭
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import { docApi, tagApi } from '@/api'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const loading = ref(false)
const searched = ref(false)
const viewDialog = ref(false)
const viewLoading = ref(false)
const viewError = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const items = ref([])
const availableTags = ref([])
const selectedTags = ref([])
const viewItem = ref(null)
const renderedContent = ref('')

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

const toggleTag = (tag) => {
  if (isSelected(tag.tagId)) {
    selectedTags.value = selectedTags.value.filter(t => t.tagId !== tag.tagId)
  } else {
    selectedTags.value.push(tag)
  }
}

const removeTag = (tagId) => {
  selectedTags.value = selectedTags.value.filter(t => t.tagId !== tagId)
}

// 双击直搜：确保该标签选中后立即搜索，并播放弹跳动画 + 毛玻璃弹层展示结果
const dblClickTagId = ref(null)
const resultPanel = ref(false)

const handleTagDblClick = (tag) => {
  if (!isSelected(tag.tagId)) {
    selectedTags.value.push(tag)
  }

  dblClickTagId.value = tag.tagId
  setTimeout(() => {
    if (dblClickTagId.value === tag.tagId) dblClickTagId.value = null
  }, 700)

  const n = selectedTags.value.length
  showMessage(
    n > 1
      ? `双击直搜：按已选 ${n} 个标签组合检索中…`
      : `双击直搜：正在检索「${tag.tagName}」`,
    'info'
  )

  search()
  resultPanel.value = true
}

// 弹层打开期间用全局 ESC 监听（不依赖元素焦点，阅读器关闭后依然有效）
// 阅读器开着时 ESC 优先关闭阅读器，再次按 ESC 才关闭弹层
const onGlobalEsc = (e) => {
  if (e.key !== 'Escape') return
  if (viewDialog.value) {
    viewDialog.value = false
    return
  }
  resultPanel.value = false
}

watch(resultPanel, (v) => {
  if (v) {
    document.addEventListener('keydown', onGlobalEsc)
  } else {
    document.removeEventListener('keydown', onGlobalEsc)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalEsc)
})

const fetchTags = async () => {
  try {
    const res = await tagApi.getPage(1, 100)
    if (res.data.code === 200) {
      availableTags.value = res.data.data.list || []
    }
  } catch (e) {
    console.error('获取标签失败:', e)
  }
}

const search = async (options = {}) => {
  if (selectedTags.value.length === 0) {
    showMessage('请先选择标签', 'warning')
    return
  }
  
  loading.value = true
  searched.value = true
  page.value = options.page || 1
  
  try {
    const tagIds = selectedTags.value.map(t => t.tagId)
    const res = await docApi.searchByTags(tagIds, page.value, pageSize.value)
    if (res.data.code === 200) {
      items.value = res.data.data.list || []
      total.value = res.data.data.total || 0
    } else {
      showMessage(res.data.message || '搜索失败', 'error')
    }
  } catch (e) {
    console.error('搜索失败:', e)
    showMessage('搜索失败', 'error')
  } finally {
    loading.value = false
  }
}

const viewDoc = async (item) => {
  viewItem.value = item
  viewDialog.value = true
  viewLoading.value = true
  viewError.value = ''
  renderedContent.value = ''
  
  try {
    const res = await docApi.getById(item.docId)
    if (res.data.code === 200) {
      const doc = res.data.data
      viewItem.value = doc
      renderedContent.value = md.render(doc.docContent || '（文档内容为空）')
    } else {
      viewError.value = res.data.message || '获取文档内容失败'
    }
  } catch (e) {
    console.error('获取文档详情失败:', e)
    viewError.value = e.response?.data?.message || '获取文档内容失败'
  } finally {
    viewLoading.value = false
  }
}

const quickExport = async (item) => {
  try {
    const res = await docApi.export(item.docId)
    const blob = new Blob([res.data], { type: 'text/markdown;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${item.docTitle}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    showMessage('导出成功')
  } catch (e) {
    console.error('导出失败:', e)
    showMessage('导出失败', 'error')
  }
}

const exportDoc = async () => {
  await quickExport(viewItem.value)
}

onMounted(() => {
  fetchTags()
})
</script>

<style scoped>
.search-view {
  padding: 24px;
}
.content {
  max-width: 1200px;
  margin: 0 auto;
}
.header {
  margin-bottom: 24px;
}
.cursor-pointer {
  cursor: pointer;
}
.tag-chip {
  user-select: none;
  transition: transform 0.15s ease;
}
.tag-chip:hover {
  transform: translateY(-1px);
}
.tag-chip.dbl-searching {
  animation: dbl-search-pop 0.65s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  z-index: 1;
}
@keyframes dbl-search-pop {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.28);
    box-shadow: 0 0 0 8px rgba(var(--v-theme-primary), 0.2);
  }
  50% {
    transform: scale(0.92);
  }
  70% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(var(--v-theme-primary), 0);
  }
}
.result-row:hover {
  background: #f5f5f5;
}
.doc-viewer-card {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fafafa;
}
.doc-container {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
}
.markdown-content {
  font-size: 15px;
  line-height: 1.8;
  color: #333;
}
.markdown-content :deep(h1) {
  font-size: 2em;
  font-weight: 600;
  margin: 1em 0 0.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #eee;
}
.markdown-content :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 1em 0 0.5em;
  padding-bottom: 0.2em;
  border-bottom: 1px solid #eee;
}
.markdown-content :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0 0.5em;
}
.markdown-content :deep(p) {
  margin: 0.8em 0;
}
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.8em 0;
}
.markdown-content :deep(li) {
  margin: 0.3em 0;
}
.markdown-content :deep(code) {
  background: #f0f0f0;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.9em;
}
.markdown-content :deep(pre) {
  background: #f6f8fa;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
}
.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
}
.markdown-content :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  margin: 0.8em 0;
  color: #666;
}
.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
}
.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #ddd;
  padding: 0.5em;
  text-align: left;
}
.markdown-content :deep(th) {
  background: #f6f8fa;
}

/* ===== 双击直搜：毛玻璃结果弹层（风格对齐 ComposeEditor） ===== */
.rp-overlay {
  position: fixed;
  inset: 0;
  z-index: 1900;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(22, 30, 42, 0.32);
  backdrop-filter: blur(22px) saturate(1.25);
  -webkit-backdrop-filter: blur(22px) saturate(1.25);
  outline: none;
}
.rp-panel {
  width: min(860px, 92vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(32px) saturate(1.6);
  -webkit-backdrop-filter: blur(32px) saturate(1.6);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 32px 96px rgba(0, 0, 0, 0.32);
  overflow: hidden;
  animation: duang-in 0.5s cubic-bezier(0.22, 1.2, 0.36, 1) both;
}
/* 苹果式 spring 回弹入场：落下 → 过冲 → 回弹 → 归位 */
@keyframes duang-in {
  0% {
    transform: scale(0.82) translateY(30px);
    opacity: 0;
  }
  58% {
    transform: scale(1.05) translateY(0);
    opacity: 1;
  }
  76% {
    transform: scale(0.975);
  }
  90% {
    transform: scale(1.012);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes duang-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.9) translateY(18px);
    opacity: 0;
  }
}
.rp-fade-enter-active {
  transition: opacity 0.24s ease;
}
.rp-fade-leave-active {
  transition: opacity 0.2s ease;
}
.rp-fade-leave-active .rp-panel {
  animation: duang-out 0.2s ease both;
}
.rp-fade-enter-from,
.rp-fade-leave-to {
  opacity: 0;
}
.rp-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px 10px;
  flex-wrap: wrap;
}
.rp-header__title {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.rp-header__tags {
  flex: 1;
  min-width: 120px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}
.rp-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px 12px;
}
.rp-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
  animation: rp-row-in 0.32s ease both;
}
.rp-row:hover {
  background: rgba(25, 118, 210, 0.08);
  transform: translateX(3px);
}
.rp-row__main {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 1;
}
.rp-row__title {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rp-row__meta {
  display: flex;
  align-items: center;
  white-space: nowrap;
}
/* 列表行依次滑入（stagger） */
@keyframes rp-row-in {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
.rp-row:nth-child(1) { animation-delay: 0.04s; }
.rp-row:nth-child(2) { animation-delay: 0.09s; }
.rp-row:nth-child(3) { animation-delay: 0.14s; }
.rp-row:nth-child(4) { animation-delay: 0.19s; }
.rp-row:nth-child(5) { animation-delay: 0.24s; }
.rp-row:nth-child(6) { animation-delay: 0.29s; }
.rp-row:nth-child(7) { animation-delay: 0.34s; }
.rp-row:nth-child(8) { animation-delay: 0.39s; }
.rp-row:nth-child(9) { animation-delay: 0.44s; }
.rp-row:nth-child(10) { animation-delay: 0.49s; }
.rp-empty {
  text-align: center;
  padding: 48px 0;
}
.rp-footer {
  padding: 8px 20px 12px;
  text-align: center;
  opacity: 0.85;
}
</style>
