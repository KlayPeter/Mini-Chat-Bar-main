/**
 * BaseAgent - 简单的 Agent 基类
 * 
 * 特点：
 * - 不依赖 LangChain，自己实现
 * - 支持工具注册和调用
 * - 支持步骤规划和执行
 * - 支持步骤间数据传递
 */

const axios = require('axios');

class BaseAgent {
  constructor(name, description = '') {
    this.name = name;
    this.description = description;
    this.tools = new Map();  // 工具注册表
    this.stepResults = [];   // 步骤执行结果
    this.verbose = process.env.AGENT_VERBOSE === 'true';  // 是否输出详细日志
  }

  /**
   * 注册工具
   * @param {string} name - 工具名称
   * @param {Function} fn - 工具函数
   * @param {string} description - 工具描述
   */
  registerTool(name, fn, description = '') {
    this.tools.set(name, {
      name,
      fn,
      description
    });
    this.log(`📦 注册工具: ${name}`);
  }

  /**
   * 批量注册工具
   * @param {Object} tools - 工具对象 { name: fn }
   */
  registerTools(tools) {
    for (const [name, fn] of Object.entries(tools)) {
      this.registerTool(name, fn);
    }
  }

  /**
   * 执行任务（主入口）
   * @param {Object} task - 任务参数
   * @returns {Object} - 执行结果
   */
  async execute(task) {
    this.log(`\n🚀 [${this.name}] 开始执行任务`);
    this.stepResults = [];  // 重置结果

    try {
      // 1. 规划步骤
      const steps = this.planSteps(task);
      this.log(`📋 规划了 ${steps.length} 个步骤`);

      // 2. 执行步骤
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        this.log(`\n⏳ 步骤 ${i + 1}/${steps.length}: ${step.tool}`);
        
        const result = await this.executeStep(step, i);
        this.stepResults.push(result);
        
        this.log(`✅ 步骤 ${i + 1} 完成`);
      }

      // 3. 格式化结果
      const finalResult = this.formatResult(this.stepResults, task);
      this.log(`\n🎉 [${this.name}] 任务完成`);
      
      return {
        success: true,
        data: finalResult,
        steps: this.stepResults.length
      };

    } catch (error) {
      this.log(`\n❌ [${this.name}] 任务失败: ${error.message}`);
      return {
        success: false,
        error: error.message,
        steps: this.stepResults.length
      };
    }
  }

  /**
   * 执行单个步骤
   * @param {Object} step - 步骤配置
   * @param {number} stepIndex - 步骤索引
   */
  async executeStep(step, stepIndex) {
    const tool = this.tools.get(step.tool);
    if (!tool) {
      throw new Error(`工具不存在: ${step.tool}`);
    }

    // 解析参数（支持占位符）
    const params = this.resolveParams(step.params);
    
    // 执行工具
    const result = await tool.fn(params);
    
    return result;
  }

  /**
   * 解析参数，支持占位符 {{stepN}} 引用之前步骤的结果
   * @param {Object} params - 原始参数
   */
  resolveParams(params) {
    if (!params) return {};

    const resolved = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('{{step')) {
        // 解析占位符 {{step0}}, {{step1.data}}, etc.
        const match = value.match(/\{\{step(\d+)(\.(\w+))?\}\}/);
        if (match) {
          const stepIndex = parseInt(match[1]);
          const property = match[3];
          
          if (stepIndex < this.stepResults.length) {
            const stepResult = this.stepResults[stepIndex];
            resolved[key] = property ? stepResult[property] : stepResult;
          } else {
            throw new Error(`引用的步骤 ${stepIndex} 还未执行`);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // 递归解析嵌套对象
        resolved[key] = this.resolveParams(value);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * 规划执行步骤（子类必须实现）
   * @param {Object} task - 任务参数
   * @returns {Array} - 步骤列表
   */
  planSteps(task) {
    throw new Error('子类必须实现 planSteps 方法');
  }

  /**
   * 格式化最终结果（子类必须实现）
   * @param {Array} results - 所有步骤的结果
   * @param {Object} task - 原始任务参数
   */
  formatResult(results, task) {
    throw new Error('子类必须实现 formatResult 方法');
  }

  /**
   * 调用 AI（DeepSeek）
   * @param {string} prompt - 提示词
   * @param {Object} options - 选项
   */
  async callAI(prompt, options = {}) {
    const {
      temperature = 0.7,
      maxTokens = 2000,
      jsonMode = false
    } = options;

    try {
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature,
          max_tokens: maxTokens,
          response_format: jsonMode ? { type: 'json_object' } : undefined
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
          },
          timeout: 30000
        }
      );

      const content = response.data.choices[0]?.message?.content || '';
      
      // 如果是 JSON 模式，尝试解析
      if (jsonMode) {
        try {
          return JSON.parse(content);
        } catch {
          // 尝试提取 JSON
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        }
      }

      return content;

    } catch (error) {
      this.log(`❌ AI 调用失败: ${error.message}`);
      throw new Error(`AI 调用失败: ${error.message}`);
    }
  }

  /**
   * 日志输出
   */
  log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }
}

module.exports = BaseAgent;
