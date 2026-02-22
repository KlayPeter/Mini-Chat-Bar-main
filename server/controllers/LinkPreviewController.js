const axios = require('axios')
const cheerio = require('cheerio')

class LinkPreviewController {
  static async fetchPreview(req, res) {
    try {
      const { url } = req.body

      if (!url) {
        return res.status(400).json({ success: false, message: 'URL不能为空' })
      }

      // 验证URL格式
      let validUrl
      try {
        validUrl = new URL(url)
      } catch {
        return res.status(400).json({ success: false, message: 'URL格式无效' })
      }

      // 爬取网页内容
      let response
      let fetchUrl = url

      try {
        response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          validateStatus: (status) => status < 500
        })

        // 如果失败，尝试只获取基础域名
        if (response.status >= 400) {
          fetchUrl = `${validUrl.protocol}//${validUrl.hostname}`
          response = await axios.get(fetchUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            validateStatus: (status) => status < 500
          })
        }
      } catch (err) {
        // 如果完整URL失败，尝试基础域名
        fetchUrl = `${validUrl.protocol}//${validUrl.hostname}`
        response = await axios.get(fetchUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
      }

      if (response.status >= 400) {
        return res.status(400).json({
          success: false,
          message: `无法访问该URL (HTTP ${response.status})`
        })
      }

      const html = response.data
      const $ = cheerio.load(html)

      // 提取元数据
      const title = $('meta[property="og:title"]').attr('content') ||
                    $('title').text() ||
                    validUrl.hostname

      const description = $('meta[property="og:description"]').attr('content') ||
                         $('meta[name="description"]').attr('content') ||
                         ''

      const favicon = $('link[rel="icon"]').attr('href') ||
                     $('link[rel="shortcut icon"]').attr('href') ||
                     `${validUrl.protocol}//${validUrl.hostname}/favicon.ico`

      // 如果favicon是相对路径，转换为绝对路径
      let faviconUrl = favicon
      if (favicon && !favicon.startsWith('http')) {
        faviconUrl = new URL(favicon, url).href
      }

      // 提取正文内容用于AI总结
      const bodyText = $('article, main, .content, #content, body')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 2000)

      // 使用AI总结（如果有配置）
      let aiSummary = description
      if (bodyText && process.env.OPENAI_API_KEY) {
        try {
          const summaryResponse = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: '你是一个技术文档总结助手。请用一句话（不超过100字）总结网页的核心内容。'
                },
                {
                  role: 'user',
                  content: `请总结这个网页的内容：\n\n${bodyText}`
                }
              ],
              max_tokens: 150
            },
            {
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          )
          aiSummary = summaryResponse.data.choices[0].message.content
        } catch (err) {
          console.log('AI总结失败，使用原始描述:', err.message)
        }
      }

      res.json({
        success: true,
        preview: {
          url,
          title: title.substring(0, 200),
          description: aiSummary.substring(0, 300),
          favicon: faviconUrl
        }
      })

    } catch (err) {
      console.error('获取链接预览失败:', err.message)
      console.error('错误详情:', err.code, err.response?.status)
      res.status(500).json({
        success: false,
        message: '获取链接预览失败',
        error: err.message,
        code: err.code
      })
    }
  }
}

module.exports = LinkPreviewController
