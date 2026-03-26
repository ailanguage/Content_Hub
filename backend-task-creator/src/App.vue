<script setup lang="ts">
import TaskForm from "./components/TaskForm.vue";
</script>

<template>
  <div class="app">
    <header>
      <h1>Backend Task Creator</h1>
      <p class="subtitle">Create tasks that sync to ContentHub via API</p>
    </header>
    <main>
      <TaskForm />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f5f7fa;
  color: #333;
}

.app {
  min-height: 100vh;
  padding: 32px 24px;
}

header {
  text-align: center;
  margin-bottom: 32px;
}

header h1 {
  font-size: 24px;
  color: #1a1a2e;
}

.subtitle {
  font-size: 14px;
  color: #888;
  margin-top: 4px;
}

main {
  max-width: 860px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
