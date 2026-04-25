<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app permanent width="260">
      <v-list-item class="pa-4" title="文档管理系统" subtitle="知识库管理"></v-list-item>
      <v-divider></v-divider>
      <v-list density="compact" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.value"
          :title="item.title"
          :to="item.to"
          :prepend-icon="item.icon"
          :active="$route.path === item.to"
          color="primary"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar elevation="1">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>{{ pageTitle }}</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-bell"></v-btn>
      <v-btn icon="mdi-account-circle"></v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-4">
        <router-view></router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const drawer = ref(true)
const route = useRoute()

const navItems = [
  { title: '文档管理', value: 'docs', to: '/docs', icon: 'mdi-file-document-multiple' },
  { title: '标签管理', value: 'tags', to: '/tags', icon: 'mdi-tag-multiple' },
  { title: '智能搜索', value: 'search', to: '/search', icon: 'mdi-brain' }
]

const pageTitle = computed(() => {
  const titles = {
    '/docs': '文档管理',
    '/tags': '标签管理',
    '/search': '智能搜索'
  }
  return titles[route.path] || '文档管理系统'
})
</script>

<style>
html, body {
  overflow-y: auto !important;
}
</style>
