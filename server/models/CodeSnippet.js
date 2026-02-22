const mongoose = require('mongoose')

const codeSnippetSchema = new mongoose.Schema({
  title: { type: String, required: true },
  code: { type: String, required: true },
  language: { type: String, required: true },
  description: String,
  tags: [String],
  author: { type: String, required: true },
  isPublic: { type: Boolean, default: false },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 }
}, { timestamps: true })

codeSnippetSchema.index({ author: 1, createdAt: -1 })
codeSnippetSchema.index({ tags: 1 })

module.exports = mongoose.model('CodeSnippet', codeSnippetSchema)
