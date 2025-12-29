## 1. 数据完整性增强

- [x] 1.1 在 `translateTitlesBatch()` 中增加索引校验：确保返回数组长度与输入相同
- [x] 1.2 增加批量翻译后的逐项日志，输出原标题和翻译结果对照
- [x] 1.3 当批量翻译返回数量不足时，使用原标题作为 fallback 而非仅翻译剩余项

## 2. 空内容默认值统一

- [x] 2.1 在 `hackernews.ts` 数据装配阶段确保 description 和 commentSummary 有默认值
- [x] 2.2 在 `markdownExporter.ts` 渲染时再次检查空值，确保显示 "暂无描述" 或 "暂无评论"
- [x] 2.3 移除 `if (story.commentSummary)` 条件判断，改为始终渲染评论区块

## 3. 日志与监控

- [x] 3.1 在数据装配完成后增加对齐验证日志，输出每个 story 的 title/description/comment 是否完整
- [x] 3.2 增加 metrics 记录空内容的数量统计

## 4. 测试

- [x] 4.1 添加单元测试：验证批量翻译结果与输入顺序一致
- [x] 4.2 添加单元测试：验证空描述/空评论时显示默认文案
- [x] 4.3 添加集成测试：端到端验证数据一致性

## 5. Documentation Update (REQUIRED)

- [x] 5.1 Check README.md for affected sections
- [x] 5.2 Check openspec/project.md for structural changes
- [x] 5.3 Check docs/ for affected guides
- [x] 5.4 Update or remove references to changed features
- [x] 5.5 Test code examples in documentation
- [x] 5.6 Verify no broken links or outdated information
