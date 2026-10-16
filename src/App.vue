<template>
  <v-app>
    <!-- 侧边导航仅 PC 端渲染；移动端由右上角扇形旋钮承担导航 -->
    <v-navigation-drawer v-if="isDesktop" v-model="drawer" app permanent width="260">
      <v-list density="compact" nav>
        <v-list-item
          v-for="item in knowledgeItems"
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
      <v-app-bar-nav-icon v-if="isDesktop" @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-app-bar-title>{{ pageTitle }}</v-app-bar-title>
      <v-spacer></v-spacer>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-4">
        <router-view></router-view>
      </v-container>
    </v-main>

    <!-- 移动端：右上角扇形菜单旋钮（毛玻璃转场导航） -->
    <FanMenuButton v-if="!isDesktop" :items="knowledgeItems" />
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import FanMenuButton from './components/FanMenuButton.vue'

const { mdAndUp } = useDisplay()
const isDesktop = mdAndUp // >=960px 视为 PC：侧边栏；以下走扇形旋钮

const drawer = ref(true)
const route = useRoute()

const knowledgeItems = [
  { title: '文档管理', value: 'docs', to: '/docs', icon: 'mdi-file-document-multiple' },
  { title: '标签管理', value: 'tags', to: '/tags', icon: 'mdi-tag-multiple' },
  { title: '智能搜索', value: 'search', to: '/search', icon: 'mdi-brain' }
]

const pageTitle = computed(() => {
  const titles = {
    '/docs': '文档管理',
    '/tags': '标签管理',
    '/search': '智能搜索',
  }
  return titles[route.path] || 'AI 工作流系统'
})
</script>

<style>
html, body {
  overflow-y: auto !important;
}

/* ===== 手机浏览器适配（<960px 与旋钮断点一致） ===== */
html, body {
  overflow-x: hidden; /* 表格/长内容防横向晃动 */
}
@media (max-width: 959.98px) {
  /* 容器 16px + 视图 24px 叠加留白在手机上太奢侈，收窄 */
  .v-main > .v-container {
    padding: 10px !important; /* 对抗 pa-4 utility 的 !important */
  }
  .v-main div.search-view,
  .v-main div.doc-view,
  .v-main div.tag-view {
    padding: 12px;
  }
  /* iOS Safari：输入框字号 <16px 时聚焦会整页放大 */
  input,
  textarea {
    font-size: 16px;
  }
}
</style>
