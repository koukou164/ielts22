<script setup>
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  actionText: { type: String, default: '' }
})

defineEmits(['action'])
</script>

<template>
  <div class="empty-state card">
    <div class="empty-icon" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <path
          d="M10 12.5c5.4-1.5 9.9-.3 14 3v22c-4.1-3.3-8.6-4.5-14-3v-22Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M38 12.5c-5.4-1.5-9.9-.3-14 3v22c4.1-3.3 8.6-4.5 14-3v-22Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>
    </div>
    <h2>{{ title }}</h2>
    <p v-if="text">{{ text }}</p>
    <button v-if="actionText" class="btn btn-primary" type="button" @click="$emit('action')">
      {{ actionText }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  padding: 56px 28px;
  text-align: center;
}
.empty-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 18px;
  background: var(--brand-soft);
  color: var(--brand);
  display: grid;
  place-items: center;
}
.empty-icon svg {
  width: 30px;
  height: 30px;
}
h2 {
  margin: 0;
  font-size: 19px;
  letter-spacing: -0.01em;
}
p {
  margin: 8px auto 20px;
  max-width: 420px;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.7;
}
</style>
