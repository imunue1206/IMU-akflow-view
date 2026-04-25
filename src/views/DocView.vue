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

    <v-dialog v-model="dialog" max-width="600" persistent>
      <v-card>
        <v-card-title class="text-h5 pa-4">
          {{ isEdit ? '编辑标签' : '新建文档' }}
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-4">
          <v-form ref="formRef" v-model="valid">
            <v-text-field
              v-if="!isEdit"
              v-model="formData.path"
              label="文件路径"
              variant="outlined"
              class="mb-3"
              placeholder="/Users/xxx/Documents/xxx.md"
              hint="输入本地文件的完整路径"
              persistent-hint
            ></v-text-field>

            <v-alert v-if="isEdit" type="info" density="compact" class="mb-3">
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
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="dialog = false">取消</v-btn>
          <v-btn 
            v-if="!isEdit" 
            color="primary" 
            :loading="saving" 
            :disabled="!formData.path" 
            @click="save"
          >
            上传
          </v-btn>
          <v-btn 
            v-else 
            color="primary" 
            :loading="saving" 
            @click="save"
          >
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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
            v-if="!isEditing"
            variant="text" 
            prepend-icon="mdi-pencil"
            @click="enableEdit"
          >
            编辑
          </v-btn>
          <v-btn 
            v-if="isEditing"
            variant="text" 
            color="error"
            @click="cancelEdit"
          >
            取消
          </v-btn>
          <v-btn 
            v-if="isEditing"
            color="primary"
            :loading="saving"
            @click="saveContent"
          >
            保存
          </v-btn>
          <v-btn 
            v-if="!isEditing"
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
            <div v-if="isEditing" class="edit-mode">
              <v-card class="mb-4" flat>
                <v-card-title class="text-subtitle-1 pb-2">标签</v-card-title>
                <v-card-text class="pt-0">
                  <v-combobox
                    v-model="editTags"
                    :items="availableTags"
                    item-title="tagName"
                    item-value="tagId"
                    label="选择标签"
                    multiple
                    chips
                    closable-chips
                    variant="outlined"
                  ></v-combobox>
                </v-card-text>
              </v-card>
              <v-card flat>
                <v-card-title class="text-subtitle-1 pb-2">内容</v-card-title>
                <v-card-text class="pt-0">
                  <textarea
                    v-model="editContent"
                    class="markdown-editor"
                    placeholder="开始编辑..."
                  ></textarea>
                </v-card-text>
              </v-card>
            </div>
            <div v-else class="markdown-content" v-html="renderedContent"></div>
          </div>
        </v-card-text>

        <v-divider v-if="!isEditing"></v-divider>

        <v-card-actions v-if="!isEditing" class="pa-3">
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
import { ref, reactive, onMounted } from 'vue'
import MarkdownIt from 'markdown-it'
import { docApi, tagApi } from '@/api'

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
const valid = ref(false)
const isEdit = ref(false)
const isEditing = ref(false)
const deleteItem = ref(null)
const viewItem = ref(null)
const editContent = ref('')
const editTags = ref([])
const renderedContent = ref('')
const viewError = ref('')
const formRef = ref(null)
const items = ref([])
const total = ref(0)
const availableTags = ref([])

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
  isEditing.value = false
  viewLoading.value = true
  viewError.value = ''
  renderedContent.value = ''
  editContent.value = ''
  editTags.value = []
  
  try {
    const res = await docApi.getById(item.docId)
    if (res.data.code === 200) {
      const doc = res.data.data
      viewItem.value = doc
      editContent.value = doc.docContent || ''
      editTags.value = doc.tags || []
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

const enableEdit = async () => {
  await fetchTags()
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  editContent.value = viewItem.value?.docContent || ''
  editTags.value = viewItem.value?.tags || []
}

const saveContent = async () => {
  saving.value = true
  try {
    const tagIds = editTags.value
      .map(tag => (typeof tag === 'object' ? tag.tagId : tag))
    
    await docApi.updateTags(viewItem.value.docId, tagIds)
    
    const res = await docApi.updateContent(viewItem.value.docId, editContent.value)
    if (res.data.code === 200) {
      showMessage('保存成功')
      viewItem.value.docContent = editContent.value
      viewItem.value.tags = editTags.value
      renderedContent.value = md.render(editContent.value)
      isEditing.value = false
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
  }
  dialog.value = true
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
      res = await docApi.upload(formData.path, tagIds)
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
.edit-mode {
  padding: 0;
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
.markdown-editor {
  width: 100%;
  height: calc(100vh - 350px);
  padding: 20px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 14px;
  line-height: 1.6;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  resize: none;
  outline: none;
}
.markdown-editor:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}
</style>
