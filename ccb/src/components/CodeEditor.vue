<template>
  <div class="code-editor-container">
    <div class="editor-toolbar">
      <select v-model="language" @change="changeLanguage" class="language-select">
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="java">Java</option>
        <option value="cpp">C++</option>
        <option value="go">Go</option>
      </select>
      <button @click="runCode" class="run-btn">▶ 运行</button>
      <button @click="saveSnippet" class="save-btn">💾 保存</button>
    </div>
    <div ref="editorContainer" class="editor"></div>
    <div v-if="output" class="output-panel">
      <div class="output-header">输出结果</div>
      <pre>{{ output }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import * as monaco from 'monaco-editor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import axios from 'axios'

const props = defineProps({
  roomId: { type: String, required: true },
  initialLanguage: { type: String, default: 'javascript' }
})

const emit = defineEmits(['save'])

const editorContainer = ref(null)
const language = ref(props.initialLanguage)
const output = ref('')

let editor = null
let provider = null
let binding = null

onMounted(() => {
  initEditor()
})

onBeforeUnmount(() => {
  cleanup()
})

const initEditor = () => {
  editor = monaco.editor.create(editorContainer.value, {
    value: '',
    language: language.value,
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false }
  })

  // Yjs 协同编辑
  const ydoc = new Y.Doc()
  const ytext = ydoc.getText('monaco')

  const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
  const wsUrl = `${baseUrl}/code-collab?room=${props.roomId}`
  provider = new WebsocketProvider(wsUrl, '', ydoc, { connect: true })

  binding = new MonacoBinding(ytext, editor.getModel(), new Set([editor]), provider.awareness)
}

const changeLanguage = () => {
  monaco.editor.setModelLanguage(editor.getModel(), language.value)
}

const runCode = async () => {
  const code = editor.getValue()
  output.value = '执行中...'

  try {
    const response = await axios.post('/api/code/execute', {
      code,
      language: language.value
    })
    output.value = response.data.output || response.data.error
  } catch (error) {
    output.value = `错误: ${error.message}`
  }
}

const saveSnippet = () => {
  emit('save', {
    code: editor.getValue(),
    language: language.value
  })
}

const cleanup = () => {
  binding?.destroy()
  provider?.destroy()
  editor?.dispose()
}
</script>

<style scoped>
.code-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
}

.editor-toolbar {
  display: flex;
  gap: 10px;
  padding: 10px;
  background: #2d2d2d;
  border-bottom: 1px solid #3e3e3e;
}

.language-select {
  padding: 5px 10px;
  background: #3e3e3e;
  color: #fff;
  border: none;
  border-radius: 4px;
}

.run-btn, .save-btn {
  padding: 5px 15px;
  background: #0e639c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.run-btn:hover, .save-btn:hover {
  background: #1177bb;
}

.editor {
  flex: 1;
  min-height: 400px;
}

.output-panel {
  max-height: 200px;
  overflow-y: auto;
  background: #1e1e1e;
  border-top: 1px solid #3e3e3e;
}

.output-header {
  padding: 8px;
  background: #2d2d2d;
  color: #fff;
  font-weight: bold;
}

.output-panel pre {
  padding: 10px;
  margin: 0;
  color: #d4d4d4;
  font-family: 'Consolas', monospace;
}
</style>
