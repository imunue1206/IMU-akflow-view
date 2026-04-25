<template>
  <div>
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="搜索提示词"
          variant="outlined"
          density="compact"
          hide-details
          @keyup.enter="fetchData"
        ></v-text-field>
      </v-col>
      <v-col cols="12" md="6" class="d-flex justify-end">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openDialog()">
          新建提示词
        </v-btn>
      </v-col>
    </v-row>

    <v-card>
      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :items-length="total"
      >
        <template v-slot:item.tags="{ item }">
          <v-chip
            v-for="tag in parseTags(item.tags)"
            :key="tag"
            size="small"
            class="mr-1"
            color="primary"
            variant="tonal"
          >
            {{ tag }}
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

    <v-dialog v-model="dialog" max-width="800" persistent>
      <v-card>
        <v-card-title class="d-flex align-center pa-4">
          <span class="text-h5">{{ isEdit ? '编辑' : '新建' }}提示词</span>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="dialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-4">
          <v-form ref="formRef" v-model="valid">
            <v-text-field
              v-model="formData.name"
              label="提示词名称"
              :rules="[v => !!v || '名称必填']"
              variant="outlined"
              class="mb-3"
            ></v-text-field>

            <v-combobox
              v-model="formData.tags"
              label="标签（用于检索和归类）"
              multiple
              chips
              closable-chips
              variant="outlined"
              class="mb-3"
            ></v-combobox>

            <v-textarea
              v-model="formData.content"
              label="提示词内容"
              :rules="[v => !!v || '内容必填']"
              variant="outlined"
              rows="10"
              class="mb-3"
            ></v-textarea>

            <v-textarea
              v-model="formData.description"
              label="描述说明"
              variant="outlined"
              rows="2"
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
        <v-card-text>确定要删除提示词 "{{ deleteItem?.name }}" 吗？此操作不可恢复。</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="deleteDialog = false">取消</v-btn>
          <v-btn color="error" :loading="deleting" @click="doDelete">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { promptsApi } from '@/api/index'

const props = defineProps({
  title: { type: String, default: '提示词管理' },
  category: { type: String, default: 'role' }
})

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

const headers = [
  { title: '名称', key: 'name', width: '200px' },
  { title: '标签', key: 'tags' },
  { title: '描述', key: 'description' },
  { title: '创建时间', key: 'createTime', width: '180px' },
  { title: '操作', key: 'actions', sortable: false, width: '120px' }
]

const formData = reactive({
  id: null,
  name: '',
  tags: [],
  content: '',
  description: ''
})

const parseTags = (tagsStr) => {
  if (!tagsStr) return []
  try {
    return JSON.parse(tagsStr)
  } catch {
    return []
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await promptsApi.list(props.category, 1, 20, search.value)
    if (res.data.code === 0) {
      items.value = res.data.data.list || []
      total.value = res.data.data.total || 0
    }
  } catch (e) {
    console.error('获取数据失败:', e)
  } finally {
    loading.value = false
  }
}

const openDialog = (item = null) => {
  if (item) {
    isEdit.value = true
    Object.assign(formData, {
      id: item.id,
      name: item.name,
      tags: parseTags(item.tags),
      content: item.content,
      description: item.description
    })
  } else {
    isEdit.value = false
    Object.assign(formData, {
      id: null,
      name: '',
      tags: [],
      content: '',
      description: ''
    })
  }
  dialog.value = true
}

const save = async () => {
  if (!valid.value) return
  saving.value = true
  try {
    const data = {
      name: formData.name,
      content: formData.content,
      tags: formData.tags,
      description: formData.description
    }
    
    if (isEdit.value) {
      await promptsApi.update(props.category, formData.id, data)
    } else {
      await promptsApi.create(props.category, data)
    }
    dialog.value = false
    fetchData()
  } catch (e) {
    console.error('保存失败:', e)
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
    await promptsApi.delete(props.category, deleteItem.value.id)
    deleteDialog.value = false
    fetchData()
  } catch (e) {
    console.error('删除失败:', e)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>
