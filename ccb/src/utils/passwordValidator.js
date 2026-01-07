// 前端密码强度校验工具
export class PasswordValidator {
  // 密码强度校验规则
  static validate(password) {
    const errors = [];
    
    // 长度校验：至少8位
    if (password.length < 8) {
      errors.push('密码长度至少为8位');
    }
    
    // 数字校验
    if (!/\d/.test(password)) {
      errors.push('密码必须包含至少一个数字');
    }
    
    // 英文字母校验
    if (!/[a-zA-Z]/.test(password)) {
      errors.push('密码必须包含至少一个英文字母');
    }
    
    // 特殊符号校验
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('密码必须包含至少一个特殊符号(!@#$%^&*等)');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      strength: this.calculateStrength(password)
    };
  }
  
  // 计算密码强度
  static calculateStrength(password) {
    let score = 0;
    
    // 长度分数
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 25;
    
    // 包含数字
    if (/\d/.test(password)) score += 25;
    
    // 包含小写字母
    if (/[a-z]/.test(password)) score += 10;
    
    // 包含大写字母
    if (/[A-Z]/.test(password)) score += 15;
    
    // 包含特殊符号
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 25;
    
    // 包含多种字符类型
    const types = [
      /\d/.test(password),
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ].filter(Boolean).length;
    
    if (types >= 3) score += 10;
    if (types >= 4) score += 15;
    
    // 限制最高分数
    score = Math.min(score, 100);
    
    if (score < 40) return { level: '弱', color: '#ff4757', percentage: score };
    if (score < 70) return { level: '中', color: '#ffa726', percentage: score };
    if (score < 90) return { level: '强', color: '#26a69a', percentage: score };
    return { level: '很强', color: '#4caf50', percentage: score };
  }
  
  // 邮箱格式校验
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
