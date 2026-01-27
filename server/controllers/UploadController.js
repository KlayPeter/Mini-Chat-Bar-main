const path = require('path');
const fs = require('fs');

class UploadController {
  // 文件上传处理
  static async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          message: '没有文件被上传' 
        });
      }

      const file = req.file;
      const fileUrl = `/uploads/${file.filename}`;
      
      // 处理中文文件名编码问题
      let originalName = file.originalname;
      try {
        originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (e) {
        // 如果转换失败，使用原始文件名
        originalName = file.originalname;
      }

      res.json({
        success: true,
        message: '文件上传成功',
        fileName: originalName,
        fileUrl: fileUrl,
        fileSize: file.size,
        fileType: file.mimetype
      });
    } catch (err) {
      console.error('文件上传失败:', err);
      res.status(500).json({ 
        message: '文件上传失败',
        error: err.message 
      });
    }
  }

  // 获取文件
  static async getFile(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../uploads', filename);
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          message: '文件不存在' 
        });
      }

      // 发送文件
      res.sendFile(filePath);
    } catch (err) {
      console.error('获取文件失败:', err);
      res.status(500).json({ 
        message: '获取文件失败',
        error: err.message 
      });
    }
  }

  // 删除文件
  static async deleteFile(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../uploads', filename);
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          message: '文件不存在' 
        });
      }

      // 删除文件
      fs.unlinkSync(filePath);
      
      res.json({
        message: '文件删除成功'
      });
    } catch (err) {
      console.error('删除文件失败:', err);
      res.status(500).json({ 
        message: '删除文件失败',
        error: err.message 
      });
    }
  }

  // 获取文件信息
  static async getFileInfo(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../uploads', filename);
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ 
          message: '文件不存在' 
        });
      }

      // 获取文件统计信息
      const stats = fs.statSync(filePath);
      const fileExtension = path.extname(filename);
      
      res.json({
        filename: filename,
        size: stats.size,
        extension: fileExtension,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      });
    } catch (err) {
      console.error('获取文件信息失败:', err);
      res.status(500).json({ 
        message: '获取文件信息失败',
        error: err.message 
      });
    }
  }

  // 获取上传目录中的所有文件列表
  static async getFileList(req, res) {
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        return res.json({
          message: '上传目录不存在',
          files: []
        });
      }

      const files = fs.readdirSync(uploadsDir);
      const fileList = files.map(filename => {
        const filePath = path.join(uploadsDir, filename);
        const stats = fs.statSync(filePath);
        
        return {
          filename: filename,
          size: stats.size,
          extension: path.extname(filename),
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/uploads/${filename}`
        };
      });

      res.json({
        message: '获取文件列表成功',
        files: fileList,
        total: fileList.length
      });
    } catch (err) {
      console.error('获取文件列表失败:', err);
      res.status(500).json({ 
        message: '获取文件列表失败',
        error: err.message 
      });
    }
  }
}

module.exports = UploadController;