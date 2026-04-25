<template>
  <div>
    <v-row>
      <v-col cols="12" md="3">
        <v-card class="mb-3">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-transit-connection-variant</v-icon>
            工作流列表
          </v-card-title>
          <v-divider></v-divider>
          <v-list density="compact" lines="two">
            <v-list-item
              v-for="flow in flows"
              :key="flow.id"
              :active="selectedFlow?.id === flow.id"
              @click="selectFlow(flow)"
              color="primary"
            >
              <v-list-item-title>{{ flow.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ flow.description }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-chip size="x-small" :color="flow.enabled ? 'success' : 'grey'">
                  {{ flow.enabled ? '启用' : '禁用' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <v-card-actions>
            <v-btn block color="primary" variant="tonal" prepend-icon="mdi-plus" @click="createFlow">
              新建工作流
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-card class="mb-3" v-if="selectedFlow">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-tune</v-icon>
            工作流配置
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-text-field
              v-model="selectedFlow.name"
              label="工作流名称"
              variant="outlined"
              density="compact"
              class="mb-2"
            ></v-text-field>
            <v-textarea
              v-model="selectedFlow.description"
              label="工作流描述"
              variant="outlined"
              rows="2"
              class="mb-2"
            ></v-textarea>
            <v-select
              v-model="selectedFlow.systemPromptId"
              :items="systemPrompts"
              item-title="name"
              item-value="id"
              label="系统提示词文档"
              variant="outlined"
              density="compact"
              clearable
              class="mb-2"
            ></v-select>
            <v-switch
              v-model="selectedFlow.enabled"
              label="启用工作流"
              hide-details
              density="compact"
              color="primary"
            ></v-switch>
          </v-card-text>
        </v-card>

        <v-card v-if="selectedFlow">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-sitemap</v-icon>
            可用环节
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-2">
            <v-chip
              v-for="stage in availableStages"
              :key="stage.id"
              class="ma-1"
              draggable
              @dragstart="onDragStart($event, stage)"
              color="primary"
              variant="outlined"
            >
              {{ stage.name }}
            </v-chip>
            <v-alert v-if="availableStages.length === 0" type="info" variant="tonal" density="compact" class="mt-2">
              请先在"环节设置"中创建环节
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="9">
        <v-card v-if="selectedFlow" style="min-height: 600px">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-flow</v-icon>
            流程设计器 - {{ selectedFlow.name }}
            <v-spacer></v-spacer>
            <v-btn-group density="compact" class="mr-2">
              <v-btn @click="handleZoomIn" icon="mdi-magnify-plus"></v-btn>
              <v-btn @click="handleZoomOut" icon="mdi-magnify-minus"></v-btn>
              <v-btn @click="handleFitView" icon="mdi-fit-to-screen"></v-btn>
            </v-btn-group>
            <v-btn color="primary" @click="saveFlow">保存流程</v-btn>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0" style="height: 550px; overflow: hidden;">
            <div ref="flowContainer" class="flow-container" @drop="onDrop" @dragover="onDragOver">
              <VueFlow
                v-model="flowData"
                :nodes="nodes"
                :edges="edges"
                :fit-view-on-init="true"
                @node-click="onNodeClick"
                @edge-click="onEdgeClick"
                @connect="onConnect"
              >
                <Background pattern-color="#aaa" :gap="16" />
                <Controls />
                <MiniMap />
              </VueFlow>
            </div>
          </v-card-text>
        </v-card>

        <v-card v-else class="d-flex align-center justify-center" style="min-height: 600px">
          <div class="text-center text-grey">
            <v-icon size="64" class="mb-2">mdi-transit-connection-variant</v-icon>
            <div>请选择或创建一个工作流</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-navigation-drawer
      v-model="configDrawer"
      location="right"
      temporary
      width="400"
    >
      <v-card v-if="configuringNode" flat>
        <v-card-title class="d-flex align-center">
          环节配置
          <v-spacer></v-spacer>
          <v-btn icon variant="text" @click="configDrawer = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-text-field
            v-model="configuringNode.label"
            label="环节名称"
            variant="outlined"
            density="compact"
            class="mb-2"
            disabled
          ></v-text-field>

          <v-select
            v-model="configuringNode.data.stageId"
            :items="availableStages"
            item-title="name"
            item-value="id"
            label="关联环节"
            variant="outlined"
            density="compact"
            class="mb-2"
          ></v-select>

          <v-select
            v-model="configuringNode.data.triggerFunctionId"
            :items="availableFunctions"
            item-title="name"
            item-value="id"
            label="触发函数（可选）"
            variant="outlined"
            density="compact"
            clearable
            class="mb-2"
          ></v-select>

          <v-divider class="my-3"></v-divider>

          <div class="text-subtitle-2 mb-2">流程控制设置</div>

          <v-select
            v-model="configuringNode.data.approvalType"
            :items="approvalTypes"
            label="审批类型"
            variant="outlined"
            density="compact"
            class="mb-2"
          ></v-select>

          <v-select
            v-model="configuringNode.data.approvers"
            :items="approverOptions"
            label="审批人"
            multiple
            chips
            closable-chips
            variant="outlined"
            density="compact"
            class="mb-2"
            v-if="configuringNode.data.approvalType !== 'none'"
          ></v-select>

          <v-text-field
            v-model="configuringNode.data.timeout"
            label="超时时间（秒）"
            type="number"
            variant="outlined"
            density="compact"
            class="mb-2"
          ></v-text-field>

          <v-select
            v-model="configuringNode.data.errorHandling"
            :items="errorHandlings"
            label="错误处理方式"
            variant="outlined"
            density="compact"
          ></v-select>

          <v-divider class="my-3"></v-divider>

          <div class="text-subtitle-2 mb-2">条件分支配置</div>

          <v-switch
            v-model="configuringNode.data.hasConditions"
            label="启用条件分支"
            hide-details
            density="compact"
            color="primary"
            class="mb-2"
          ></v-switch>

          <div v-if="configuringNode.data.hasConditions">
            <v-btn
              size="small"
              variant="tonal"
              prepend-icon="mdi-plus"
              class="mb-2"
              @click="addCondition"
            >
              添加条件
            </v-btn>

            <v-card
              v-for="(condition, index) in configuringNode.data.conditions"
              :key="index"
              variant="outlined"
              class="mb-2 pa-2"
            >
              <div class="d-flex align-center mb-2">
                <v-text-field
                  v-model="condition.label"
                  label="条件名称"
                  variant="outlined"
                  density="compact"
                  hide-details
                  style="flex: 1"
                ></v-text-field>
                <v-btn icon size="small" variant="text" color="error" @click="removeCondition(index)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>
              <v-textarea
                v-model="condition.expression"
                label="条件表达式"
                variant="outlined"
                rows="2"
                density="compact"
                hint="支持变量如: ${input.status} == 'pending'"
                persistent-hint
              ></v-textarea>
            </v-card>
          </div>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-btn variant="text" color="error" @click="deleteNode">删除环节</v-btn>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="configDrawer = false">取消</v-btn>
          <v-btn color="primary" @click="applyNodeConfig">应用</v-btn>
        </v-card-actions>
      </v-card>
    </v-navigation-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

const flowContainer = ref(null)
const selectedFlow = ref(null)
const configDrawer = ref(false)
const configuringNode = ref(null)
const configNode = ref(null)

const vueFlow = useVueFlow({ id: 'main-flow' })

const {
  zoomIn: zoomInFn,
  zoomOut: zoomOutFn,
  fitView: fitViewFn,
  addNodes: addNodesFn,
  addEdges: addEdgesFn,
  findNode: findNodeFn,
  onConnect: onConnectFn
} = vueFlow

const handleZoomIn = () => zoomInFn()
const handleZoomOut = () => zoomOutFn()
const handleFitView = () => fitViewFn()

const approvalTypes = [
  { title: '无需审批', value: 'none' },
  { title: '人工审批', value: 'manual' },
  { title: '自动通过', value: 'auto' },
  { title: '会签审批', value: 'counterSign' }
]

const errorHandlings = [
  { title: '终止流程', value: 'terminate' },
  { title: '跳过当前环节', value: 'skip' },
  { title: '重试', value: 'retry' },
  { title: '返回修改', value: 'return' }
]

const approverOptions = [
  { title: '管理员', value: 'admin' },
  { title: '项目负责人', value: 'owner' },
  { title: '指定用户', value: 'specific' }
]

const systemPrompts = ref([
  { id: 1, name: '通用系统提示词' },
  { id: 2, name: '问答系统提示词' }
])

const availableStages = ref([
  { id: 1, name: '需求分析' },
  { id: 2, name: '方案设计' },
  { id: 3, name: '代码开发' },
  { id: 4, name: '测试验证' },
  { id: 5, name: '发布上线' }
])

const availableFunctions = ref([
  { id: 1, name: '搜索知识库' },
  { id: 2, name: '调用外部API' },
  { id: 3, name: '数据处理' }
])

const flows = ref([
  {
    id: 1,
    name: '智能问答流程',
    description: '用于智能问答的工作流',
    enabled: true,
    systemPromptId: 1,
    nodes: [
      { id: '1', type: 'input', position: { x: 100, y: 100 }, label: '需求分析', data: { stageId: 1, approvalType: 'none' } },
      { id: '2', type: 'default', position: { x: 300, y: 100 }, label: '方案设计', data: { stageId: 2, approvalType: 'manual' } },
      { id: '3', type: 'output', position: { x: 500, y: 100 }, label: '代码开发', data: { stageId: 3, approvalType: 'none' } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: '通过', type: 'smoothstep' },
      { id: 'e2-3', source: '2', target: '3', label: '通过', type: 'smoothstep' }
    ]
  }
])

const nodes = ref([])
const edges = ref([])

const flowData = computed({
  get: () => ({ nodes: nodes.value, edges: edges.value }),
  set: (val) => {
    nodes.value = val.nodes || []
    edges.value = val.edges || []
  }
})

const selectFlow = (flow) => {
  selectedFlow.value = JSON.parse(JSON.stringify(flow))
  nodes.value = JSON.parse(JSON.stringify(flow.nodes || []))
  edges.value = JSON.parse(JSON.stringify(flow.edges || []))
}

const createFlow = () => {
  const newFlow = {
    id: Date.now(),
    name: '新工作流',
    description: '',
    enabled: true,
    systemPromptId: null,
    nodes: [],
    edges: []
  }
  flows.value.push(newFlow)
  selectFlow(newFlow)
}

const onDragStart = (event, stage) => {
  event.dataTransfer.setData('stage', JSON.stringify(stage))
}

const onDragOver = (event) => {
  event.preventDefault()
}

const onDrop = (event) => {
  const stageData = event.dataTransfer.getData('stage')
  if (!stageData) return
  
  const stage = JSON.parse(stageData)
  const bounds = flowContainer.value.getBoundingClientRect()
  const position = {
    x: event.clientX - bounds.left - 75,
    y: event.clientY - bounds.top - 30
  }
  
  const newNode = {
    id: `node_${Date.now()}`,
    type: 'default',
    position,
    label: stage.name,
    data: {
      stageId: stage.id,
      stageType: 'stage',
      approvalType: 'none',
      approvers: [],
      timeout: 300,
      errorHandling: 'terminate',
      hasConditions: false,
      conditions: []
    }
  }
  
  addNodesFn([newNode])
  nodes.value = [...nodes.value, newNode]
}

const onNodeClick = (event) => {
  const node = findNodeFn(event.node.id)
  if (node) {
    configNode.value = node
    configuringNode.value = JSON.parse(JSON.stringify(node))
    configDrawer.value = true
  }
}

const onEdgeClick = (event) => {
  console.log('Edge clicked:', event.edge)
}

const onConnect = (params) => {
  const newEdge = {
    id: `edge_${Date.now()}`,
    ...params,
    type: 'smoothstep'
  }
  addEdgesFn([newEdge])
  edges.value = [...edges.value, newEdge]
}

const applyNodeConfig = () => {
  if (configNode.value && configuringNode.value) {
    Object.assign(configNode.value, configuringNode.value)
    nodes.value = [...nodes.value]
  }
  configDrawer.value = false
}

const deleteNode = () => {
  if (configNode.value) {
    nodes.value = nodes.value.filter(n => n.id !== configNode.value.id)
    edges.value = edges.value.filter(e => e.source !== configNode.value.id && e.target !== configNode.value.id)
  }
  configDrawer.value = false
}

const addCondition = () => {
  if (!configuringNode.value.data.conditions) {
    configuringNode.value.data.conditions = []
  }
  configuringNode.value.data.conditions.push({
    label: '',
    expression: ''
  })
}

const removeCondition = (index) => {
  configuringNode.value.data.conditions.splice(index, 1)
}

const saveFlow = () => {
  if (selectedFlow.value) {
    selectedFlow.value.nodes = nodes.value
    selectedFlow.value.edges = edges.value
    console.log('保存工作流:', JSON.parse(JSON.stringify(selectedFlow.value)))
  }
}
</script>

<style scoped>
.flow-container {
  width: 100%;
  height: 100%;
}

:deep(.vue-flow__node) {
  background: white;
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  min-width: 120px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

:deep(.vue-flow__node.selected) {
  border-color: #1976D2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

:deep(.vue-flow__node-input) {
  border-color: #4CAF50;
}

:deep(.vue-flow__node-output) {
  border-color: #FF9800;
}
</style>
