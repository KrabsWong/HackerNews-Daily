<script setup lang="ts">
interface Props {
  rank: number
  titleChinese: string
  titleEnglish: string
  score: number
  url: string
  time: string
  description: string
  commentSummary: string | null
}

defineProps<Props>()
</script>

<template>
  <div class="story-card">
    <div class="rank">#{{ rank }}</div>
    <div class="content">
      <h2 class="title-chinese">{{ titleChinese }}</h2>
      <p class="title-english">{{ titleEnglish }}</p>
      <div class="meta">
        <span class="time">{{ time }}</span>
        <span class="score">{{ score }} points</span>
      </div>
      <a :href="url" target="_blank" rel="noopener noreferrer" class="link">{{ url }}</a>
      <p class="description">{{ description }}</p>
      <p v-if="commentSummary" class="comment-summary">
        <strong>Comment Summary:</strong> {{ commentSummary }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.story-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 16px;
}

.rank {
  font-size: 24px;
  font-weight: bold;
  color: #666;
  min-width: 40px;
}

.content {
  flex: 1;
  min-width: 0;
}

.title-chinese {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.title-english {
  font-size: 14px;
  color: #666;
  margin: 0 0 8px 0;
}

.meta {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.meta .time {
  margin-right: 16px;
}

.meta .score {
  color: #f60;
}

.link {
  display: block;
  font-size: 12px;
  color: #0066cc;
  text-decoration: none;
  margin-bottom: 12px;
  word-break: break-all;
}

.link:hover {
  text-decoration: underline;
}

.description {
  font-size: 14px;
  color: #333;
  line-height: 1.6;
  margin: 0 0 12px 0;
}

.comment-summary {
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  margin: 0;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 4px;
}

.comment-summary strong {
  color: #333;
}
</style>
