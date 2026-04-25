<template>
  <div class="tag-view">
    <div class="header">
      <h1 class="text-h4 mb-4">标签管理</h1>
      <p class="text-body-1 text-grey mb-4">管理文档标签，便于分类和检索</p>
    </div>

    <v-card>
      <v-card-title class="d-flex align-center flex-wrap gap-2">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="搜索标签"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 300px"
          @keyup.enter="fetchData"
        ></v-text-field>
        <v-spacer></v-spacer>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog()">
          新建标签
        </v-btn>
      </v-card-title>

      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :items-length="total"
        @update:options="fetchData"
      >
        <template v-slot:item.tagName="{ item }">
          <v-chip color="primary" variant="tonal">
            {{ item.tagName }}
          </v-chip>
        </template>
        <template v-slot:item.docCount="{ item }">
          <v-btn variant="text" size="small" @click="showTagDocs(item)">
            {{ item.docCount || 0 }} 篇文档
          </v-btn>
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

    <v-dialog v-model="dialog" max-width="500" persistent>
      <v-card>
        <v-card-title class="text-h5 pa-4">
          {{ isEdit ? '编辑' : '新建' }}标签
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-4">
          <v-form ref="formRef" v-model="valid">
            <v-text-field
              v-model="formData.tagName"
              label="标签名称"
              :rules="[v => !!v || '名称必填']"
              variant="outlined"
              class="mb-3"
            ></v-text-field>
            <v-textarea
              v-model="formData.tagDesc"
              label="标签描述"
              variant="outlined"
              rows="3"
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="dialog = false">取消</v-btn>
          <v-btn color="primary" :loading="saving" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card>
        <v-card-title>确认删除</v-card-title>
        <v-card-text>确定要删除标签 "{{ deleteItem?.tagName }}" 吗？</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">取消</v-btn>
          <v-btn color="error" :loading="deleting" @click="doDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="docsDialog" max-width="800">
      <v-card>
        <v-card-title class="text-h5 pa-4">
          标签 "{{ currentTag?.tagName }}" 关联的文档
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-list v-if="tagDocs.length">
            <v-list-item
              v-for="doc in tagDocs"
              :key="doc.docId"
              :title="doc.docTitle"
              :subtitle="doc.docContent?.substring(0, 100) + '...'"
            >
              <template v-slot:prepend>
                <v-icon>mdi-file-document</v-icon>
              </template>
            </v-list-item>
          </v-list>
          <v-empty-state v-else icon="mdi-file-document-outline" title="暂无文档"></v-empty-state>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="docsDialog = false">关闭</v-btn>
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
import { tagApi } from '@/api'

const search = ref('')
const loading = ref(false)
const dialog = ref(false)
const deleteDialog = ref(false)
const docsDialog = ref(false)
const saving = ref(false)
const deleting = ref(false)
const valid = ref(false)
const isEdit = ref(false)
const deleteItem = ref(null)
const currentTag = ref(null)
const formRef = ref(null)
const items = ref([])
const total = ref(0)
const tagDocs = ref([])

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

const headers = [
  { title: '标签名称', key: 'tagName', width: '150px' },
  { title: '描述', key: 'tagDesc' },
  { title: '文档数', key: 'docCount', width: '120px' },
  { title: '创建时间', key: 'createTime', width: '180px' },
  { title: '操作', key: 'actions', sortable: false, width: '120px' }
]

const formData = reactive({
  tagId: null,
  tagName: '',
  tagDesc: ''
})

const fetchData = async (options = { page: 1, itemsPerPage: 10 }) => {
  loading.value = true
  try {
    const page = options.page || 1
    const pageSize = options.itemsPerPage || 10
    const res = await tagApi.getPage(page, pageSize, search.value)
    if (res.data.code === 200) {
      items.value = res.data.data.list || []
      total.value = res.data.data.total || 0
    } else {
      showMessage(res.data.message || '获取标签失败', 'error')
    }
  } catch (e) {
    console.error('获取标签失败:', e)
    showMessage('获取标签失败', 'error')
  } finally {
    loading.value = false
  }
}

const openDialog = (item = null) => {
  if (item) {
    isEdit.value = true
    Object.assign(formData, {
      tagId: item.tagId,
      tagName: item.tagName,
      tagDesc: item.tagDesc
    })
  } else {
    isEdit.value = false
    Object.assign(formData, {
      tagId: null,
      tagName: '',
      tagDesc: ''
    })
  }
  dialog.value = true
}

const save = async () => {
  if (!valid.value) return
  saving.value = true
  try {
    const data = {
      tagName: formData.tagName,
      tagDesc: formData.tagDesc
    }
    
    let res
    if (isEdit.value) {
      res = await tagApi.update(formData.tagId, data)
    } else {
      res = await tagApi.create(data)
    }
    
    if (res.data.code === 200) {
      showMessage(isEdit.value ? '更新成功' : '创建成功')
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
    const res = await tagApi.delete(deleteItem.value.tagId)
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

const showTagDocs = async (item) => {
  currentTag.value = item
  docsDialog.value = true
  try {
    const res = await tagApi.getDocs(item.tagId)
    if (res.data.code === 200) {
      tagDocs.value = res.data.data.list || []
    }
  } catch (e) {
    console.error('获取文档失败:', e)
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.tag-view {
  padding: 24px;
}
.header {
  margin-bottom: 24px;
}
</style>
