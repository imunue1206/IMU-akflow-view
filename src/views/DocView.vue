<template>
  <div class="doc-view">
    <div class="header">
      <h1 class="text-h4 mb-2">文档管理</h1>
      <p class="text-body-1 text-grey mb-4">管理知识文档，支持标签分类和全文检索</p>
    </div>

    <v-card>
      <v-card-title class="d-flex align-center flex-wrap gap-2">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="搜索文档"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 300px"
          @keyup.enter="fetchData"
        ></v-text-field>
        <v-spacer></v-spacer>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog()">
          新建文档
        </v-btn>
      </v-card-title>

      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :items-length="total"
        @update:options="fetchData"
      >
        <template v-slot:item.docTitle="{ item }">
          <div class="d-flex align-center cursor-pointer" @click="viewDoc(item)">
            <v-icon class="mr-2" color="primary">mdi-file-document</v-icon>
            <span class="font-weight-medium text-primary">{{ item.docTitle }}</span>
          </div>
        </template>
        <template v-slot:item.tags="{ item }">
          <div class="d-flex align-center flex-wrap">
            <v-chip
              v-for="tag in item.tags"
              :key="tag.tagId"
              size="small"
              class="mr-1 mb-1"
              color="primary"
              variant="tonal"
              style="cursor: pointer"
              title="点击编辑标签"
              @click="openEditTagDialog(item)"
            >
              {{ tag.tagName }}
            </v-chip>
          </div>
        </template>
        <template v-slot:item.createTime="{ item }">
          {{ formatDateTime(item.createTime) }}
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn icon size="small" variant="text" color="primary" title="导出" @click="quickExport(item)">
            <v-icon>mdi-download</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="error" title="删除" @click="confirmDelete(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="820" persistent>
      <v-card class="create-dialog">
        <v-card-title class="d-flex align-center pa-4">
          <span class="text-h6">{{ isEdit ? '编辑标签' : '新建文档' }}</span>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" size="small" @click="dialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>

        <v-tabs
          v-if="!isEdit"
          v-model="createTab"
          color="primary"
          density="comfortable"
          grow
          class="create-tabs"
        >
          <v-tab value="drop">
            <v-icon class="mr-2" size="20">mdi-cloud-upload-outline</v-icon>
            拖拽上传
          </v-tab>
          <v-tab value="compose">
            <v-icon class="mr-2" size="20">mdi-pencil-plus-outline</v-icon>
            在线编写
          </v-tab>
        </v-tabs>
        <v-divider v-if="!isEdit"></v-divider>

        <v-card-text class="pa-4">
          <!-- 编辑标签 -->
          <template v-if="isEdit">
            <v-alert type="info" density="compact" variant="tonal" class="mb-3">
              文件名：{{ formData.path }}
            </v-alert>
            <v-combobox
              v-model="formData.selectedTags"
              :items="availableTags"
              item-title="tagName"
              item-value="tagId"
              label="选择标签"
              multiple
              chips
              closable-chips
              variant="outlined"
              hint="选择已存在的标签"
            ></v-combobox>
          </template>

          <!-- 拖拽上传 -->
          <template v-else-if="createTab === 'drop'">
            <div
              class="drop-zone"
              :class="{ 'drop-zone--active': dragActive, 'drop-zone--filled': !!selectedFile }"
              @dragenter.prevent="dragActive = true"
              @dragover.prevent="dragActive = true"
              @dragleave.prevent="dragActive = false"
              @drop.prevent="onFileDrop"
              @click="triggerFilePick"
            >
              <input
                ref="fileInputRef"
                type="file"
                accept=".md,text/markdown"
                class="d-none"
                @change="onFileChange"
              />

              <template v-if="!selectedFile">
                <v-icon size="56" :color="dragActive ? 'primary' : 'grey-lighten-1'">
                  {{ dragActive ? 'mdi-file-download-outline' : 'mdi-cloud-upload-outline' }}
                </v-icon>
                <div class="drop-zone__title mt-3">
                  {{ dragActive ? '松开即可上传' : '将 Markdown 文件拖拽到此处' }}
                </div>
                <div class="drop-zone__hint mt-1">或点击选择文件</div>
              </template>

              <template v-else>
                <v-icon size="44" color="primary">mdi-language-markdown</v-icon>
                <div class="drop-zone__title mt-3 text-body-1">
                  {{ selectedFile.name }}
                </div>
                <div class="mt-2">
                  <v-chip size="x-small" color="primary" variant="tonal">
                    {{ formatSize(selectedFile.size) }}
                  </v-chip>
                  <v-chip size="x-small" color="grey" variant="tonal" class="ml-1">
                    {{ droppedContent.length }} 字符
                  </v-chip>
                  <v-chip
                    size="x-small"
                    color="grey"
                    variant="text"
                    class="ml-1"
                    @click.stop="clearSelectedFile"
                  >
                    移除
                  </v-chip>
                </div>
              </template>
            </div>

            <div class="d-flex align-center mt-3">
              <v-icon size="16" color="grey" class="mr-1">mdi-information-outline</v-icon>
              <span class="text-caption text-grey">
                {{ readingFile ? '正在读取文件内容…' : '仅支持 Markdown（.md）格式，同名文档将自动覆盖' }}
              </span>
            </div>

            <v-combobox
              v-model="formData.selectedTags"
              :items="availableTags"
              item-title="tagName"
              item-value="tagId"
              label="选择标签"
              multiple
              chips
              closable-chips
              variant="outlined"
              class="mt-4"
              hide-details
            ></v-combobox>
          </template>

          <!-- 在线编写：点击 Tab 由脚本接管，直接打开沉浸式编辑器 -->
        </v-card-text>

        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="dialog = false">取消</v-btn>
          <v-btn v-if="isEdit" color="primary" :loading="saving" @click="save">
            保存
          </v-btn>
          <v-btn v-else color="primary" :loading="saving" :disabled="!canSubmit" @click="save">
            上传
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 沉浸式在线编写/编辑（全定制 overlay，不走 v-dialog） -->
    <ComposeEditor
      v-model="composeOpen"
      :doc="composeDoc"
      :available-tags="availableTags"
      :saving="saving"
      @create="onEditorCreate"
      @save="onEditorSave"
    />

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
            prepend-icon="mdi-pencil"
            @click="openImmersiveEdit(viewItem)"
          >
            编辑
          </v-btn>
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
            创建于 {{ formatDateTime(viewItem?.createTime) }}
          </span>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>确定要删除文档 "{{ deleteItem?.docTitle }}" 吗？</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">取消</v-btn>
          <v-btn color="error" :loading="deleting" @click="doDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
      {{ snackbar.text }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar.show = false">关闭</v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import MarkdownIt from 'markdown-it'
import { docApi, tagApi } from '@/api'
import ComposeEditor from '@/components/ComposeEditor.vue'

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const search = ref('')
const loading = ref(false)
const dialog = ref(false)
const viewDialog = ref(false)
const deleteDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const viewLoading = ref(false)
const isEdit = ref(false)
const deleteItem = ref(null)
const viewItem = ref(null)
const renderedContent = ref('')
const viewError = ref('')
const items = ref([])
const total = ref(0)
const availableTags = ref([])

// 新建文档 —— 拖拽上传（小弹窗）/ 在线编写（沉浸式编辑器）
const createTab = ref('drop')
const dragActive = ref(false)
const selectedFile = ref(null)
const droppedContent = ref('')
const readingFile = ref(false)
const fileInputRef = ref(null)
const composeOpen = ref(false)
// 沉浸式编辑器的模式：null = 创建，文档对象 = 编辑
const composeDoc = ref(null)

const MAX_FILE_SIZE = 10 * 1024 * 1024

// 「在线编写」Tab 作为启动器：关掉小弹窗，弹出沉浸式编辑器
watch(createTab, (val) => {
  if (val === 'compose') {
    createTab.value = 'drop'
    composeDoc.value = null
    dialog.value = false
    composeOpen.value = true
  }
})

const onEditorCreate = async (payload) => {
  saving.value = true
  try {
    const res = await docApi.create(payload.docTitle, payload.docContent, payload.tagIds)
    if (res.data.code === 200) {
      showMessage('创建成功')
      composeOpen.value = false
      composeDoc.value = null
      fetchData()
    } else {
      showMessage(res.data.message || '创建失败', 'error')
    }
  } catch (e) {
    console.error('创建失败:', e)
    showMessage('操作失败: ' + (e.response?.data?.message || e.message), 'error')
  } finally {
    saving.value = false
  }
}

// 沉浸式编辑保存（原 viewer 内编辑的逻辑）
const onEditorSave = async (payload) => {
  saving.value = true
  try {
    // 标题有变更时先改标题（同名冲突会在此报错并中止）
    if (payload.docTitle !== composeDoc.value?.docTitle) {
      const titleRes = await docApi.updateTitle(payload.docId, payload.docTitle)
      if (titleRes.data.code !== 200) {
        showMessage(titleRes.data.message || '标题修改失败', 'error')
        return
      }
    }

    const tagIds = payload.tagIds
    await docApi.updateTags(payload.docId, tagIds)

    const res = await docApi.updateContent(payload.docId, payload.docContent)
    if (res.data.code === 200) {
      showMessage('保存成功')
      composeOpen.value = false
      composeDoc.value = null
      fetchData()
    } else {
      showMessage(res.data.message || '保存失败', 'error')
    }
  } catch (e) {
    console.error('保存失败:', e)
    showMessage('保存失败: ' + (e.response?.data?.message || e.message), 'error')
  } finally {
    saving.value = false
  }
}

const canSubmit = computed(() => {
  if (isEdit.value) return true
  return !!selectedFile.value && !readingFile.value
})

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success'
})

const headers = [
  { title: '文档', key: 'docTitle', width: '250px' },
  { title: '标签', key: 'tags', width: '200px' },
  { title: '创建时间', key: 'createTime', width: '180px' },
  { title: '操作', key: 'actions', sortable: false, width: '150px' }
]

const formData = reactive({
  docId: null,
  path: '',
  selectedTags: []
})

const showMessage = (text, color = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

const fetchData = async (options = { page: 1, itemsPerPage: 10 }) => {
  loading.value = true
  try {
    const page = options.page || 1
    const pageSize = options.itemsPerPage || 10
    const res = await docApi.getPage(page, pageSize, search.value)
    if (res.data.code === 200) {
      items.value = res.data.data.list || []
      total.value = res.data.data.total || 0
    } else {
      showMessage(res.data.message || '获取文档失败', 'error')
    }
  } catch (e) {
    console.error('获取文档失败:', e)
    showMessage('获取文档失败', 'error')
  } finally {
    loading.value = false
  }
}

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

// 从 viewer 进入沉浸式编辑
const openImmersiveEdit = async (doc) => {
  await fetchTags()
  composeDoc.value = doc
  viewDialog.value = false
  composeOpen.value = true
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

const openDialog = async (item = null) => {
  await fetchTags()
  if (item) {
    isEdit.value = true
    Object.assign(formData, {
      docId: item.docId,
      path: item.uploadPath || '',
      selectedTags: item.tags || []
    })
  } else {
    isEdit.value = false
    Object.assign(formData, {
      docId: null,
      path: '',
      selectedTags: []
    })
    createTab.value = 'drop'
    dragActive.value = false
    selectedFile.value = null
    droppedContent.value = ''
    readingFile.value = false
  }
  dialog.value = true
}

const formatDateTime = (value) => {
  if (!value) return '-'
  return value.slice(0, 19).replace('T', ' ')
}

const formatSize = (size) => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const isMarkdownFile = (file) => /\.md$/i.test(file.name)

const applyFile = async (file) => {
  if (!file) return
  if (!isMarkdownFile(file)) {
    showMessage('仅支持 .md 格式文件', 'error')
    return
  }
  if (file.size > MAX_FILE_SIZE) {
    showMessage('文件过大，最大支持 10MB', 'error')
    return
  }

  readingFile.value = true
  try {
    droppedContent.value = await file.text()
    selectedFile.value = file
  } catch (e) {
    console.error('读取文件失败:', e)
    showMessage('读取文件失败', 'error')
  } finally {
    readingFile.value = false
  }
}

const triggerFilePick = () => {
  fileInputRef.value?.click()
}

const onFileChange = (e) => {
  applyFile(e.target.files?.[0])
  e.target.value = ''
}

const onFileDrop = (e) => {
  dragActive.value = false
  applyFile(e.dataTransfer?.files?.[0])
}

const clearSelectedFile = () => {
  selectedFile.value = null
  droppedContent.value = ''
}

const openEditTagDialog = async (item) => {
  await fetchTags()
  isEdit.value = true
  Object.assign(formData, {
    docId: item.docId,
    path: item.uploadPath || '',
    selectedTags: item.tags || []
  })
  dialog.value = true
}

const save = async () => {
  saving.value = true
  try {
    const tagIds = formData.selectedTags
      .map(tag => (typeof tag === 'object' ? tag.tagId : tag))

    let res
    if (isEdit.value) {
      res = await docApi.updateTags(formData.docId, tagIds)
    } else {
      res = await docApi.create(selectedFile.value.name, droppedContent.value, tagIds)
    }

    if (res.data.code === 200) {
      showMessage(isEdit.value ? '更新成功' : '上传成功')
      dialog.value = false
      fetchData()
    } else {
      showMessage(res.data.message || '操作失败', 'error')
    }
  } catch (e) {
    console.error('保存失败:', e)
    showMessage('操作失败: ' + (e.response?.data?.message || e.message), 'error')
  } finally {
    saving.value = false
  }
}

const confirmDelete = (item) => {
  deleteItem.value = item
  deleteDialog.value = true
}

const doDelete = async () => {
  deleting.value = true
  try {
    const res = await docApi.delete(deleteItem.value.docId)
    if (res.data.code === 200) {
      showMessage('删除成功')
      deleteDialog.value = false
      fetchData()
    } else {
      showMessage(res.data.message || '删除失败', 'error')
    }
  } catch (e) {
    console.error('删除失败:', e)
    showMessage('删除失败: ' + (e.response?.data?.message || e.message), 'error')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.doc-view {
  padding: 24px;
}
.header {
  margin-bottom: 24px;
}
.cursor-pointer {
  cursor: pointer;
}
.create-dialog {
  border-radius: 12px;
}
.create-tabs {
  border-bottom: none;
}
.create-tabs .v-tab {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  justify-content: center;
}
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  padding: 32px 24px;
  border: 2px dashed #d5d9e0;
  border-radius: 12px;
  background: #fafbfc;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.drop-zone:hover {
  border-color: #1976d2;
  background: #f5f9ff;
}
.drop-zone--active {
  border-color: #1976d2;
  background: #eaf3ff;
  transform: scale(1.01);
}
.drop-zone--filled {
  border-style: solid;
  border-color: #1976d2;
  background: #f5f9ff;
}
.drop-zone__title {
  font-size: 15px;
  font-weight: 500;
  color: #37474f;
  word-break: break-all;
}
.drop-zone__hint {
  font-size: 13px;
  color: #90a4ae;
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
  max-width: 70%;
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
</style>
