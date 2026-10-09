<template>
  <Teleport to="body">
    <Transition name="ce-fade">
      <div v-if="modelValue" class="ce-root" @keydown.esc="onEscape">
        <div class="ce-backdrop" @click="requestClose"></div>

        <div class="ce-panel">
          <header class="ce-header">
            <v-icon size="22" color="primary" class="mr-2">{{ isEdit ? 'mdi-file-edit-outline' : 'mdi-pencil-plus-outline' }}</v-icon>
            <span class="ce-header__label">{{ isEdit ? '编辑文档' : '新建文档' }}</span>
            <input
              v-model="title"
              class="ce-header__title"
              :placeholder="isEdit ? '可修改文档标题' : '输入文档标题，例如：投资周报'"
              maxlength="100"
            />
            <v-btn-toggle
              v-model="mode"
              density="compact"
              variant="outlined"
              divided
              mandatory
              color="primary"
              class="mx-3"
            >
              <v-btn value="edit" size="small">
                <v-icon size="16" class="mr-1">mdi-pencil</v-icon>
                编辑
              </v-btn>
              <v-btn value="split" size="small">
                <v-icon size="16" class="mr-1">mdi-view-split-vertical</v-icon>
                分屏
              </v-btn>
              <v-btn value="preview" size="small">
                <v-icon size="16" class="mr-1">mdi-eye-outline</v-icon>
                预览
              </v-btn>
            </v-btn-toggle>
            <v-btn icon variant="text" size="small" @click="requestClose">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </header>

          <main class="ce-body" :class="{ 'ce-body--split': mode === 'split' }">
            <textarea
              v-if="mode !== 'preview'"
              ref="textareaRef"
              v-model="content"
              class="ce-body__textarea"
              placeholder="# 标题&#10;&#10;开始编写 Markdown 内容...&#10;&#10;支持 ⌘/Ctrl + Enter 快速创建，Tab 缩进两格"
              @keydown="onKeydown"
              @scroll="syncScroll"
            ></textarea>
            <div
              v-if="mode !== 'edit'"
              ref="previewRef"
              class="ce-body__preview ce-md"
              v-html="preview"
            ></div>
          </main>

          <footer class="ce-footer">
            <v-combobox
              v-model="selectedTags"
              :items="availableTags"
              item-title="tagName"
              item-value="tagId"
              label="选择标签"
              multiple
              chips
              closable-chips
              variant="outlined"
              density="compact"
              hide-details
              class="ce-footer__tags"
            ></v-combobox>
            <v-spacer></v-spacer>
            <span class="text-caption text-grey mr-3">{{ content.length }} 字符</span>
            <v-btn variant="text" class="mr-2" @click="requestClose">取消</v-btn>
            <v-btn
              color="primary"
              :loading="saving"
              :disabled="!canSubmit"
              @click="emitSubmit"
            >
              {{ isEdit ? '保存' : '创建' }}
              <v-icon end size="14">mdi-keyboard-return</v-icon>
            </v-btn>
          </footer>
        </div>

        <Transition name="ce-fade">
          <div v-if="confirming" class="ce-confirm" @keydown.esc.stop.prevent="confirming = false">
            <div class="ce-confirm__card">
              <div class="text-body-1 mb-1">有未保存的内容</div>
              <div class="text-caption text-grey mb-4">退出后当前编写的内容将丢失</div>
              <div class="d-flex justify-end">
                <v-btn variant="text" class="mr-2" @click="confirming = false">继续编辑</v-btn>
                <v-btn color="error" variant="tonal" @click="forceClose">放弃并退出</v-btn>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  modelValue: Boolean,
  availableTags: { type: Array, default: () => [] },
  saving: Boolean,
  // 传入文档对象进入编辑模式（复用同一套沉浸式 UI），null 为创建模式
  doc: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue', 'create', 'save'])

const md = new MarkdownIt({ html: true, linkify: true, typographer: true })

const title = ref('')
const content = ref('')
const selectedTags = ref([])
const mode = ref('split')
const confirming = ref(false)
const textareaRef = ref(null)
const previewRef = ref(null)

const preview = computed(() => md.render(content.value || ''))

const isEdit = computed(() => !!props.doc)

const canSubmit = computed(() => {
  if (props.saving) return false
  if (isEdit.value) return !!title.value.trim()
  return !!title.value.trim() && !!content.value.trim()
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      if (props.doc) {
        // 编辑模式：预填原文
        title.value = props.doc.docTitle || ''
        content.value = props.doc.docContent || ''
        selectedTags.value = [...(props.doc.tags || [])]
      } else {
        title.value = ''
        content.value = ''
        selectedTags.value = []
      }
      mode.value = 'split'
      confirming.value = false
      document.body.style.overflow = 'hidden'
      nextTick(() => textareaRef.value?.focus())
    } else {
      document.body.style.overflow = ''
    }
  }
)

onUnmounted(() => {
  document.body.style.overflow = ''
})

const requestClose = () => {
  if (confirming.value) {
    confirming.value = false
    return
  }
  if (content.value.trim()) {
    confirming.value = true
    return
  }
  emit('update:modelValue', false)
}

const forceClose = () => {
  confirming.value = false
  emit('update:modelValue', false)
}

const onEscape = () => {
  if (confirming.value) {
    confirming.value = false
  } else {
    requestClose()
  }
}

const emitSubmit = () => {
  if (!canSubmit.value) return
  const tagIds = selectedTags.value.map(t => (typeof t === 'object' ? t.tagId : t))
  if (isEdit.value) {
    emit('save', {
      docId: props.doc.docId,
      docTitle: title.value.trim(),
      docContent: content.value,
      tagIds
    })
  } else {
    emit('create', {
      docTitle: title.value.trim(),
      docContent: content.value,
      tagIds
    })
  }
}

const onKeydown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    emitSubmit()
  } else if (e.key === 'Tab') {
    e.preventDefault()
    const el = e.target
    const start = el.selectionStart
    const end = el.selectionEnd
    content.value = content.value.slice(0, start) + '  ' + content.value.slice(end)
    nextTick(() => {
      el.selectionStart = el.selectionEnd = start + 2
    })
  }
}

// 分屏模式下，编辑区滚动带动预览区滚动
const syncScroll = (e) => {
  if (mode.value !== 'split' || !previewRef.value) return
  const el = e.target
  const max = el.scrollHeight - el.clientHeight
  const ratio = max > 0 ? el.scrollTop / max : 0
  previewRef.value.scrollTop = ratio * (previewRef.value.scrollHeight - previewRef.value.clientHeight)
}
</script>

<style scoped>
.ce-root {
  position: fixed;
  inset: 0;
  z-index: 1900;
}
.ce-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(22, 30, 42, 0.32);
  backdrop-filter: blur(22px) saturate(1.25);
  -webkit-backdrop-filter: blur(22px) saturate(1.25);
}
.ce-panel {
  position: absolute;
  top: 2vh;
  left: 50%;
  transform: translateX(-50%);
  width: min(96vw, 1720px);
  height: 96vh;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  background: rgba(248, 250, 252, 0.78);
  backdrop-filter: blur(32px) saturate(1.6);
  -webkit-backdrop-filter: blur(32px) saturate(1.6);
  border: 1px solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 32px 96px rgba(0, 0, 0, 0.32);
  overflow: hidden;
}

/* 头部 */
.ce-header {
  display: flex;
  align-items: center;
  padding: 18px 24px 14px;
}
.ce-header__label {
  font-size: 14px;
  font-weight: 500;
  color: #78909c;
  white-space: nowrap;
  margin-right: 20px;
}
.ce-header__title {
  flex: 1;
  min-width: 0;
  height: 44px;
  padding: 0 4px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 24px;
  font-weight: 600;
  color: #263238;
  caret-color: #1976d2;
}
.ce-header__title::placeholder {
  color: #b0bec5;
  font-weight: 400;
}

/* 编写区 */
.ce-body {
  flex: 1;
  min-height: 0;
  display: flex;
  margin: 0 24px;
  border-radius: 14px;
  border: 1px solid rgba(207, 216, 222, 0.9);
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  overflow: hidden;
}
.ce-body--split .ce-body__textarea {
  border-right: 1px solid rgba(226, 232, 238, 0.95);
}
.ce-body__textarea {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 26px 30px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 15px;
  line-height: 2;
  color: #263238;
}
.ce-body__textarea::placeholder {
  color: #b0bec5;
}
.ce-body__preview {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 26px 34px;
  overflow-y: auto;
}

/* 底部 */
.ce-footer {
  display: flex;
  align-items: center;
  padding: 14px 24px 18px;
}
.ce-footer__tags {
  flex: 0 1 420px;
  min-width: 200px;
}

/* 退出确认 */
.ce-confirm {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(38, 50, 66, 0.2);
}
.ce-confirm__card {
  padding: 24px 28px;
  min-width: 320px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
}

/* 进出场动画 */
.ce-fade-enter-active {
  transition: opacity 0.26s ease;
}
.ce-fade-leave-active {
  transition: opacity 0.2s ease;
}
.ce-fade-enter-from,
.ce-fade-leave-to {
  opacity: 0;
}
.ce-fade-enter-active .ce-panel {
  transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.ce-fade-enter-from .ce-panel {
  transform: translateX(-50%) scale(0.965) translateY(18px);
}
</style>

<style>
/* v-html 渲染的 Markdown 内容无法带 scoped 属性，这里用 ce-md 前缀隔离 */
.ce-md {
  color: #37474f;
  font-size: 15px;
  line-height: 1.9;
  word-break: break-word;
}
.ce-md h1,
.ce-md h2,
.ce-md h3,
.ce-md h4 {
  margin: 1.2em 0 0.6em;
  font-weight: 600;
  color: #263238;
}
.ce-md h1 { font-size: 1.7em; }
.ce-md h2 { font-size: 1.4em; }
.ce-md h3 { font-size: 1.2em; }
.ce-md p { margin: 0.7em 0; }
.ce-md a { color: #1976d2; text-decoration: none; }
.ce-md a:hover { text-decoration: underline; }
.ce-md ul,
.ce-md ol { padding-left: 1.6em; margin: 0.6em 0; }
.ce-md li { margin: 0.25em 0; }
.ce-md blockquote {
  margin: 0.8em 0;
  padding: 0.4em 1em;
  border-left: 3px solid #90caf9;
  background: rgba(144, 202, 249, 0.12);
  border-radius: 0 8px 8px 0;
  color: #546e7a;
}
.ce-md code {
  padding: 0.15em 0.45em;
  border-radius: 5px;
  background: rgba(120, 144, 156, 0.14);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.88em;
  color: #d32f2f;
}
.ce-md pre {
  padding: 14px 18px;
  border-radius: 10px;
  background: rgba(38, 50, 66, 0.92);
  overflow-x: auto;
}
.ce-md pre code {
  padding: 0;
  background: transparent;
  color: #eceff1;
}
.ce-md table {
  border-collapse: collapse;
  margin: 0.8em 0;
  width: 100%;
}
.ce-md th,
.ce-md td {
  border: 1px solid #cfd8dc;
  padding: 6px 12px;
}
.ce-md th { background: rgba(207, 216, 222, 0.35); }
.ce-md img { max-width: 100%; border-radius: 8px; }
.ce-md hr {
  border: none;
  border-top: 1px solid #cfd8dc;
  margin: 1.4em 0;
}
</style>
