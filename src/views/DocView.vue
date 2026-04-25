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
          <div class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-file-document</v-icon>
            <span class="font-weight-medium">{{ item.docTitle }}</span>
          </div>
        </template>
        <template v-slot:item.uploadPath="{ item }">
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <span v-bind="props" class="text-truncate" style="max-width: 200px;">
                {{ item.uploadPath || '-' }}
              </span>
            </template>
            {{ item.uploadPath }}
          </v-tooltip>
        </template>
        <template v-slot:item.tags="{ item }">
          <v-chip
            v-for="tag in item.tags"
            :key="tag.tagId"
            size="small"
            class="mr-1 mb-1"
            color="primary"
            variant="tonal"
          >
            {{ tag.tagName }}
          </v-chip>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn icon size="small" variant="text" @click="openDialog(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="error" @click="confirmDelete(item)">
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
import { docApi, tagApi } from '@/api'

const search = ref('')
const loading = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const valid = ref(false)
const isEdit = ref(false)
const deleteItem = ref(null)
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
  { title: '操作', key: 'actions', sortable: false, width: '120px' }
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
</style>
