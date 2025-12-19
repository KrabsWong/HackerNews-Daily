# markdown-output Specification

## Purpose

Define markdown output formatting that removes Chinese title brackets and includes HackerNews story links for user reference and navigation to original discussions.

## Requirements
### Requirement: Markdown titles SHALL be formatted without Chinese brackets

The system SHALL generate markdown titles showing only the rank and Chinese title text, without surrounding 【】 brackets.

#### Scenario: Title formatting without brackets

**Given** a story with rank=1 and titleChinese="开源大型语言模型简述"  
**When** generating markdown output  
**Then** the title SHALL be formatted as `## 1. 开源大型语言模型简述`  
**And** NOT as `## 1. 【开源大型语言模型简述】`

### Requirement: Markdown output SHALL include HackerNews story link as italic secondary label

The system SHALL add a HackerNews link as an italic secondary label to enable users to navigate to the original discussion.

#### Scenario: HackerNews link as italic secondary label

**Given** a processed story with storyId=46313991  
**When** generating markdown content  
**Then** the output SHALL include an italic HackerNews link after the description section  
**And** the link SHALL be formatted as: `*[HackerNews](https://news.ycombinator.com/item?id=46313991)*`  
**And** this link SHALL appear as a secondary label/reference

#### Scenario: Complete article structure with italic HackerNews link

**Given** a story with all content populated  
**When** generating the article section  
**Then** the order SHALL be:
1. `## {rank}. {titleChinese}`
2. `{titleEnglish}`
3. `**发布时间**: {time}`
4. `**链接**: [{url}]({url})`
5. `**描述**:`
6. `{description}`
7. `**评论要点**:` (if available)
8. `{commentSummary}` (if available)
9. `*[HackerNews](https://news.ycombinator.com/item?id={storyId})*`
10. `---` (separator)

