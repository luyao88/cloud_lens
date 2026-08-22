<template>
  <LoadingSplash />
  <Header title="镜云图床 CloudLens" />
  <main>
    <Transition name="page">
      <RouterView v-slot="{ Component }" key="$route.path">
        <keep-alive :include="['Home', 'Legal']">
          <component :is="Component" />
        </keep-alive>
      </RouterView>
    </Transition>
  </main>
  <Footer />
  <UploadTray />
  <Toaster />
</template>
<script setup lang="ts">
import Header from '@/components/Header/Header.vue';
import Footer from '@/components/Footer/Footer.vue';
import UploadTray from '@/components/UploadTray/UploadTray.vue';
import LoadingSplash from '@/components/LoadingSplash/LoadingSplash.vue';
import { Toaster } from '@/components/ui/toast';
</script>

<style scoped></style>
