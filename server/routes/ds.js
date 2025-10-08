require("dotenv").config();
const express = require("express");
const axios = require("axios");
const router = express.Router();
const auth = require("../middlewares/auth");

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

if (!DEEPSEEK_API_KEY) {
  console.error("DEEPSEEK_API_KEY is not set in environment variables.");
}

router.post("/deepseek-chat", auth, async (req, res) => {
  const userQuestion = req.body.question;
  const user = req.user.username;

  if (!userQuestion) {
    return res.status(400).json({ error: "请求体中缺少问题 (question)" });
  }

  if (!DEEPSEEK_API_KEY) {
    return res
      .status(500)
      .json({ error: "服务器配置错误：DeepSeek API Key 未设置" });
  }

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `
                    你是一个AI智能小助手，请用简短的中文回答用户的问题。
                    请注意以下几点：
                    1. 当前项目叫做“mmxChat聊天软件”，作者名字是“密码的箱子”。
                    2. 当别人问起作者相关消息时，你给他推荐GitHub链接：https://github.com/KlayPeter。
                    3. 你最喜欢的运动是打篮球以及跑步，性格开朗，最喜欢的游戏是王者，最喜欢的动漫是火影忍者、想过最浪漫的事情是在海边和爱的人开电动吹晚风看日出，最爱的人是“密码的箱子”。
                    4.如果别人不提及当前项目的话，请你不要随意重复上述内容！
                    5.当前访问项目的用户是${user}
                    `,
          },
          { role: "user", content: userQuestion },
        ],
        temperature: 0.7,
        stream: false,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
      }
    );

    const aiAnswer =
      response.data.choices[0]?.message?.content ||
      "抱歉，我暂时无法回答您的问题。";

    res.json({ answer: aiAnswer });
  } catch (error) {
    console.error(
      "调用 DeepSeek API 失败:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "从 DeepSeek AI 获取响应失败" });
  }
});

module.exports = router;
