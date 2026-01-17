<template>
  <div class="code-input-panel">
    <div class="panel-header">
      <h4>发送代码</h4>
      <button @click="cancel" class="close-btn">
        <X :size="18" />
      </button>
    </div>
    
    <div class="panel-body">
      <div class="form-row">
        <div class="form-group">
          <label>编程语言</label>
          <select v-model="codeData.language" class="form-select">
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="php">PHP</option>
            <option value="ruby">Ruby</option>
            <option value="swift">Swift</option>
            <option value="kotlin">Kotlin</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="sql">SQL</option>
            <option value="bash">Bash</option>
            <option value="json">JSON</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>文件名（可选）</label>
          <input 
            v-model="codeData.fileName" 
            type="text" 
            placeholder="例如：main.js"
            class="form-input"
          />
        </div>
      </div>
      
      <div class="form-group">
        <label>代码内容</label>
        <textarea 
          v-model="codeData.code"
          placeholder="粘贴或输入代码..."
          class="code-textarea"
          rows="12"
        ></textarea>
      </div>
      
      <div class="form-group">
        <label>说明（可选）</label>
        <input 
          v-model="codeData.description" 
          type="text" 
          placeholder="简单描述这段代码..."
          class="form-input"
        />
      </div>
    </div>
    
    <div class="panel-footer">
      <button @click="cancel" class="btn btn-secondary">取消</button>
      <button @click="send" class="btn btn-primary" :disabled="!canSend">
        发送
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { X } from 'lucide-vue-next'

const emit = defineEmits(['send', 'cancel'])

const codeData = ref({
  language: 'javascript',
  fileName: '',
  code: '',
  description: ''
})

const canSend = computed(() => {
  return codeData.value.code.trim().length > 0
})

function send() {
  if (!canSend.value) return
  emit('send', { ...codeData.value })
  // 重置表单
  codeData.value = {
    language: 'javascript',
    fileName: '',
    code: '',
    description: ''
  }
}

function cancel() {
  emit('cancel')
}
</script>

<style scoped lang="scss">
.code-input-panel {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
  
  h4 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
  
  .close-btn {
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: all 0.2s;
    
    &:hover {
      background: #e8e8e8;
      color: #333;
    }
  }
}

.panel-body {
  padding: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 16px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }
  
  .form-input,
  .form-select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    background: #f5f5f5;
    color: #333;
    transition: all 0.2s;
    
    &:focus {
      outline: none;
      border-color: rgb(165, 42, 42);
      box-shadow: 0 0 0 3px rgba(165, 42, 42, 0.1);
      background: white;
    }
  }
  
  .form-select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 36px;
  }
  
  .code-textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    font-size: 13px;
    font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
    background: #1e1e1e;
    color: #d4d4d4;
    resize: vertical;
    line-height: 1.6;
    min-height: 200px;
    
    &:focus {
      outline: none;
      border-color: rgb(165, 42, 42);
      box-shadow: 0 0 0 3px rgba(165, 42, 42, 0.1);
    }
    
    &::placeholder {
      color: #858585;
    }
  }
}

.panel-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  justify-content: flex-end;
  background: #f8f9fa;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &.btn-secondary {
    background: white;
    color: #333;
    border: 1px solid #e0e0e0;
    
    &:hover {
      background: #f5f5f5;
    }
  }
  
  &.btn-primary {
    background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
    color: white;
    box-shadow: 0 2px 8px rgba(165, 42, 42, 0.3);
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(165, 42, 42, 0.4);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
