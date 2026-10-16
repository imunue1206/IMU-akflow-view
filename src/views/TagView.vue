<template>
  <div class="tag-view">

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
          @keyup.enter="onSearch"
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
        :items-per-page="-1"
        hide-default-footer
        @update:options="fetchData"
      >
        <template v-slot:item.tagName="{ item }">
          <div class="tag-name-cell">
            <v-chip color="primary" variant="tonal">
              {{ item.tagName }}
            </v-chip>
            <div
              v-if="item.tagDesc"
              class="tag-name-cell__desc"
              :class="{ 'tag-name-cell__desc--open': isDescExpanded(item.tagId) }"
              :title="item.tagDesc"
              @click.stop="toggleDesc(item.tagId)"
            >{{ item.tagDesc }}</div>
            <div class="tag-name-cell__time">{{ formatDateTime(item.createTime) }}</div>
          </div>
        </template>
        <template v-slot:item.docCount="{ item }">
          <v-btn variant="text" size="small" @click="showTagDocs(item)">
            {{ item.docCount || 0 }} 篇文档
          </v-btn>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn icon size="small" variant="text" title="编辑" @click="openDialog(item)">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="small" variant="text" color="error" title="删除" @click="confirmDelete(item)">
            <v-icon>mdi-delete</v-icon>
          </v-btn>
        </template>
      </v-data-table>

      <!-- 服务端分页：v-data-table 内置分页会对服务端返回的当前页数据二次切片导致翻页失效，改为自管 -->
      <div class="d-flex align-center justify-space-between flex-wrap ga-2 pa-3">
        <span class="text-caption text-medium-emphasis">共 {{ total }} 条</span>
        <v-pagination
          v-model="page"
          :length="Math.max(1, Math.ceil(total / PAGE_SIZE))"
          :total-visible="7"
          density="comfortable"
          @update:model-value="fetchData"
        ></v-pagination>
        <span class="text-caption text-medium-emphasis">每页 {{ PAGE_SIZE }} 条</span>
      </div>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useDisplay } from 'vuetify'
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

const { mdAndUp } = useDisplay()

// PC 端描述/时间独立成列；移动端收进名称单元格小字，避免横向滚动
const headers = computed(() => {
  const all = [
    { title: '标签名称', key: 'tagName', width: '230px' },
    { title: '描述', key: 'tagDesc' },
    { title: '文档数', key: 'docCount', width: '110px' },
    { title: '创建时间', key: 'createTime', width: '180px' },
    { title: '操作', key: 'actions', sortable: false, width: '110px' }
  ]
  if (mdAndUp.value) return all
  return all.filter(h => !['tagDesc', 'createTime'].includes(h.key))
})

// 移动端描述小字：点击展开/收起全文
const descExpanded = ref([])
const toggleDesc = (id) => {
  const i = descExpanded.value.indexOf(id)
  if (i >= 0) descExpanded.value.splice(i, 1)
  else descExpanded.value.push(id)
}
const isDescExpanded = (id) => descExpanded.value.includes(id)

// 创建时间格式化：'YYYY-MM-DD HH:MM:SS'，纯字符串切片避免时区问题
const formatDateTime = (value) => {
  if (!value) return '-'
  return value.slice(0, 19).replace('T', ' ')
}

const formData = reactive({
  tagId: null,
  tagName: '',
  tagDesc: ''
})

const PAGE_SIZE = 10
const page = ref(1)

// 服务端分页：targetPage 仅翻页时显式传入，其余刷新沿用当前页；@update:options 与搜索事件传对象/事件时不匹配 number 走当前页
const fetchData = async (targetPage) => {
  loading.value = true
  try {
    const p = typeof targetPage === 'number' ? targetPage : page.value
    const res = await tagApi.getPage(p, PAGE_SIZE, search.value)
    if (res.data.code === 200) {
      items.value = res.data.data.list || []
      total.value = res.data.data.total || 0
      page.value = p
      // 当前页数据被删空时自动回退一页
      if (!items.value.length && page.value > 1) {
        page.value -= 1
        return fetchData()
      }
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

const onSearch = () => {
  page.value = 1
  fetchData()
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
/* 行内元信息（描述/时间）仅移动端显示，PC 走独立列 */
.tag-name-cell__time,
.tag-name-cell__desc {
  display: none;
}
@media (max-width: 959.98px) {
  .tag-name-cell__time {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.2;
    color: #90a4ae;
  }
  /* 描述小字：单行截断，点击展开全文 */
  .tag-name-cell__desc {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    overflow: hidden;
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.5;
    color: #607d8b;
    cursor: pointer;
  }
  .tag-name-cell__desc--open {
    display: block;
    -webkit-line-clamp: unset;
    line-clamp: unset;
  }
}
</style>
