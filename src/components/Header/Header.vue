<template>
  <header class="fixed top-0 left-0 w-full h-[4.5rem] flex justify-center px-4 backdrop-blur-lg bg-white/70 border-b border-teal-200/60 z-50">
    <div class="flex justify-between items-center w-full max-w-[1229px] h-[4.5rem]">
      <div class="flex items-center gap-4 h-full">
        <img class="w-auto h-2/5 object-contain" src="@/assets/images/logo.png" />
        <a class="font-bold text-lg" href="/">{{ props.title }}</a>
      </div>
      <div class="flex items-center gap-5">
        <span class="hidden sm:block text-base text-muted-foreground/60">{{ props.desc }}</span>
        <a href="https://github.com/luyao88/cloud_lens" target="_blank" title="GitHub" class="opacity-60 hover:opacity-100 transition">
          <img class="w-6" src="@/assets/images/footer/github.svg" />
        </a>
      </div>
    </div>
  </header>
</template>
<script setup lang="ts">
const props = defineProps(['title', 'desc']);
</script>
