<template>
  <section class="NotFound">
    <!-- 标题区 -->
    <div class="nf-hero">
      <h1 class="nf-code">4<em>0</em>4</h1>
      <p class="nf-title">您所访问的页面不存在或者已删除</p>
      <p class="nf-sub">页面走丢了，不如先围一只小猫？点击圆点筑墙，别让它溜到边缘</p>
    </div>

    <!-- 游戏区（暖纸棋盘） -->
    <div class="nf-game-card">
      <div v-if="loadError" class="nf-game-error">小猫暂时不在家，游戏加载失败了</div>
      <div v-show="!loadError" ref="gameContainer" class="nf-game"></div>
    </div>

    <!-- 操作区 -->
    <div class="nf-actions">
      <router-link to="/" class="nf-btn nf-btn-primary">返回首页</router-link>
      <router-link to="/legal?type=terms" class="nf-btn nf-btn-ghost">服务条款</router-link>
    </div>

    <!-- 游戏来源 -->
    <p class="nf-credit">
      游戏 Catch The Cat ·
      <a href="https://github.com/ganlvtech/phaser-catch-the-cat" target="_blank" rel="noopener noreferrer">ganlvtech</a>
      （MIT License）
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

defineOptions({ name: 'NotFound' });

const gameContainer = ref<HTMLElement | null>(null);
const loadError = ref(false);
let game: any = null;

// 游戏内部文字为固定深色，画布恒用暖纸浅底保证可读（暗色模式下呈"暗室纸棋盘"）
const GAME_BG = 0xfaf9f5;

// 动态注入脚本，避免把 Phaser 打进主包
const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`load failed: ${src}`));
    document.head.appendChild(s);
  });

const destroyGame = () => {
  if (game) {
    try {
      game.destroy(true);
    } catch {}
    game = null;
  }
  if (gameContainer.value) gameContainer.value.innerHTML = '';
};

const startGame = async () => {
  try {
    const w = window as any;
    if (!w.Phaser) await loadScript('/games/catch-the-cat/phaser.min.js');
    if (!w.CatchTheCatGame) await loadScript('/games/catch-the-cat/catch-the-cat.js');
    await nextTick();
    if (!gameContainer.value) return;
    game = new w.CatchTheCatGame({
      w: 11,
      h: 11,
      r: 20,
      initialWallCount: 8,
      backgroundColor: GAME_BG,
      parent: gameContainer.value,
      statusBarAlign: 'center',
    });
    loadError.value = false;
  } catch {
    loadError.value = true;
  }
};

onMounted(() => {
  startGame();
});

onUnmounted(() => {
  destroyGame();
});
</script>

<style scoped lang="less">
@import 'NotFound.less';
</style>
