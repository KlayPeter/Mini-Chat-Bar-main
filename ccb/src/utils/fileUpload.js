/**
 * 大文件分片上传工具
 * 支持：分片上传、断点续传、秒传、并发控制、进度显示
 */

import axios from 'axios'
import SparkMD5 from 'spark-md5'

// 默认配置
const DEFAULT_CONFIG = {
  chunkSize: 2 * 1024 * 1024, // 2MB 每片
  maxConcurrent: 3, // 最大并发数
  retryTimes: 3, // 重试次数
  retryDelay: 1000, // 重试延迟（毫秒）
}

/**
 * 计算文件 MD5
 * @param {File} file - 文件对象
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<string>} MD5 值
 */
export function calculateFileMD5(file, onProgress) {
  return new Promise((resolve, reject) => {
    const chunkSize = 2 * 1024 * 1024 // 2MB
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader()

    fileReader.onload = (e) => {
      spark.append(e.target.result)
      currentChunk++

      if (onProgress) {
        onProgress(Math.floor((currentChunk / chunks) * 100))
      }

      if (currentChunk < chunks) {
        loadNext()
      } else {
        resolve(spark.end())
      }
    }

    fileReader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    function loadNext() {
      const start = currentChunk * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      fileReader.readAsArrayBuffer(file.slice(start, end))
    }

    loadNext()
  })
}

/**
 * 文件分片上传类
 */
export class ChunkUploader {
  constructor(file, options = {}) {
    this.file = file
    this.config = { ...DEFAULT_CONFIG, ...options }
    this.baseUrl = options.baseUrl || import.meta.env.VITE_BASE_URL
    this.token = options.token || localStorage.getItem('token')
    
    // 分片信息
    this.chunks = []
    this.uploadedChunks = new Set()
    this.failedChunks = new Set()
    
    // 状态
    this.status = 'pending' // pending, hashing, uploading, paused, completed, failed
    this.fileMD5 = null
    this.uploadId = null
    
    // 进度
    this.hashProgress = 0
    this.uploadProgress = 0
    
    // 回调
    this.onHashProgress = options.onHashProgress
    this.onUploadProgress = options.onUploadProgress
    this.onChunkSuccess = options.onChunkSuccess
    this.onChunkError = options.onChunkError
    this.onComplete = options.onComplete
    this.onError = options.onError
    
    // 并发控制
    this.uploadingCount = 0
    this.uploadQueue = []
  }

  /**
   * 开始上传
   */
  async start() {
    try {
      this.status = 'hashing'
      
      // 1. 计算文件 MD5
      this.fileMD5 = await calculateFileMD5(this.file, (progress) => {
        this.hashProgress = progress
        if (this.onHashProgress) {
          this.onHashProgress(progress)
        }
      })

      // 2. 检查文件是否已存在（秒传）
      const checkResult = await this.checkFileExists()
      if (checkResult.exists) {
        this.status = 'completed'
        this.uploadProgress = 100
        if (this.onComplete) {
          this.onComplete({
            fileUrl: checkResult.fileUrl,
            fileName: this.file.name,
            fileSize: this.file.size,
            instantUpload: true
          })
        }
        return
      }

      // 3. 创建分片
      this.createChunks()

      // 4. 检查已上传的分片（断点续传）
      if (checkResult.uploadedChunks) {
        checkResult.uploadedChunks.forEach(index => {
          this.uploadedChunks.add(index)
        })
      }

      // 5. 开始上传
      this.status = 'uploading'
      await this.uploadChunks()

      // 6. 合并分片
      await this.mergeChunks()

      this.status = 'completed'
      this.uploadProgress = 100
      
      if (this.onComplete) {
        this.onComplete({
          fileUrl: checkResult.fileUrl || `/uploads/${this.fileMD5}`,
          fileName: this.file.name,
          fileSize: this.file.size,
          instantUpload: false
        })
      }
    } catch (error) {
      this.status = 'failed'
      if (this.onError) {
        this.onError(error)
      }
      throw error
    }
  }

  /**
   * 暂停上传
   */
  pause() {
    this.status = 'paused'
  }

  /**
   * 恢复上传
   */
  async resume() {
    if (this.status !== 'paused') return
    this.status = 'uploading'
    await this.uploadChunks()
  }

  /**
   * 取消上传
   */
  cancel() {
    this.status = 'cancelled'
    this.uploadQueue = []
  }

  /**
   * 检查文件是否已存在
   */
  async checkFileExists() {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/upload/check`,
        {
          fileMD5: this.fileMD5,
          fileName: this.file.name,
          fileSize: this.file.size
        },
        {
          headers: { Authorization: `Bearer ${this.token}` }
        }
      )
      return response.data
    } catch (error) {
      console.error('检查文件失败:', error)
      return { exists: false }
    }
  }

  /**
   * 创建分片
   */
  createChunks() {
    const chunkCount = Math.ceil(this.file.size / this.config.chunkSize)
    this.chunks = []
    
    for (let i = 0; i < chunkCount; i++) {
      const start = i * this.config.chunkSize
      const end = Math.min(start + this.config.chunkSize, this.file.size)
      this.chunks.push({
        index: i,
        start,
        end,
        blob: this.file.slice(start, end)
      })
    }
  }

  /**
   * 上传所有分片
   */
  async uploadChunks() {
    // 创建上传队列（只包含未上传的分片）
    this.uploadQueue = this.chunks
      .filter(chunk => !this.uploadedChunks.has(chunk.index))
      .map(chunk => chunk.index)

    // 并发上传
    const promises = []
    for (let i = 0; i < this.config.maxConcurrent; i++) {
      promises.push(this.uploadNextChunk())
    }

    await Promise.all(promises)
  }

  /**
   * 上传下一个分片
   */
  async uploadNextChunk() {
    while (this.uploadQueue.length > 0 && this.status === 'uploading') {
      const chunkIndex = this.uploadQueue.shift()
      const chunk = this.chunks[chunkIndex]

      try {
        await this.uploadChunk(chunk)
        this.uploadedChunks.add(chunkIndex)
        this.failedChunks.delete(chunkIndex)
        
        // 更新进度
        this.uploadProgress = Math.floor(
          (this.uploadedChunks.size / this.chunks.length) * 100
        )
        
        if (this.onUploadProgress) {
          this.onUploadProgress(this.uploadProgress)
        }
        
        if (this.onChunkSuccess) {
          this.onChunkSuccess(chunkIndex, this.chunks.length)
        }
      } catch (error) {
        this.failedChunks.add(chunkIndex)
        
        if (this.onChunkError) {
          this.onChunkError(chunkIndex, error)
        }
        
        // 重试
        if (chunk.retryCount < this.config.retryTimes) {
          chunk.retryCount = (chunk.retryCount || 0) + 1
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay))
          this.uploadQueue.push(chunkIndex)
        } else {
          throw new Error(`分片 ${chunkIndex} 上传失败`)
        }
      }
    }
  }

  /**
   * 上传单个分片
   */
  async uploadChunk(chunk) {
    const formData = new FormData()
    formData.append('file', chunk.blob)
    formData.append('fileMD5', this.fileMD5)
    formData.append('fileName', this.file.name)
    formData.append('chunkIndex', chunk.index)
    formData.append('chunkCount', this.chunks.length)

    await axios.post(
      `${this.baseUrl}/api/upload/chunk`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    )
  }

  /**
   * 合并分片
   */
  async mergeChunks() {
    const response = await axios.post(
      `${this.baseUrl}/api/upload/merge`,
      {
        fileMD5: this.fileMD5,
        fileName: this.file.name,
        fileSize: this.file.size,
        chunkCount: this.chunks.length
      },
      {
        headers: { Authorization: `Bearer ${this.token}` }
      }
    )
    
    return response.data
  }
}

/**
 * 简化的上传函数
 * @param {File} file - 文件对象
 * @param {Object} options - 配置选项
 * @returns {Promise} 上传结果
 */
export async function uploadFile(file, options = {}) {
  // 小文件直接上传（< 5MB）
  if (file.size < 5 * 1024 * 1024) {
    return uploadSmallFile(file, options)
  }

  // 大文件分片上传
  return new Promise((resolve, reject) => {
    const uploader = new ChunkUploader(file, {
      ...options,
      onComplete: (result) => {
        resolve(result)
      },
      onError: (error) => {
        reject(error)
      }
    })

    uploader.start()
  })
}

/**
 * 小文件直接上传
 */
async function uploadSmallFile(file, options = {}) {
  const baseUrl = options.baseUrl || import.meta.env.VITE_BASE_URL
  const token = options.token || localStorage.getItem('token')

  const formData = new FormData()
  formData.append('file', file)

  const response = await axios.post(
    `${baseUrl}/api/upload`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (options.onUploadProgress) {
          const progress = Math.floor((progressEvent.loaded / progressEvent.total) * 100)
          options.onUploadProgress(progress)
        }
      }
    }
  )

  return {
    fileUrl: response.data.fileUrl,
    fileName: response.data.fileName,
    fileSize: response.data.fileSize,
    fileType: response.data.fileType
  }
}
