<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StoryCard from './components/StoryCard.vue'

interface Story {
  rank: number
  titleChinese: string
  titleEnglish: string
  score: number
  url: string
  time: string
  description: string
  commentSummary: string | null
}

const stories = ref<Story[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function fetchStories() {
  try {
    loading.value = true
    error.value = null
    const response = await fetch('/api/stories')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    stories.value = await response.json()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to fetch stories'
    console.error('Error fetching stories:', e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStories()
})
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>HackerNews Daily</h1>
      <p class="subtitle">The first step in solving any problem is recognizing there is one</p>
    </header>

    <main class="main">
      <div v-if="loading" class="loading">
        Loading stories...
      </div>

      <div v-else-if="error" class="error">
        <p>Failed to load stories</p>
        <p class="error-detail">{{ error }}</p>
        <button @click="fetchStories" class="retry-btn">Retry</button>
      </div>

      <div v-else-if="stories.length === 0" class="empty">
        No stories found.
      </div>

      <div v-else class="story-list">
        <StoryCard
          v-for="story in stories"
          :key="story.rank"
          :rank="story.rank"
          :title-chinese="story.titleChinese"
          :title-english="story.titleEnglish"
          :score="story.score"
          :url="story.url"
          :time="story.time"
          :description="story.description"
          :comment-summary="story.commentSummary"
        />
      </div>
    </main>

    <footer class="footer">
      <p>Powered by Claude Code with OpenSpec</p>
    </footer>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #f5f5f5;
  color: #333;
  line-height: 1.5;
}

.app {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  padding: 20px 0 30px 0;
}

.header h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 14px;
  color: #666;
}

.main {
  flex: 1;
}

.loading,
.error,
.empty {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.loading {
  color: #666;
}

.error {
  color: #c00;
}

.error-detail {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 24px;
  background: #0066cc;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background: #0055aa;
}

.empty {
  color: #666;
}

.story-list {
  display: flex;
  flex-direction: column;
}

.footer {
  text-align: center;
  padding: 30px 0 20px 0;
  font-size: 12px;
  color: #999;
}
</style>
