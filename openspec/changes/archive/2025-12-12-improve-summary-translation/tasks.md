# Tasks: improve-summary-translation

## Task List

### Phase 1: 修改配置默认值
- [x] **T1**: 修改 `src/config/constants.ts` 中 `LLM_BATCH_CONFIG.DEFAULT_BATCH_SIZE` 从 `0` 改为 `1`
  - 验证: 配置值已更新 ✓

### Phase 2: 修复批量请求 prompt
- [x] **T2**: 修改 `translator.summarizeContentBatch` 方法的 prompt
  - 移除输出格式中的 "摘要1", "摘要2" 占位符
  - 使用无序号的示例格式
  - 添加明确指令：不要在输出中添加序号或标记
  - 验证: prompt 已更新 ✓

- [x] **T3**: 修改 `translator.translateTitlesBatch` 方法的 prompt
  - 移除输出格式中的 "翻译1", "翻译2" 占位符
  - 验证: prompt 已更新 ✓

- [x] **T4**: 修改 `translator.summarizeCommentsBatch` 方法的 prompt
  - 移除输出格式中的 "摘要1", "摘要2" 占位符
  - 验证: prompt 已更新 ✓

### Phase 3: 优化单请求路径
- [x] **T5**: 优化 `chunk` 方法处理 `batchSize = 1` 的情况
  - 当 batchSize 为 1 时，每个元素作为独立批次
  - 验证: 现有逻辑已满足要求，chunk([a,b,c], 1) 正确返回 [[a], [b], [c]] ✓

### Phase 4: 验证
- [ ] **T6**: 手动测试单请求模式
  - 运行 `npm run fetch -- --no-cache` 验证功能正常
  - 检查输出不包含序号标记

- [ ] **T7**: 验证批量模式仍可通过配置启用
  - 设置 `LLM_BATCH_SIZE=10` 环境变量
  - 验证批量模式正常工作

## Dependencies
- T2, T3, T4 可并行进行
- T6, T7 依赖于 T1-T5 完成

## Implementation Notes
- 构建验证通过: `npm run build` ✓
- T6, T7 为手动验证任务，需要用户在有 DEEPSEEK_API_KEY 的环境中执行
