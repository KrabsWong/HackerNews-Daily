# Change: Complete Utils and API Module Test Coverage

## Why

测试基础设施已经搭建完成，但当前整体测试覆盖率仅为 5.82%，远低于 80% 的目标。Utils 模块虽然已有 4 个测试文件，但仍缺少关键的 `fetch.ts` 测试，导致模块覆盖率仅为 54.24%。同时，API 模块（Firebase, Algolia, Mapper）完全没有测试覆盖。

需要立即完成 Utils 和 API 模块的测试覆盖，作为达成整体 80% 覆盖率目标的第一步。

## What Changes

- **NEW**: `src/__tests__/utils/fetch.test.ts` - 测试 HTTP 请求封装（fetchJSON, get, post）
- **NEW**: `src/__tests__/api/firebase.test.ts` - 测试 Firebase API 客户端
- **NEW**: `src/__tests__/api/algolia.test.ts` - 测试 Algolia API 客户端（包括批量查询）
- **NEW**: `src/__tests__/api/mapper.test.ts` - 测试数据映射转换
- **IMPROVE**: 补充 `array.test.ts` 和 `html.test.ts` 的边界测试用例以达到 100% 覆盖率

### 覆盖率提升预期

**当前状态**:
- Utils 模块: 54.24% → 目标 100%
- API 模块: 0% → 目标 90%+
- 整体: 5.82% → 预期 15-20%

**具体文件**:
- ✅ date.ts: 100% (已完成)
- ✅ result.ts: 100% (已完成)
- array.ts: 94.66% → 100%
- html.ts: 78.57% → 100%
- fetch.ts: 0% → 90%+
- firebase.ts: 0% → 90%+
- algolia.ts: 0% → 90%+
- mapper.ts: 0% → 90%+

## Impact

### Affected Specs
- **MODIFIED**: `test-infrastructure` - 添加 Utils 和 API 模块测试完成度要求

### Affected Code
- `src/__tests__/utils/fetch.test.ts` - 新增
- `src/__tests__/api/firebase.test.ts` - 新增
- `src/__tests__/api/algolia.test.ts` - 新增
- `src/__tests__/api/mapper.test.ts` - 新增
- `src/__tests__/utils/array.test.ts` - 补充测试
- `src/__tests__/utils/html.test.ts` - 补充测试

### Breaking Changes
None. 这是纯粹的测试覆盖率提升，不影响任何生产代码。

## Success Criteria
- [ ] Utils 模块所有文件达到 100% 覆盖率
- [ ] API 模块所有文件达到 90%+ 覆盖率
- [ ] 所有测试用例通过
- [ ] 新增测试遵循项目测试组织规范（集中在 `src/__tests__/` 目录）
- [ ] 覆盖率报告验证通过
