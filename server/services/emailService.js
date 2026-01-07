const nodemailer = require('nodemailer');

// 邮件服务配置
const transporter = nodemailer.createTransport({
  service: 'qq', // 使用QQ邮箱
  auth: {
    user: 'kt_mmxyy2377@qq.com',
    pass: 'jafyswntsvjiebba' // QQ邮箱授权码
  }
});

// 验证码存储（实际项目中应该使用Redis）
const verificationCodes = new Map();

class EmailService {
  // 生成6位验证码
  static generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 发送验证码邮件
  static async sendVerificationCode(email, type = 'register') {
    try {
      const code = this.generateVerificationCode();
      const subject = type === 'register' ? '【Mini Chat Bar】注册验证码' : '【Mini Chat Bar】登录验证码';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">Mini Chat Bar</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">
              ${type === 'register' ? '欢迎注册 Mini Chat Bar！' : '验证码登录'}
            </h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              ${type === 'register' ? '感谢您选择我们的聊天应用！' : '您正在尝试登录 Mini Chat Bar。'}
              请使用以下验证码完成${type === 'register' ? '注册' : '登录'}：
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="background: #667eea; color: white; padding: 15px 30px; font-size: 24px; font-weight: bold; border-radius: 8px; letter-spacing: 2px;">
                ${code}
              </span>
            </div>
            <p style="color: #999; font-size: 14px;">
              • 验证码有效期为5分钟<br>
              • 如果您没有进行此操作，请忽略此邮件<br>
              • 请勿向他人透露您的验证码
            </p>
          </div>
          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            © 2024 Mini Chat Bar. All rights reserved.
          </div>
        </div>
      `;

      const mailOptions = {
        from: '"Mini Chat Bar" <kt_mmxyy2377@qq.com>',
        to: email,
        subject: subject,
        html: html
      };

      await transporter.sendMail(mailOptions);

      // 存储验证码（5分钟有效期）
      verificationCodes.set(email, {
        code: code,
        type: type,
        timestamp: Date.now(),
        expires: Date.now() + 5 * 60 * 1000 // 5分钟后过期
      });

      console.log(`验证码已发送到 ${email}: ${code}`);
      return { success: true, message: '验证码发送成功' };
    } catch (error) {
      console.error('发送邮件失败:', error);
      return { success: false, message: '发送验证码失败，请稍后重试' };
    }
  }

  // 验证验证码
  static verifyCode(email, inputCode, type = 'register') {
    const storedData = verificationCodes.get(email);
    
    if (!storedData) {
      return { success: false, message: '验证码不存在或已过期' };
    }

    if (storedData.expires < Date.now()) {
      verificationCodes.delete(email);
      return { success: false, message: '验证码已过期' };
    }

    if (storedData.type !== type) {
      return { success: false, message: '验证码类型不匹配' };
    }

    if (storedData.code !== inputCode) {
      return { success: false, message: '验证码错误' };
    }

    // 验证成功后删除验证码
    verificationCodes.delete(email);
    return { success: true, message: '验证码验证成功' };
  }

  // 清理过期验证码（定时任务）
  static cleanExpiredCodes() {
    const now = Date.now();
    for (const [email, data] of verificationCodes.entries()) {
      if (data.expires < now) {
        verificationCodes.delete(email);
      }
    }
  }
}

// 每分钟清理一次过期验证码
setInterval(() => {
  EmailService.cleanExpiredCodes();
}, 60 * 1000);

module.exports = EmailService;
