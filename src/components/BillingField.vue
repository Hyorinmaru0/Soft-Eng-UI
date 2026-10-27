<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: [String, Number], id: String, label: String, hint: String, error: String,
  type: { type: String, default: 'text' }, required: { type: Boolean, default: true },
  options: Array, placeholder: String, min: [String, Number], max: [String, Number],
  step: [String, Number], minlength: [String, Number], maxlength: [String, Number],
})
defineEmits(['update:modelValue'])
const attributes = computed(() => ({ id: props.id, name: props.id, required: props.required, 'aria-invalid': Boolean(props.error), 'aria-describedby': `${props.id}-hint${props.error ? ` ${props.id}-error` : ''}` }))
</script>

<template>
  <div class="settings-field">
    <label class="billing-field-label" :for="id">{{ label }} <b v-if="required" aria-hidden="true">*</b><small v-else> (optional)</small></label>
    <select v-if="options" v-bind="attributes" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><option value="" disabled>{{ placeholder }}</option><option v-for="option in options" :key="option" :value="option">{{ option }}</option></select>
    <textarea v-else-if="type === 'textarea'" v-bind="attributes" :value="modelValue" rows="3" :maxlength="maxlength" :placeholder="placeholder" @input="$emit('update:modelValue', $event.target.value)"></textarea>
    <input v-else v-bind="attributes" :value="modelValue" :type="type" :min="min" :max="max" :step="step" :minlength="minlength" :maxlength="maxlength" :placeholder="placeholder" :inputmode="type === 'number' ? (step === '1' ? 'numeric' : 'decimal') : undefined" @input="$emit('update:modelValue', $event.target.value)">
    <small :id="`${id}-hint`">{{ hint }}</small>
    <span v-if="error" :id="`${id}-error`" class="billing-field-error">{{ error }}</span>
  </div>
</template>
