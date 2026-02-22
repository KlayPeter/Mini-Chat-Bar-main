/**
 * BaseAgent - 基于 LangChain 的 Agent 基类
 */

const { Tool } = require('@langchain/core/tools');
const axios = require('axios');

class BaseAgent {
  constructor(name, description = '') {
    this.name = name;
    this.description = description;
    this.tools = new Map();
    this.stepResults = [];
    this.verbose = process.env.AGENT_VERBOSE === 'true';
  }

  /**
   * 注册工具
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
   */
  registerTools(tools) {
    for (const [name, fn] of Object.entries(tools)) {
      this.registerTool(name, fn);
    }
  }

  /**
   * 执行任务
   */
  async execute(task) {
    this.log(`\n🚀 [${this.name}] 开始执行任务`);
    this.stepResults = [];

    try {
      const steps = this.planSteps(task);
      this.log(`📋 规划了 ${steps.length} 个步骤`);

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        this.log(`\n⏳ 步骤 ${i + 1}/${steps.length}: ${step.tool}`);

        const result = await this.executeStep(step, i);
        this.stepResults.push(result);

        this.log(`✅ 步骤 ${i + 1} 完成`);
      }

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
   */
  async executeStep(step, stepIndex) {
    const tool = this.tools.get(step.tool);
    if (!tool) {
      throw new Error(`工具不存在: ${step.tool}`);
    }

    const params = this.resolveParams(step.params);
    const result = await tool.fn(params);

    return result;
  }

  /**
   * 解析参数（支持占位符）
   */
  resolveParams(params) {
    if (!params) return {};

    const resolved = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('{{step')) {
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
        resolved[key] = this.resolveParams(value);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * 规划执行步骤（子类必须实现）
   */
  planSteps(task) {
    throw new Error('子类必须实现 planSteps 方法');
  }

  /**
   * 格式化最终结果（子类必须实现）
   */
  formatResult(results, task) {
    throw new Error('子类必须实现 formatResult 方法');
  }

  /**
   * 调用 AI
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

      if (jsonMode) {
        try {
          return JSON.parse(content);
        } catch {
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
