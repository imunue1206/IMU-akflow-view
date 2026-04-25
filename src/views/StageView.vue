<template>
  <div>
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-sitemap</v-icon>
            环节列表
          </v-card-title>
          <v-divider></v-divider>
          <v-list lines="two" density="compact">
            <v-list-item
              v-for="stage in stages"
              :key="stage.id"
              :active="selectedStage?.id === stage.id"
              @click="selectStage(stage)"
              color="primary"
            >
              <v-list-item-title>{{ stage.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ stage.description }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-icon size="small" :color="stage.enabled ? 'success' : 'grey'">
                  {{ stage.enabled ? 'mdi-check-circle' : 'mdi-circle-outline' }}
                </v-icon>
              </template>
            </v-list-item>
          </v-list>
          <v-card-actions>
            <v-btn block color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openStageDialog()">
              新建环节
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="8" v-if="selectedStage">
        <v-card class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-cog</v-icon>
            环节配置 - {{ selectedStage.name }}
            <v-spacer></v-spacer>
            <v-switch
              v-model="selectedStage.enabled"
              label="启用"
              hide-details
              density="compact"
              color="primary"
              class="mr-2"
            ></v-switch>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-combobox
                  v-model="selectedStage.tags"
                  label="标签（用于检索和归类）"
                  multiple
                  chips
                  closable-chips
                  variant="outlined"
                  density="compact"
                ></v-combobox>
              </v-col>
            </v-row>

            <v-expansion-panels variant="accordion" class="mt-2">
              <v-expansion-panel title="0. 环节上下文配置">
                <v-expansion-panel-text>
                  <v-select
                    v-model="selectedStage.contextPromptId"
                    :items="contextPrompts"
                    item-title="name"
                    item-value="id"
                    label="选择环节上下文提示词"
                    variant="outlined"
                    density="compact"
                    clearable
                  ></v-select>
                  <v-textarea
                    v-model="selectedStage.contextContent"
                    label="环节上下文内容"
                    variant="outlined"
                    rows="4"
                    hint="可直接编辑或选择已配置的提示词"
                    persistent-hint
                  ></v-textarea>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel title="1. 角色岗位上下文配置">
                <v-expansion-panel-text>
                  <v-select
                    v-model="selectedStage.rolePromptId"
                    :items="rolePrompts"
                    item-title="name"
                    item-value="id"
                    label="选择角色岗位提示词"
                    variant="outlined"
                    density="compact"
                    clearable
                  ></v-select>
                  <v-textarea
                    v-model="selectedStage.roleContent"
                    label="角色岗位上下文内容"
                    variant="outlined"
                    rows="4"
                  ></v-textarea>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel title="2. 经验沉淀提示词文档">
                <v-expansion-panel-text>
                  <v-select
                    v-model="selectedStage.experiencePromptIds"
                    :items="experiencePrompts"
                    item-title="name"
                    item-value="id"
                    label="选择经验沉淀提示词"
                    variant="outlined"
                    density="compact"
                    multiple
                    chips
                    closable-chips
                  ></v-select>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel title="3. 触发前动作配置">
                <v-expansion-panel-text>
                  <v-select
                    v-model="selectedStage.preTriggerActions"
                    :items="availableActions"
                    item-title="name"
                    item-value="id"
                    label="选择触发前动作"
                    variant="outlined"
                    density="compact"
                    multiple
                    chips
                    closable-chips
                  ></v-select>
                  <v-alert type="info" variant="tonal" density="compact" class="mt-2">
                    <template v-slot:prepend>
                      <v-icon>mdi-information</v-icon>
                    </template>
                    触发前动作在环节执行前执行，可用于数据预处理等
                  </v-alert>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel title="4. 触发后动作配置">
                <v-expansion-panel-text>
                  <v-select
                    v-model="selectedStage.postTriggerActions"
                    :items="availableActions"
                    item-title="name"
                    item-value="id"
                    label="选择触发后动作"
                    variant="outlined"
                    density="compact"
                    multiple
                    chips
                    closable-chips
                  ></v-select>
                  <v-alert type="info" variant="tonal" density="compact" class="mt-2">
                    <template v-slot:prepend>
                      <v-icon>mdi-information</v-icon>
                    </template>
                    触发后动作在环节执行后执行，可用于结果处理、存储等
                  </v-alert>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
          <v-card-actions>
            <v-btn variant="text" color="error" prepend-icon="mdi-delete">删除环节</v-btn>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="saveStage">保存配置</v-btn>
          </v-card-actions>
        </v-card>

        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-eye</v-icon>
            实时预览
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-tabs v-model="previewTab" color="primary">
              <v-tab value="combined">组合预览</v-tab>
              <v-tab value="context">环节上下文</v-tab>
              <v-tab value="role">角色岗位</v-tab>
              <v-tab value="experience">经验沉淀</v-tab>
            </v-tabs>
            <v-tabs-window v-model="previewTab" class="mt-4">
              <v-tabs-window-item value="combined">
                <v-sheet color="grey-lighten-4" class="pa-4" style="min-height: 200px; font-family: monospace; white-space: pre-wrap;">
                  {{ combinedPreview }}
                </v-sheet>
              </v-tabs-window-item>
              <v-tabs-window-item value="context">
                <v-sheet color="grey-lighten-4" class="pa-4" style="min-height: 200px; font-family: monospace; white-space: pre-wrap;">
                  {{ selectedStage.contextContent || '暂无内容' }}
                </v-sheet>
              </v-tabs-window-item>
              <v-tabs-window-item value="role">
                <v-sheet color="grey-lighten-4" class="pa-4" style="min-height: 200px; font-family: monospace; white-space: pre-wrap;">
                  {{ selectedStage.roleContent || '暂无内容' }}
                </v-sheet>
              </v-tabs-window-item>
              <v-tabs-window-item value="experience">
                <v-sheet color="grey-lighten-4" class="pa-4" style="min-height: 200px; font-family: monospace; white-space: pre-wrap;">
                  {{ selectedStage.experienceContent || '暂无内容' }}
                </v-sheet>
              </v-tabs-window-item>
            </v-tabs-window>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="8" v-else>
        <v-card class="d-flex align-center justify-center" style="min-height: 500px">
          <div class="text-center text-grey">
            <v-icon size="64" class="mb-2">mdi-sitemap</v-icon>
            <div>请选择或创建一个环节</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="stageDialog" max-width="600">
      <v-card>
        <v-card-title>{{ isEdit ? '编辑' : '新建' }}环节</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="stageForm.name"
            label="环节名称"
            variant="outlined"
            class="mb-3"
          ></v-text-field>
          <v-textarea
            v-model="stageForm.description"
            label="环节描述"
            variant="outlined"
            rows="2"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="stageDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveStageForm">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const stageDialog = ref(false)
const isEdit = ref(false)
const selectedStage = ref(null)
const previewTab = ref('combined')

const stageForm = reactive({
  name: '',
  description: ''
})

const stages = ref([
  {
    id: 1,
    name: '需求分析',
    description: '分析用户需求并整理',
    enabled: true,
    tags: ['需求', '分析'],
    contextPromptId: 1,
    contextContent: '你是一个专业的需求分析师，需要分析用户提出的需求...',
    rolePromptId: 1,
    roleContent: '你是一位资深产品经理，擅长需求分析和产品设计...',
    experiencePromptIds: [1],
    experienceContent: '1. 需求优先级评估方法\n2. 用户故事编写规范...',
    preTriggerActions: [],
    postTriggerActions: [1]
  },
  {
    id: 2,
    name: '代码生成',
    description: '根据需求生成代码',
    enabled: true,
    tags: ['开发', '代码'],
    contextPromptId: 2,
    contextContent: '根据分析好的需求生成高质量代码...',
    rolePromptId: 2,
    roleContent: '你是一位资深技术专家，擅长各种编程语言...',
    experiencePromptIds: [2],
    experienceContent: '1. 代码规范\n2. 最佳实践...',
    preTriggerActions: [1],
    postTriggerActions: []
  }
])

const contextPrompts = ref([
  { id: 1, name: '需求分析上下文' },
  { id: 2, name: '代码生成上下文' }
])

const rolePrompts = ref([
  { id: 1, name: '产品经理角色' },
  { id: 2, name: '技术专家角色' }
])

const experiencePrompts = ref([
  { id: 1, name: '需求分析经验' },
  { id: 2, name: '编码最佳实践' }
])

const availableActions = ref([
  { id: 1, name: '数据验证' },
  { id: 2, name: '参数转换' },
  { id: 3, name: '日志记录' },
  { id: 4, name: '结果缓存' }
])

const combinedPreview = computed(() => {
  if (!selectedStage.value) return ''
  return `【环节上下文】
${selectedStage.value.contextContent || '暂无'}

【角色岗位】
${selectedStage.value.roleContent || '暂无'}

【经验沉淀】
${selectedStage.value.experienceContent || '暂无'}`
})

const selectStage = (stage) => {
  selectedStage.value = JSON.parse(JSON.stringify(stage))
}

const openStageDialog = (stage = null) => {
  if (stage) {
    isEdit.value = true
    Object.assign(stageForm, stage)
  } else {
    isEdit.value = false
    stageForm.name = ''
    stageForm.description = ''
  }
  stageDialog.value = true
}

const saveStageForm = () => {
  stageDialog.value = false
}

const saveStage = () => {
  console.log('保存环节配置', selectedStage.value)
}
</script>
