# Design: Zhipu AI Provider Integration

## Overview

本文档描述智普AI (Zhipu AI) Provider 的技术设计，遵循现有 DeepSeek 和 OpenRouter provider 的实现模式。

## Architecture

### Provider Class Structure

```
src/services/llm/
├── index.ts          # 更新 createLLMProvider 工厂函数
├── providers.ts      # 新增 ZhipuProvider 类
└── utils.ts          # 更新 parseProvider, getApiKeyForProvider 等
```

### Class Diagram

```
LLMProvider (interface)
    ├── DeepSeekProvider
    ├── OpenRouterProvider
    └── ZhipuProvider (NEW)
```

## Zhipu API Specification

### Endpoint

```
POST https://open.bigmodel.cn/api/paas/v4/chat/completions
```

### Request Format (OpenAI-compatible)

```json
{
  "model": "glm-4.5-flash",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 0.7
}
```

### Response Format

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### Authentication

```
Authorization: Bearer <LLM_ZHIPU_API_KEY>
```

## Implementation Details

### 1. Constants (config/constants.ts)

```typescript
export enum LLMProviderType {
  DEEPSEEK = 'deepseek',
  OPENROUTER = 'openrouter',
  ZHIPU = 'zhipu',  // NEW
}

export const ZHIPU_API = {
  BASE_URL: 'https://open.bigmodel.cn/api/paas/v4',
  DEFAULT_MODEL: 'glm-4.5-flash',
  REQUEST_TIMEOUT: 30000,
  RETRY_DELAY: 2000,  // 较长延迟，应对并发限制
  get MODEL(): string {
    return process.env.LLM_ZHIPU_MODEL || this.DEFAULT_MODEL;
  },
} as const;
```

### 2. Provider Implementation (services/llm/providers.ts)

```typescript
export class ZhipuProvider implements LLMProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = ZHIPU_API.DEFAULT_MODEL) {
    this.apiKey = apiKey;
    this.model = model;
  }

  getName(): string { return 'zhipu'; }
  getModel(): string { return this.model; }
  getRetryDelay(): number { return ZHIPU_API.RETRY_DELAY; }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const response = await post<OpenAIStyleResponse>(
      `${ZHIPU_API.BASE_URL}/chat/completions`,
      {
        model: this.model,
        messages: request.messages,
        temperature: request.temperature,
      },
      {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: ZHIPU_API.REQUEST_TIMEOUT,
      }
    );

    const content = response.data.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('Empty response from Zhipu API');
    }

    return { content, usage: response.data.usage };
  }
}
```

### 3. Type Extensions (types/llm.ts)

```typescript
export interface ProviderEnv {
  LLM_PROVIDER?: string;
  // ... existing fields
  LLM_ZHIPU_API_KEY?: string;    // NEW
  LLM_ZHIPU_MODEL?: string;       // NEW
}
```

### 4. Utility Updates (services/llm/utils.ts)

Update `parseProvider`:
```typescript
case LLMProviderType.ZHIPU:
  return LLMProviderType.ZHIPU;
```

Update `getApiKeyForProvider`:
```typescript
case LLMProviderType.ZHIPU: {
  const key = env.LLM_ZHIPU_API_KEY;
  if (!key) {
    throw new Error('LLM_ZHIPU_API_KEY is required when LLM_PROVIDER=zhipu');
  }
  return key;
}
```

Update `getModelForProvider`:
```typescript
case LLMProviderType.ZHIPU:
  return env.LLM_ZHIPU_MODEL;
```

### 5. Factory Update (services/llm/index.ts)

```typescript
case LLMProviderType.ZHIPU:
  return new ZhipuProvider(config.apiKey, config.model);
```

## Concurrency Considerations

智普 glm-4.5-flash 并发限制为 2：

1. **当前系统行为**: 翻译服务采用顺序处理，每次只有一个活跃请求
2. **重试延迟**: 设置 `RETRY_DELAY: 2000ms`，比其他 provider (1000ms) 更长
3. **429 处理**: 复用现有重试机制，无需额外并发控制

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | Yes | - | 设置为 `zhipu` |
| `LLM_ZHIPU_API_KEY` | Yes | - | 智普 API 密钥 |
| `LLM_ZHIPU_MODEL` | No | `glm-4.5-flash` | 模型覆盖 |

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/config/constants.ts` | Modify | 添加 ZHIPU enum 和 ZHIPU_API 常量 |
| `src/types/llm.ts` | Modify | 扩展 ProviderEnv 接口 |
| `src/services/llm/providers.ts` | Modify | 新增 ZhipuProvider 类 |
| `src/services/llm/utils.ts` | Modify | 更新 switch 语句支持 zhipu |
| `src/services/llm/index.ts` | Modify | 更新 createLLMProvider 工厂 |
| `.env.example` | Modify | 添加智普环境变量示例 |
| `README.md` | Modify | 添加智普 provider 文档 |
| `openspec/project.md` | Modify | 更新配置文档 |
