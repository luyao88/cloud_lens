<template>
  <Header title="镜云图床 CloudLens" desc="免费无限图床" />
  <main><RouterView /></main>
  <Footer />
  <Toaster />
</template>
<script setup lang="ts">
import Header from '@/components/Header/Header.vue';
import Footer from '@/components/Footer/Footer.vue';
import { Toaster } from '@/components/ui/toast';
</script>

<style scoped></style>
