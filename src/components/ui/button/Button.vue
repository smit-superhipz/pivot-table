<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { Primitive, type PrimitiveProps } from "reka-ui";
import { type ButtonVariants, buttonVariants } from ".";
import { Loader2 } from "lucide-vue-next";
interface Props extends PrimitiveProps {
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  class?: HTMLAttributes["class"];
  is_loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
  is_loading: false,
});
</script>

<template>
  <Primitive
    data-slot="button"
    :as="as"
    :as-child="asChild"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <template v-if="props.is_loading">
      <Loader2 class="w-4 h-4 animate-spin" />
      Loading
    </template>
    <template v-else>
      <slot />
    </template>
  </Primitive>
</template>
