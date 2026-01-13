/**
 * SummaryAgent - 聊天内容总结 Agent
 * 
 * 功能：
 * - 获取聊天消息
 * - 分析消息内容
 * - 生成结构化总结
 */

const BaseAgent = require('./BaseAgent');
const DatabaseTool = require('../tools/DatabaseTool');

class SummaryAgent extends BaseAgent {
  constructor() {
    super('SummaryAgent', '聊天内容总结专家');
    
    // 注册工具
    this.registerTools({
      // 工具1：获取私聊消息
      getPrivateMessages: async (params) => {
        return await DatabaseTool.getPrivateMessages(params);
      },

      // 工具2：获取群聊消息
      getGroupMessages: async (params) => {
        return await DatabaseTool.getGroupMessages(params);
      },

      // 工具3：分析消息统计
      analyzeMessages: async ({ messages }) => {
        return DatabaseTool.analyzeMessages(messages);
      },

      // 工具4：AI 生成总结
      generateSummary: async ({ messages, stats }) => {
        return await this.generateSummaryWithAI(messages, stats);
      }
    });
  }

  /**
   * 规划执行步骤
   */
  planSteps(task) {
    const { chatType, userId, targetId, roomId, timeRange, limit } = task;

    if (chatType === 'private') {
      return [
        {
          tool: 'getPrivateMessages',
          params: { userId, targetId, timeRange, limit: limit || 100 }
        },
        {
          tool: 'analyzeMessages',
          params: { messages: '{{step0}}' }
        },
        {
          tool: 'generateSummary',
          params: { messages: '{{step0}}', stats: '{{step1}}' }
        }
      ];
    } else {
      return [
        {
          tool: 'getGroupMessages',
          params: { roomId, timeRange, limit: limit || 100 }
        },
        {
          tool: 'analyzeMessages',
          params: { messages: '{{step0}}' }
        },
        {
          tool: 'generateSummary',
          params: { messages: '{{step0}}', stats: '{{step1}}' }
        }
      ];
    }
  }

  /**
   * 格式化最终结果
   */
  formatResult(results, task) {
    const [messages, stats, summary] = results;

    return {
      summary,
      statistics: stats,
      messageCount: messages.length,
      chatType: task.chatType,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 使用 AI 生成总结
   */
  async generateSummaryWithAI(messages, stats) {
    if (!messages || messages.length === 0) {
      return {
        title: '无内容',
        overview: '该时间段内没有聊天记录',
        keyPoints: [],
        conclusions: [],
        actionItems: []
      };
    }

    // 格式化消息内容
    const formattedMessages = messages
      .slice(0, 50)  // 限制消息数量，避免 token 过多
      .map(m => {
        const sender = m.senderName || m.from;
        const time = new Date(m.time).toLocaleString('zh-CN');
        return `[${time}] ${sender}: ${m.content}`;
      })
      .join('\n');

    const prompt = `
你是一个专业的会议纪要助手。请对以下聊天记录进行总结分析。

【聊天记录】
${formattedMessages}

【统计信息】
- 消息总数：${stats.totalCount}
- 参与人数：${stats.participantCount}
- 时间范围：${stats.timeRange?.start?.toLocaleString('zh-CN')} 至 ${stats.timeRange?.end?.toLocaleString('zh-CN')}

请生成结构化总结，返回 JSON 格式：
{
  "title": "讨论主题（简短概括）",
  "overview": "整体概述（2-3句话）",
  "keyPoints": [
    "要点1：具体内容",
    "要点2：具体内容"
  ],
  "conclusions": [
    "结论1",
    "结论2"
  ],
  "actionItems": [
    {
      "task": "待办事项描述",
      "assignee": "负责人（如果提到）",
      "deadline": "截止时间（如果提到）"
    }
  ],
  "technicalTerms": [
    {
      "term": "专业术语",
      "context": "出现的上下文"
    }
  ]
}

要求：
1. 提取关键讨论要点（3-5条）
2. 总结讨论结论
3. 提取待办事项（如果有）
4. 识别专业术语（如果有）
5. 简洁明了，突出重点
`;

    try {
      const result = await this.callAI(prompt, { jsonMode: true });
      return result;
    } catch (error) {
      // 降级处理：返回简单总结
      return {
        title: '聊天总结',
        overview: `共 ${stats.totalCount} 条消息，${stats.participantCount} 人参与讨论`,
        keyPoints: ['AI 总结生成失败，请稍后重试'],
        conclusions: [],
        actionItems: [],
        error: error.message
      };
    }
  }
}

module.exports = SummaryAgent;
