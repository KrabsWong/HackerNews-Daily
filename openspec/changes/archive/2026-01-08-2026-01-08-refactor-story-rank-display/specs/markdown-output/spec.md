# markdown-output Specification Delta

## Overview

Remove rank display from markdown article titles since rank is merely an array index with no intrinsic meaning from HackerNews API. This change makes the output more honest and reduces visual clutter.

## MODIFIED Requirements

### Requirement: Markdown titles SHALL be formatted without Chinese brackets

The system SHALL generate markdown titles showing only the Chinese title text, without rank numbers or surrounding 【】 brackets.

#### Scenario: Title formatting without brackets

**Given** a story with titleChinese="开源大型语言模型简述"  
**When** generating markdown output  
**Then** the title SHALL be formatted as `## 开源大型语言模型简述`  
**And** NOT as `## 【开源大型语言模型简述】`

#### Scenario: Title formatting without rank

**Given** a story with titleChinese="开源大型语言模型简述"  
**When** generating markdown output  
**Then** the title SHALL be formatted as `## 开源大型语言模型简述`  
**And** NOT as `## 1. 开源大型语言模型简述`

### Requirement: Markdown output SHALL include HackerNews story link as italic secondary label

The system SHALL add a HackerNews link as an italic secondary label to enable users to navigate to the original discussion.

#### Scenario: HackerNews link as italic secondary label

**Given** a processed story with storyId=46313991  
**When** generating markdown content  
**Then** the output SHALL include an italic HackerNews link after the comment summary section  
**And** the link SHALL be formatted as: `*[HackerNews](https://news.ycombinator.com/item?id=46313991)*`  
**And** this link SHALL appear as a secondary label/reference

#### Scenario: Complete article structure with italic HackerNews link

**Given** a story with all content populated  
**When** generating the article section  
**Then** the order SHALL be:
1. `## {titleChinese}`
2. `{titleEnglish}`
3. `**发布时间**: {time}`
4. `**链接**: [{url}]({url})`
5. `**描述**:`
6. `{description}` (若为空显示 "暂无描述")
7. `**评论要点**:`
8. `{commentSummary}` (若为空显示 "暂无评论")
9. `*[HackerNews](https://news.ycombinator.com/item?id={storyId})*`
10. `---` (separator)

**And** rank SHALL NOT appear in the markdown output

### Requirement: 空描述默认值渲染

系统在渲染 Markdown 时 SHALL 对空描述显示默认文案。

#### Scenario: 描述为空时显示默认文案

**Given** story.description 为空字符串、null 或 undefined  
**When** 渲染 Markdown 描述区块  
**Then** 系统 SHALL 显示 "暂无描述"

#### Scenario: 描述有内容时正常显示

**Given** story.description 为 "这是一篇关于 AI 的文章"  
**When** 渲染 Markdown 描述区块  
**Then** 系统 SHALL 显示 "这是一篇关于 AI 的文章"

### Requirement: 空评论默认值渲染

系统在渲染 Markdown 时 SHALL 始终渲染评论区块，空评论显示默认文案。

#### Scenario: 评论为空时显示默认文案

**Given** story.commentSummary 为空字符串、null 或 undefined  
**When** 渲染 Markdown 评论区块  
**Then** 系统 SHALL 显示 `**评论要点**:`  
**And** 下方显示 "暂无评论"

#### Scenario: 评论有内容时正常显示

**Given** story.commentSummary 为 "用户讨论了性能优化的方法"  
**When** 渲染 Markdown 评论区块  
**Then** 系统 SHALL 显示 `**评论要点**:`  
**And** 下方显示 "用户讨论了性能优化的方法"

#### Scenario: 评论区块始终存在

**Given** 任意 story 对象  
**When** 渲染 Markdown  
**Then** 评论区块 (`**评论要点**:`) SHALL 始终存在于输出中  
**And** 不得因评论为空而跳过该区块
