<template>
  <div class="message-content-container">
    <div class="message-content-wrapper" v-html="renderedContent"></div>
    <LinkPreview
      v-for="preview in linkPreviews"
      :key="preview.url"
      :preview="preview"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/vs2015.css'
import LinkPreview from './LinkPreview.vue'
import { extractUrls } from '../utils/urlHelper'
import { useLinkPreview } from '../composables/useLinkPreview'

const props = defineProps({
  content: {
    type: String,
    required: true
  }
})

const linkPreviews = ref([])
const { fetchPreview } = useLinkPreview()

onMounted(async () => {
  const urls = extractUrls(props.content)
  for (const url of urls) {
    const preview = await fetchPreview(url)
    if (preview) {
      linkPreviews.value.push(preview)
    }
  }
})

// 配置 marked 使用 highlight.js 进行代码高亮
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (err) {
        console.error('代码高亮失败:', err)
      }
    }
    // 如果没有指定语言或语言不支持，尝试自动检测
    try {
      return hljs.highlightAuto(code).value
    } catch (err) {
      return code
    }
  },
  breaks: true, // 支持换行
  gfm: true, // 启用 GitHub 风格的 Markdown
})

// 渲染 Markdown 内容
const renderedContent = computed(() => {
  try {
    // 使用 marked 解析 Markdown
    let html = marked.parse(props.content)
    
    // 为代码块添加行号和复制按钮
    // 注意：此时 code 内容已经被 highlight.js 处理过，包含了 HTML 标签
    html = html.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g, (_match, lang, highlightedCode) => {
      // 从高亮后的 HTML 中提取纯文本用于行号计算
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = highlightedCode
      const plainText = tempDiv.textContent || tempDiv.innerText || ''
      const lines = plainText.split('\n').filter((line, index, arr) => {
        // 保留所有行，包括空行，但移除最后一个空行（如果存在）
        return index < arr.length - 1 || line.trim() !== ''
      })
      const lineNumbers = lines.map((_, i) => `<span class="line-number">${i + 1}</span>`).join('')
      
      return `
        <div class="code-block-wrapper">
          <div class="code-block-header">
            <span class="language-badge">${lang.toUpperCase()}</span>
            <button class="copy-code-btn" onclick="copyCodeBlock(this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>复制</span>
            </button>
          </div>
          <div class="code-block-body">
            <div class="line-numbers">${lineNumbers}</div>
            <pre><code class="language-${lang} hljs">${highlightedCode}</code></pre>
          </div>
        </div>
      `
    })
    
    // 为行内代码添加样式
    html = html.replace(/<code>([^<]+)<\/code>/g, '<code class="inline-code">$1</code>')
    
    return html
  } catch (err) {
    console.error('Markdown 解析失败:', err)
    return props.content
  }
})

// 添加全局复制函数（通过 window 对象）
if (typeof window !== 'undefined') {
  window.copyCodeBlock = function(button) {
    const codeBlock = button.closest('.code-block-wrapper')
    const code = codeBlock.querySelector('pre code').textContent
    
    navigator.clipboard.writeText(code).then(() => {
      const originalText = button.innerHTML
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>已复制</span>
      `
      button.classList.add('copied')
      
      setTimeout(() => {
        button.innerHTML = originalText
        button.classList.remove('copied')
      }, 2000)
    }).catch(err => {
      console.error('复制失败:', err)
    })
  }
}
</script>

<style lang="scss">
/* 全局导入 highlight.js 样式 - 不使用 scoped */
@import 'highlight.js/styles/vs2015.css';
</style>

<style scoped lang="scss">
.message-content-wrapper {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  word-wrap: break-word;
  
  // Markdown 基础样式
  :deep(p) {
    margin: 0 0 8px 0;
    
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin: 12px 0 8px 0;
    font-weight: 600;
    line-height: 1.3;
  }
  
  :deep(h1) { font-size: 1.8em; }
  :deep(h2) { font-size: 1.5em; }
  :deep(h3) { font-size: 1.3em; }
  :deep(h4) { font-size: 1.1em; }
  
  :deep(ul), :deep(ol) {
    margin: 8px 0;
    padding-left: 24px;
  }
  
  :deep(li) {
    margin: 4px 0;
  }
  
  :deep(blockquote) {
    margin: 8px 0;
    padding: 8px 16px;
    border-left: 4px solid rgb(165, 42, 42);
    background: #f8f9fa;
    color: #666;
  }
  
  :deep(a) {
    color: rgb(255,255,255);
    text-decoration: none;
    border-bottom: 1px solid rgba(165, 42, 42, 0.3);
    transition: all 0.2s;
    
    &:hover {
      border-bottom-color: rgb(167, 90, 90);
      color: rgb(140, 30, 30);
    }
  }
  
  // 行内代码样式
  :deep(.inline-code) {
    padding: 2px 6px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-family: 'Courier New', 'Consolas', monospace;
    font-size: 0.9em;
    color: #e83e8c;
  }
  
  // 代码块容器
  :deep(.code-block-wrapper) {
    margin: 12px 0;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e0e0e0;
    background: #1e1e1e;
  }
  
  :deep(.code-block-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #2d2d2d;
    border-bottom: 1px solid #3a3a3a;
    
    .language-badge {
      padding: 3px 8px;
      background: linear-gradient(135deg, rgb(165, 42, 42) 0%, rgb(140, 30, 30) 100%);
      color: white;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .copy-code-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 4px;
      color: #d4d4d4;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background: rgba(255, 255, 255, 0.15);
        border-color: rgba(255, 255, 255, 0.3);
      }
      
      &.copied {
        background: #4caf50;
        border-color: #4caf50;
        color: white;
      }
      
      svg {
        flex-shrink: 0;
      }
    }
  }
  
  :deep(.code-block-body) {
    display: flex;
    background: #1e1e1e;
    
    .line-numbers {
      display: flex;
      flex-direction: column;
      padding: 12px 8px;
      background: #252525;
      border-right: 1px solid #3a3a3a;
      user-select: none;
      
      .line-number {
        font-family: 'Courier New', 'Consolas', monospace;
        font-size: 12px;
        line-height: 1.6;
        color: #858585;
        text-align: right;
        min-width: 30px;
      }
    }
    
    pre {
      flex: 1;
      margin: 0;
      padding: 12px;
      overflow-x: auto;
      background: #1e1e1e;
      
      code {
        font-family: 'Courier New', 'Consolas', 'Monaco', monospace !important;
        font-size: 13px !important;
        line-height: 1.6 !important;
        color: #d4d4d4 !important;
        background: none !important;
        padding: 0 !important;
        border: none !important;
        font-weight: 400 !important;
        
        // highlight.js 语法高亮类
        .hljs-keyword,
        .hljs-selector-tag,
        .hljs-literal,
        .hljs-section,
        .hljs-link {
          color: #569cd6 !important;
        }
        
        .hljs-string,
        .hljs-attr,
        .hljs-template-variable,
        .hljs-variable {
          color: #ce9178 !important;
        }
        
        .hljs-number {
          color: #b5cea8 !important;
        }
        
        .hljs-built_in,
        .hljs-builtin-name,
        .hljs-function,
        .hljs-title {
          color: #dcdcaa !important;
        }
        
        .hljs-comment {
          color: #6a9955 !important;
        }
        
        .hljs-meta {
          color: #9cdcfe !important;
        }
        
        .hljs-name,
        .hljs-property {
          color: #9cdcfe !important;
        }
        
        .hljs-regexp {
          color: #d16969 !important;
        }
      }
    }
  }
  
  // 确保 highlight.js 的语法高亮类能够正确应用
  :deep(pre code) {
    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-literal,
    .hljs-section,
    .hljs-link {
      color: #569cd6 !important; // 关键字 - 蓝色
    }
    
    .hljs-string,
    .hljs-attr,
    .hljs-template-variable,
    .hljs-variable {
      color: #ce9178 !important; // 字符串 - 橙色
    }
    
    .hljs-number {
      color: #b5cea8 !important; // 数字 - 浅绿色
    }
    
    .hljs-built_in,
    .hljs-builtin-name,
    .hljs-function,
    .hljs-title {
      color: #dcdcaa !important; // 函数 - 黄色
    }
    
    .hljs-comment {
      color: #6a9955 !important; // 注释 - 绿色
    }
    
    .hljs-meta {
      color: #9cdcfe !important; // 元数据 - 浅蓝色
    }
  }
  
  // 表格样式
  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    
    th, td {
      padding: 8px 12px;
      border: 1px solid #e0e0e0;
      text-align: left;
    }
    
    th {
      background: #f8f9fa;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background: #f8f9fa;
    }
  }
  
  // 水平分割线
  :deep(hr) {
    margin: 16px 0;
    border: none;
    border-top: 2px solid #e0e0e0;
  }
}
</style>
