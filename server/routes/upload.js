const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Msg = require('../models/Messages');
const auth = require('../middlewares/auth');

// 创建上传目录
const UPLOADS_DIR = path.join(__dirname, '../uploads');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// 配置 Multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名，保持原始文件扩展名
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
    // 允许的文件类型
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/javascript',
        'application/json', 'application/xml', 'text/xml',
        'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm',
        'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg',
        'text/markdown', 'application/octet-stream'
    ];
    
    // 对于 application/octet-stream，检查文件扩展名
    if (file.mimetype === 'application/octet-stream') {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.md', '.txt', '.doc', '.docx', '.pdf', '.zip', '.rar', '.7z'];
        if (allowedExtensions.includes(ext)) {
            cb(null, true);
            return;
        }
    }
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`不支持的文件类型: ${file.mimetype} (文件: ${file.originalname})`), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB 限制
    }
});

// 文件上传接口
router.post('/', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: '未上传文件' });
        }

        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        const isImage = req.file.mimetype.startsWith('image/');
        const messageType = isImage ? 'image' : 'file';
        
        // 处理中文文件名编码
        let originalName = req.file.originalname;
        try {
            // 尝试修复中文编码
            originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        } catch (e) {
            // 如果转换失败，使用原始文件名
            originalName = req.file.originalname;
        }
        
        // 只返回文件信息，不创建消息记录（由前端调用chat接口创建）
        res.status(200).json({ 
            message: '文件上传成功',
            fileName: originalName,
            fileUrl: fileUrl,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            messageType: messageType
        });
    } catch (error) {
        console.error('文件上传失败:', error);
        res.status(500).json({ message: '文件上传失败', error: error.message });
    }
});

// 获取文件信息
router.get('/file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ message: '文件不存在' });
    }
});

module.exports = router;