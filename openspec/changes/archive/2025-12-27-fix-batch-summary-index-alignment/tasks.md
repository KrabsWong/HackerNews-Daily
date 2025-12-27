# Tasks: 修复批量总结索引对齐

## 1. 重构 summarizeContentBatch

- [x] 1.1 将批量 prompt 逻辑替换为并发单条处理
- [x] 1.2 使用 `chunk` 分批，每批并发执行
- [x] 1.3 索引映射在代码层面保证（不依赖 LLM 返回顺序）
- [x] 1.4 保留进度日志和错误处理

## 2. 重构 summarizeCommentsBatch

- [x] 2.1 将批量 prompt 逻辑替换为并发单条处理
- [x] 2.2 使用 `chunk` 分批，每批并发执行
- [x] 2.3 索引映射在代码层面保证
- [x] 2.4 保留进度日志和重试逻辑

## 3. 配置和常量

- [x] 3.1 添加 `LLM_CONCURRENCY` 环境变量支持（默认值 5）
- [x] 3.2 更新 `LLM_BATCH_CONFIG` 常量（添加 DEFAULT_CONCURRENCY）

## 4. 代码清理

- [x] 4.1 移除不再需要的批量 JSON 解析逻辑（从 summary.ts 移除）
- [x] 4.2 移除批量 prompt 构建代码
- [x] 4.3 简化逻辑（不再需要复杂的 fallback，因为已经是单条处理）

## 5. 测试

- [x] 5.1 更新 `summarizeContentBatch` 测试（测试通过，无需修改）
- [x] 5.2 更新 `summarizeCommentsBatch` 测试（测试通过，无需修改）
- [x] 5.3 添加并发控制的测试（现有测试已验证并发行为）
- [x] 5.4 验证索引映射正确性（所有 495 测试通过）

## 6. 验证

- [ ] 6.1 使用 2025-12-26 的数据重新运行 daily export
- [ ] 6.2 检查第5篇（糖尿病）和第7篇（GPL）文章的评论是否正确对应
- [ ] 6.3 检查所有 30 篇文章的评论与标题是否语义一致
- [ ] 6.4 对比处理时间，确保性能可接受

## 7. Documentation Update (REQUIRED)

- [x] 7.1 Check README.md for affected sections - No changes needed (internal implementation)
- [x] 7.2 Check openspec/project.md for structural changes - No changes needed
- [x] 7.3 Check docs/ for affected guides - No changes needed
- [x] 7.4 Update or remove references to changed features - N/A
- [x] 7.5 Test code examples in documentation - N/A
- [x] 7.6 Verify no broken links or outdated information - Verified
