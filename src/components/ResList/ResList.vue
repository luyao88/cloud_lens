<template>
  <section class="ResList">
    <div class="item" v-for="(i, idx) in props.modelValue" :key="idx">
      <img v-if="i.upload_blob" class="thumb" :src="i.upload_result ? i.upload_blob : LoadingImg" />
      <div class="value" :class="{ active: !i.upload_result }">
        <p><input :value="i.upload_result ? formatURL(props, i.upload_result) : ''" type="text" readonly @click="i.upload_result && copyCodeValue(formatURL(props, i.upload_result))" /> <span>URL</span></p>
        <p><input :value="i.upload_result ? formatURL(props, i.upload_result, 'md') : ''" type="text" readonly @click="i.upload_result && copyCodeValue(formatURL(props, i.upload_result, 'md'))" /> <span>Markdown</span></p>
      </div>
      <HoverCard v-if="i.upload_result" :open-delay="0" :close-delay="0">
        <HoverCardTrigger as-child>
          <QrcodeVue class="qrcode" :value="formatURL(props, i.upload_result)" :size="56" level="H" />
        </HoverCardTrigger>
        <HoverCardContent class="w-max h-max"><QrcodeVue class="qrcode scale" :value="formatURL(props, i.upload_result)" :size="666" level="H" /></HoverCardContent>
      </HoverCard>
    </div>
  </section>
</template>
<script setup lang="ts">
import QrcodeVue from 'qrcode.vue';
import { formatURL } from '@/utils/index';
import { useToast } from '@/components/ui/toast/use-toast';
const { toast } = useToast();
import LoadingImg from '@/assets/images/loading.gif';
const props = defineProps(['modelValue', 'nodeHost']);
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

// 复制CODE
const copyCodeValue = async (v: string) => {
  let vhCopyStatus: any = false;
  try {
    await navigator.clipboard.writeText(v);
    vhCopyStatus = true;
  } catch {
    const i = document.createElement('textarea');
    i.value = v;
    document.body.appendChild(i);
    i.select();
    vhCopyStatus = document.execCommand('copy');
    document.body.removeChild(i);
  } finally {
    if (vhCopyStatus) toast({ title: 'Tips', description: '复制成功' });
  }
};
</script>

<style scoped lang="less">
@import 'ResList.less';
</style>
