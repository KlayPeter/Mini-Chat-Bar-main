<template>
  <div 
    class="group-avatar-grid" 
    :class="`members-${displayCount}`"
    :style="{ width: size + 'px', height: size + 'px', borderRadius: '12px' }"
  >
    <div
      v-for="(member, index) in displayMembers"
      :key="index"
      class="avatar-item"
    >
      <img 
        :src="getAvatarUrl(member.Avatar)" 
        :alt="member.Nickname"
        @error="handleAvatarError"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getAvatarUrl, handleAvatarError } from '../utils/avatarHelper'

const props = defineProps({
  members: {
    type: Array,
    required: true
  },
  size: {
    type: Number,
    default: 45
  }
})

const displayMembers = computed(() => {
  return props.members.slice(0, 9)
})

const displayCount = computed(() => {
  const count = displayMembers.value.length
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  if (count <= 4) return 4
  return 9
})
</script>

<style scoped lang="scss">
.group-avatar-grid {
  display: grid;
  gap: 1px;
  background: var(--border-color, #e0e0e0);
  border-radius: 12px !important;
  overflow: hidden !important;

  &.members-1 {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
  }

  &.members-2 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: 1fr;
  }

  &.members-3 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);

    .avatar-item:first-child {
      grid-row: span 2;
    }
  }

  &.members-4 {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
  }

  &.members-9 {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
  }

  .avatar-item {
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--bg-tertiary, white);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }
}
</style>
