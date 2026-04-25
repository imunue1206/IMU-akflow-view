<template>
  <div>
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-function</v-icon>
            函数列表
          </v-card-title>
          <v-divider></v-divider>
          <v-list lines="two" density="compact">
            <v-list-item
              v-for="func in functions"
              :key="func.id"
              :active="selectedFunction?.id === func.id"
              @click="selectFunction(func)"
              color="primary"
            >
              <v-list-item-title>{{ func.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ func.description }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-chip size="x-small" :color="func.method === 'GET' ? 'success' : 'primary'">
                  {{ func.method }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <v-card-actions>
            <v-btn block color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openFunctionDialog()">
              新建函数
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="8" v-if="selectedFunction">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-cog</v-icon>
            函数配置 - {{ selectedFunction.name }}
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="selectedFunction.name"
                  label="函数名称"
                  variant="outlined"
                  density="compact"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedFunction.method"
                  :items="httpMethods"
                  label="HTTP方法"
                  variant="outlined"
                  density="compact"
                ></v-select>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="selectedFunction.url"
                  label="HTTP请求地址"
                  variant="outlined"
                  density="compact"
                  placeholder="https://api.example.com/endpoint"
                >
                  <template v-slot:prepend-inner>
                    <v-icon size="small">mdi-link</v-icon>
                  </template>
                </v-text-field>
              </v-col>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="selectedFunction.tags"
                  label="标签（用于检索和归类）"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="compact"
                ></v-combobox>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedFunction.category"
                  :items="categories"
                  label="函数分类"
                  variant="outlined"
                  density="compact"
                ></v-select>
              </v-col>
            </v-row>

            <v-divider class="my-4"></v-divider>

            <div class="d-flex align-center mb-3">
              <v-icon class="mr-2">mdi-code-braces</v-icon>
              <span class="text-subtitle-1">输入参数定义</span>
              <v-spacer></v-spacer>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addInputParam">
                添加参数
              </v-btn>
            </div>

            <v-table density="compact" v-if="selectedFunction.inputParams?.length">
              <thead>
                <tr>
                  <th>参数名</th>
                  <th>类型</th>
                  <th>必填</th>
                  <th>描述</th>
                  <th width="60"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(param, index) in selectedFunction.inputParams" :key="index">
                  <td>
                    <v-text-field
                      v-model="param.name"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-text-field>
                  </td>
                  <td>
                    <v-select
                      v-model="param.type"
                      :items="paramTypes"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-select>
                  </td>
                  <td>
                    <v-checkbox v-model="param.required" hide-details density="compact"></v-checkbox>
                  </td>
                  <td>
                    <v-text-field
                      v-model="param.description"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-text-field>
                  </td>
                  <td>
                    <v-btn icon size="small" variant="text" color="error" @click="removeInputParam(index)">
                      <v-icon size="small">mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <v-alert v-else type="info" variant="tonal" density="compact" class="my-2">
              暂无输入参数定义
            </v-alert>

            <v-divider class="my-4"></v-divider>

            <div class="d-flex align-center mb-3">
              <v-icon class="mr-2">mdi-code-braces</v-icon>
              <span class="text-subtitle-1">输出参数定义</span>
              <v-spacer></v-spacer>
              <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="addOutputParam">
                添加参数
              </v-btn>
            </div>

            <v-table density="compact" v-if="selectedFunction.outputParams?.length">
              <thead>
                <tr>
                  <th>参数名</th>
                  <th>类型</th>
                  <th>描述</th>
                  <th width="60"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(param, index) in selectedFunction.outputParams" :key="index">
                  <td>
                    <v-text-field
                      v-model="param.name"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-text-field>
                  </td>
                  <td>
                    <v-select
                      v-model="param.type"
                      :items="paramTypes"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-select>
                  </td>
                  <td>
                    <v-text-field
                      v-model="param.description"
                      variant="outlined"
                      density="compact"
                      hide-details
                    ></v-text-field>
                  </td>
                  <td>
                    <v-btn icon size="small" variant="text" color="error" @click="removeOutputParam(index)">
                      <v-icon size="small">mdi-delete</v-icon>
                    </v-btn>
                  </td>
                </tr>
              </tbody>
            </v-table>
            <v-alert v-else type="info" variant="tonal" density="compact" class="my-2">
              暂无输出参数定义
            </v-alert>

            <v-divider class="my-4"></v-divider>

            <div class="d-flex align-center mb-3">
              <v-icon class="mr-2">mdi-file-document-check</v-icon>
              <span class="text-subtitle-1">FunctionCall选用提示词文档</span>
            </div>

            <v-select
              v-model="selectedFunction.functionCallPromptId"
              :items="functionCallPrompts"
              item-title="name"
              item-value="id"
              label="选择FunctionCall提示词"
              variant="outlined"
              density="compact"
              clearable
            >
              <template v-slot:prepend-inner>
                <v-icon size="small">mdi-file-document</v-icon>
              </template>
            </v-select>

            <v-alert type="info" variant="tonal" density="compact" class="mt-3">
              <template v-slot:prepend>
                <v-icon>mdi-information</v-icon>
              </template>
              FunctionCall选用提示词用于决定在什么情况下调用此函数，需先在"可复用提示词文档"中配置
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" color="error" prepend-icon="mdi-delete">删除函数</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="saveFunction">保存配置</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="8" v-else>
        <v-card class="d-flex align-center justify-center" style="min-height: 500px">
          <div class="text-center text-grey">
            <v-icon size="64" class="mb-2">mdi-function</v-icon>
            <div>请选择或创建一个触发函数</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="functionDialog" max-width="600">
      <v-card>
        <v-card-title>{{ isEdit ? '编辑' : '新建' }}触发函数</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="functionForm.name"
            label="函数名称"
            variant="outlined"
            class="mb-3"
          ></v-text-field>
          <v-textarea
            v-model="functionForm.description"
            label="函数描述"
            variant="outlined"
            rows="2"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="functionDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveFunctionForm">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const functionDialog = ref(false)
const isEdit = ref(false)
const selectedFunction = ref(null)

const functionForm = reactive({
  name: '',
  description: ''
})

const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

const paramTypes = ['string', 'number', 'boolean', 'array', 'object']

const categories = [
  { title: '数据查询', value: 'query' },
  { title: '数据处理', value: 'process' },
  { title: '外部集成', value: 'integration' },
  { title: '工具调用', value: 'tool' }
]

const functionCallPrompts = ref([
  { id: 1, name: '通用函数选用提示词' },
  { id: 2, name: '搜索函数选用提示词' },
  { id: 3, name: '数据库查询选用提示词' }
])

const functions = ref([
  {
    id: 1,
    name: '搜索知识库',
    description: '搜索企业内部知识库',
    method: 'POST',
    url: 'https://api.example.com/knowledge/search',
    tags: ['搜索', '知识库'],
    category: 'query',
    inputParams: [
      { name: 'query', type: 'string', required: true, description: '搜索关键词' },
      { name: 'limit', type: 'number', required: false, description: '返回结果数量' }
    ],
    outputParams: [
      { name: 'results', type: 'array', description: '搜索结果列表' },
      { name: 'total', type: 'number', description: '总结果数' }
    ],
    functionCallPromptId: 1
  },
  {
    id: 2,
    name: '调用外部API',
    description: '调用第三方外部API',
    method: 'POST',
    url: 'https://api.example.com/external/call',
    tags: ['外部', '集成'],
    category: 'integration',
    inputParams: [
      { name: 'endpoint', type: 'string', required: true, description: 'API端点' },
      { name: 'data', type: 'object', required: false, description: '请求数据' }
    ],
    outputParams: [
      { name: 'response', type: 'object', description: '响应数据' },
      { name: 'status', type: 'number', description: '状态码' }
    ],
    functionCallPromptId: 2
  }
])

const selectFunction = (func) => {
  selectedFunction.value = JSON.parse(JSON.stringify(func))
}

const openFunctionDialog = (func = null) => {
  if (func) {
    isEdit.value = true
    Object.assign(functionForm, func)
  } else {
    isEdit.value = false
    functionForm.name = ''
    functionForm.description = ''
  }
  functionDialog.value = true
}

const saveFunctionForm = () => {
  functionDialog.value = false
}

const addInputParam = () => {
  if (!selectedFunction.value.inputParams) {
    selectedFunction.value.inputParams = []
  }
  selectedFunction.value.inputParams.push({
    name: '',
    type: 'string',
    required: false,
    description: ''
  })
}

const removeInputParam = (index) => {
  selectedFunction.value.inputParams.splice(index, 1)
}

const addOutputParam = () => {
  if (!selectedFunction.value.outputParams) {
    selectedFunction.value.outputParams = []
  }
  selectedFunction.value.outputParams.push({
    name: '',
    type: 'string',
    description: ''
  })
}

const removeOutputParam = (index) => {
  selectedFunction.value.outputParams.splice(index, 1)
}

const saveFunction = () => {
  console.log('保存函数配置', selectedFunction.value)
}
</script>
