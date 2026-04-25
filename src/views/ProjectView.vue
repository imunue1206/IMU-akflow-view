<template>
  <div>
    <v-row>
      <v-col cols="12" md="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-folder-cog</v-icon>
            项目列表
          </v-card-title>
          <v-divider></v-divider>
          <v-list lines="two" density="compact">
            <v-list-item
              v-for="project in projects"
              :key="project.id"
              :active="selectedProject?.id === project.id"
              @click="selectProject(project)"
              color="primary"
            >
              <v-list-item-title>{{ project.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ project.description }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-chip size="x-small" :color="project.status === 'active' ? 'success' : 'grey'">
                  {{ project.status === 'active' ? '进行中' : '已结束' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <v-card-actions>
            <v-btn block color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openProjectDialog()">
              新建项目
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card v-if="selectedProject" class="mb-4">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-cog</v-icon>
            项目配置 - {{ selectedProject.name }}
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedProject.projectPromptId"
                  :items="projectPrompts"
                  item-title="name"
                  item-value="id"
                  label="项目提示词文档"
                  variant="outlined"
                  density="compact"
                  clearable
                >
                  <template v-slot:prepend-inner>
                    <v-icon size="small">mdi-file-document</v-icon>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedProject.systemPromptId"
                  :items="systemPrompts"
                  item-title="name"
                  item-value="id"
                  label="系统提示词上下文文档"
                  variant="outlined"
                  density="compact"
                  clearable
                >
                  <template v-slot:prepend-inner>
                    <v-icon size="small">mdi-cog</v-icon>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedProject.experiencePromptId"
                  :items="experiencePrompts"
                  item-title="name"
                  item-value="id"
                  label="经验沉淀提示词文档"
                  variant="outlined"
                  density="compact"
                  clearable
                >
                  <template v-slot:prepend-inner>
                    <v-icon size="small">mdi-lightbulb</v-icon>
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedProject.flowId"
                  :items="flows"
                  item-title="name"
                  item-value="id"
                  label="关联工作流"
                  variant="outlined"
                  density="compact"
                  clearable
                >
                  <template v-slot:prepend-inner>
                    <v-icon size="small">mdi-transit-connection-variant</v-icon>
                  </template>
                </v-select>
              </v-col>
            </v-row>
            <v-alert type="info" variant="tonal" density="compact" class="mt-2">
              <template v-slot:prepend>
                <v-icon>mdi-information</v-icon>
              </template>
              提示词文档需先在"可复用提示词文档"菜单中配置，工作流需先在"流程设置"中配置
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn color="primary" @click="saveProjectConfig">保存配置</v-btn>
          </v-card-actions>
        </v-card>

        <v-card v-if="selectedProject">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2">mdi-clipboard-check</v-icon>
            项目计划与进度跟踪
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="d-flex align-center mb-4">
              <span class="text-body-2 mr-2">总体进度：</span>
              <v-progress-linear
                :model-value="selectedProject.progress"
                color="primary"
                height="20"
                rounded
                style="flex: 1"
              >
                <template v-slot:default="{ value }">
                  <strong class="text-white" style="font-size: 12px">{{ Math.ceil(value) }}%</strong>
                </template>
              </v-progress-linear>
            </div>

            <v-btn
              color="primary"
              variant="tonal"
              size="small"
              prepend-icon="mdi-plus"
              class="mb-3"
              @click="addTodo"
            >
              添加待办
            </v-btn>

            <v-list density="compact" lines="three">
              <v-list-item v-for="(todo, index) in todos" :key="index">
                <template v-slot:prepend>
                  <v-checkbox
                    v-model="todo.done"
                    hide-details
                    density="compact"
                  ></v-checkbox>
                </template>
                <v-list-item-title :class="{ 'text-decoration-line-through': todo.done }">
                  {{ todo.title }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  <v-chip size="x-small" :color="getPriorityColor(todo.priority)" class="mr-1">
                    {{ todo.priority }}
                  </v-chip>
                  <span class="text-caption">{{ todo.dueDate }}</span>
                </v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn icon size="x-small" variant="text" @click="deleteTodo(index)">
                    <v-icon size="small">mdi-delete</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-card v-else class="d-flex align-center justify-center" style="min-height: 400px">
          <div class="text-center text-grey">
            <v-icon size="64" class="mb-2">mdi-folder-open</v-icon>
            <div>请选择或创建一个项目</div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="projectDialog" max-width="600">
      <v-card>
        <v-card-title>{{ isEdit ? '编辑' : '新建' }}项目</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="projectForm.name"
            label="项目名称"
            variant="outlined"
            class="mb-3"
          ></v-text-field>
          <v-textarea
            v-model="projectForm.description"
            label="项目描述"
            variant="outlined"
            rows="2"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="projectDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveProject">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const projectDialog = ref(false)
const isEdit = ref(false)
const selectedProject = ref(null)

const projectForm = reactive({
  name: '',
  description: ''
})

const projects = ref([
  {
    id: 1,
    name: 'AI助手开发项目',
    description: '基于LLM的智能助手开发',
    status: 'active',
    progress: 65,
    projectPromptId: 1,
    systemPromptId: 1,
    experiencePromptId: null,
    flowId: 1
  }
])

const projectPrompts = ref([
  { id: 1, name: 'AI助手项目提示词' },
  { id: 2, name: '数据分析项目提示词' }
])

const systemPrompts = ref([
  { id: 1, name: '通用系统提示词' },
  { id: 2, name: '技术问答系统提示词' }
])

const experiencePrompts = ref([
  { id: 1, name: '开发经验沉淀' },
  { id: 2, name: '产品经验沉淀' }
])

const flows = ref([
  { id: 1, name: '智能问答流程' },
  { id: 2, name: '内容生成流程' }
])

const todos = ref([
  { title: '完成需求分析', priority: '高', dueDate: '2024-02-01', done: true },
  { title: '设计系统架构', priority: '高', dueDate: '2024-02-05', done: true },
  { title: '开发核心功能', priority: '中', dueDate: '2024-02-15', done: false },
  { title: '编写测试用例', priority: '低', dueDate: '2024-02-20', done: false }
])

const selectProject = (project) => {
  selectedProject.value = { ...project }
}

const openProjectDialog = (project = null) => {
  if (project) {
    isEdit.value = true
    Object.assign(projectForm, project)
  } else {
    isEdit.value = false
    projectForm.name = ''
    projectForm.description = ''
  }
  projectDialog.value = true
}

const saveProject = () => {
  projectDialog.value = false
}

const saveProjectConfig = () => {
  console.log('保存项目配置', selectedProject.value)
}

const addTodo = () => {
  todos.value.push({
    title: '新待办事项',
    priority: '中',
    dueDate: new Date().toISOString().split('T')[0],
    done: false
  })
}

const deleteTodo = (index) => {
  todos.value.splice(index, 1)
}

const getPriorityColor = (priority) => {
  const colors = { '高': 'error', '中': 'warning', '低': 'success' }
  return colors[priority] || 'grey'
}
</script>
