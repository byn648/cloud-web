<!-- 更多按钮（与 kube-nova 接口兼容； cloud-web 独立实现，无 ArtIcon/权限依赖） -->
<template>
  <div class="art-button-more-wrap">
    <ElDropdown trigger="click" @command="(cmd) => handleCommand(cmd)">
      <span class="art-button-more-trigger">
        <slot name="trigger">
          <ElButton size="small" text type="primary">
            <MoreVertical :size="14" />
          </ElButton>
        </slot>
      </span>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem
            v-for="item in list"
            :key="item.key"
            :command="item.key"
            :disabled="item.disabled"
          >
            <span :style="{ color: item.color }">{{ item.label }}</span>
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
  </div>
</template>

<script setup lang="ts">
  import { MoreVertical } from "lucide-vue-next"
  import { ElButton, ElDropdown, ElDropdownMenu, ElDropdownItem } from "element-plus"

  defineOptions({ name: "ArtButtonMore" })

  export interface ButtonMoreItem {
    key: string | number
    label: string
    disabled?: boolean
    auth?: string
    icon?: string
    color?: string
    iconColor?: string
  }

  const props = withDefaults(
    defineProps<{
      list: ButtonMoreItem[]
      /** 与 kube-nova 渲染函数兼容，此处忽略，统一用默认触发器 */
      trigger?: unknown
    }>(),
    {}
  )

  const emit = defineEmits<{
    click: [item: ButtonMoreItem]
  }>()

  function handleCommand(key: string | number) {
    const item = props.list.find((i) => i.key === key)
    if (item) {
      emit("click", item)
    }
  }
</script>

<style scoped>
  .art-button-more-trigger {
    display: inline-flex;
    align-items: center;
    cursor: pointer;
  }
</style>
