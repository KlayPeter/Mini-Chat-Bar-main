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
      <button @click="runCode" class="run-btn">
        <Play :size="16" />
        <span>运行</span>
      </button>
      <button @click="saveSnippet" class="save-btn">
        <Save :size="16" />
        <span>保存</span>
      </button>
      <button @click="toggleHistory" class="history-btn">
        <History :size="16" />
        <span>历史</span>
      </button>
      <div class="connection-status" :class="connectionStatus">
        <span class="status-dot"></span>
        {{ connectionText }}
      </div>
      <div class="online-users">
        <Users :size="16" />
        <span>{{ onlineUsers }}</span>
      </div>
    </div>
    <div class="editor-content">
      <div ref="editorContainer" class="editor"></div>
      <div v-if="showHistory" class="history-panel">
        <div class="history-header">
          <h3>代码历史</h3>
          <button @click="showHistory = false" class="close-btn">
            <X :size="18" />
          </button>
        </div>
        <div v-if="historyLoading" class="history-loading">加载中...</div>
        <div v-else-if="historyList.length === 0" class="history-empty">暂无历史记录</div>
        <div v-else class="history-list">
          <div v-for="item in historyList" :key="item._id" class="history-item" @click="loadHistory(item)">
            <div class="history-time">{{ formatTime(item.createdAt) }}</div>
            <div class="history-preview">{{ item.code.substring(0, 50) }}...</div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="output" class="output-panel">
      <div class="output-header">输出结果</div>
      <pre>{{ output }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import * as monaco from 'monaco-editor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { MonacoBinding } from 'y-monaco'
import { Play, Save, History, Users, X } from 'lucide-vue-next'
import axios from 'axios'

const props = defineProps({
  roomId: { type: String, required: true },
  initialLanguage: { type: String, default: 'javascript' }
})

const emit = defineEmits(['save'])

const editorContainer = ref(null)
const language = ref(props.initialLanguage)
const output = ref('')
const showHistory = ref(false)
const historyList = ref([])
const historyLoading = ref(false)
const connectionStatus = ref('disconnected')
const onlineUsers = ref(0)

let editor = null
let provider = null
let binding = null

const connectionText = computed(() => {
  const statusMap = {
    connected: '已连接',
    connecting: '连接中',
    disconnected: '未连接'
  }
  return statusMap[connectionStatus.value] || '未知'
})

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

  const ydoc = new Y.Doc()
  const ytext = ydoc.getText('monaco')

  const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
  const wsUrl = `${baseUrl}/code-collab?room=${props.roomId}`
  provider = new WebsocketProvider(wsUrl, '', ydoc, { connect: true })

  binding = new MonacoBinding(ytext, editor.getModel(), new Set([editor]))

  provider.on('status', ({ status }) => {
    connectionStatus.value = status
  })

  provider.on('sync', (isSynced) => {
    if (isSynced) {
      updateOnlineUsers()
    }
  })

  provider.awareness.on('change', () => {
    updateOnlineUsers()
  })
}

const updateOnlineUsers = () => {
  if (provider?.awareness) {
    onlineUsers.value = provider.awareness.getStates().size
  }
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

const toggleHistory = async () => {
  showHistory.value = !showHistory.value
  if (showHistory.value && historyList.value.length === 0) {
    await fetchHistory()
  }
}

const fetchHistory = async () => {
  historyLoading.value = true
  try {
    const response = await axios.get(`/api/snippet/room/${props.roomId}`)
    historyList.value = response.data.snippets || []
  } catch (error) {
    console.error('获取历史失败:', error)
  } finally {
    historyLoading.value = false
  }
}

const loadHistory = (item) => {
  editor.setValue(item.code)
  monaco.editor.setModelLanguage(editor.getModel(), item.language)
  language.value = item.language
  showHistory.value = false
}

const formatTime = (time) => {
  return new Date(time).toLocaleString('zh-CN')
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
  align-items: center;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: auto;
}

.connection-status.connected {
  background: #1a472a;
  color: #4ade80;
}

.connection-status.connecting {
  background: #422006;
  color: #fb923c;
}

.connection-status.disconnected {
  background: #3f1d1d;
  color: #f87171;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.online-users {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: #3e3e3e;
  border-radius: 4px;
  color: #fff;
  font-size: 12px;
}

.language-select {
  padding: 5px 10px;
  background: #3e3e3e;
  color: #fff;
  border: none;
  border-radius: 4px;
}

.run-btn, .save-btn, .history-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 15px;
  background: #0e639c;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.run-btn:hover, .save-btn:hover, .history-btn:hover {
  background: #1177bb;
  transform: translateY(-1px);
}

.editor-content {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.editor {
  flex: 1;
  min-height: 400px;
}

.history-panel {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 300px;
  background: #252526;
  border-left: 1px solid #3e3e3e;
  display: flex;
  flex-direction: column;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
  z-index: 10;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #3e3e3e;
}

.history-header h3 {
  margin: 0;
  color: #fff;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 18px;
}

.history-loading, .history-empty {
  padding: 20px;
  text-align: center;
  color: #888;
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.history-item {
  padding: 10px;
  border-bottom: 1px solid #3e3e3e;
  cursor: pointer;
}

.history-item:hover {
  background: #2d2d2d;
}

.history-time {
  font-size: 12px;
  color: #888;
  margin-bottom: 5px;
}

.history-preview {
  font-size: 12px;
  color: #d4d4d4;
  font-family: 'Consolas', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
