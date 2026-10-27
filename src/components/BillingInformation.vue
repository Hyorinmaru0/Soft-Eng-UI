<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import BillingField from './BillingField.vue'
import { billingApi } from '../services/billingApi.js'
import { billingStatus, emptyBill, formatMoney, services, totalCentavos, validateBill } from '../billing.js'

const props = defineProps({ students: { type: Array, required: true }, canManage: { type: Boolean, default: false } })
defineEmits(['back'])
const studentId = ref('')
const student = computed(() => props.students.find(value => value.id === studentId.value))
const records = ref([])
const current = ref(null)
const editing = ref(false)
const loading = ref(false)
const saving = ref(false)
const loadFailed = ref(false)
const message = ref('')
const serviceError = ref('')
const errors = ref({})
const attempted = ref(false)
const draft = reactive(emptyBill(''))
const summary = ref(null)
const statementHeading = ref(null)
let loadRequest = 0
const total = computed(() => totalCentavos(draft.items))
const balance = computed(() => total.value - (current.value?.amountPaidCentavos || 0))
const dates = [
  { key: 'periodStart', label: 'Billing period start', hint: 'First date covered by this bill.' },
  { key: 'periodEnd', label: 'Billing period end', hint: 'Last date covered by this bill.' },
  { key: 'issueDate', label: 'Issue date', hint: 'Date the billing statement is issued.' },
  { key: 'dueDate', label: 'Payment due date', hint: 'Must be on or after the issue date.' },
]
const clone = value => JSON.parse(JSON.stringify(value))
const controlId = key => `billing-${key.replaceAll('.', '-')}`
const formatDate = value => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))

function clearFeedback() {
  message.value = ''
  serviceError.value = ''
  errors.value = {}
  attempted.value = false
}

async function loadRecords() {
  const request = ++loadRequest
  clearFeedback()
  records.value = []
  current.value = null
  editing.value = false
  loadFailed.value = false
  if (!studentId.value) { loading.value = false; return }
  loading.value = true
  try {
    const result = await billingApi.list(studentId.value)
    if (request !== loadRequest) return
    records.value = result
    current.value = result[0] || null
  } catch (error) {
    if (request !== loadRequest) return
    serviceError.value = error.message
    loadFailed.value = true
  } finally {
    if (request === loadRequest) loading.value = false
  }
}

function chooseRecord(event) {
  current.value = records.value.find(record => record.id === event.target.value) || null
  editing.value = false
  clearFeedback()
}

function populateDraft() {
  Object.assign(draft, clone(current.value || emptyBill(studentId.value)), { reviewed: false })
  if (!current.value) { delete draft.id; delete draft.revision }
}

async function editBill(isNew = false) {
  if (!props.canManage || saving.value) return
  if (isNew) current.value = null
  clearFeedback()
  populateDraft()
  editing.value = true
  await nextTick()
  document.getElementById('billing-periodStart')?.focus()
}

function validateDraft() {
  if (attempted.value) errors.value = validateBill(draft, current.value?.amountPaidCentavos || 0)
}

function resetDraft() {
  populateDraft()
  clearFeedback()
}

async function cancelEdit() {
  editing.value = false
  current.value ||= records.value[0] || null
  clearFeedback()
  await nextTick()
  statementHeading.value?.focus()
}

function addItem() {
  if (draft.items.length < 20) draft.items.push({ service: '', description: '', sessions: '', rate: '' })
  validateDraft()
}

async function removeItem(index) {
  draft.items.splice(index, 1)
  validateDraft()
  await nextTick()
  document.getElementById(controlId(`items.${Math.min(index, draft.items.length - 1)}.service`))?.focus()
}

async function saveBill() {
  if (!props.canManage || saving.value) return
  attempted.value = true
  errors.value = validateBill(draft, current.value?.amountPaidCentavos || 0)
  serviceError.value = ''
  if (Object.keys(errors.value).length) {
    await nextTick()
    summary.value?.focus()
    return
  }
  saving.value = true
  try {
    const saved = await billingApi.save(draft)
    records.value = [saved, ...records.value.filter(record => record.id !== saved.id)]
    current.value = saved
    editing.value = false
    message.value = 'Billing information saved. Total charges and the remaining balance have been updated.'
    await nextTick()
    statementHeading.value?.focus()
  } catch (error) {
    errors.value = error.fields || {}
    serviceError.value = error.message
    await nextTick()
    summary.value?.focus()
  } finally {
    saving.value = false
  }
}

function focusError(key) {
  document.getElementById(controlId(key === 'items' ? 'items.0.service' : key))?.focus()
}
</script>

<template>
  <section class="billing-page page-content" aria-labelledby="billing-title">
    <div class="settings-heading students-heading">
      <div><p class="eyebrow">BILLING &amp; PAYMENT</p><h1 id="billing-title">Billing Information</h1><p>Review student billing records and manage session charges.</p></div>
      <button class="button-secondary" type="button" @click="$emit('back')">← Return to Dashboard</button>
    </div>

    <section class="settings-card billing-lookup" aria-labelledby="billing-student-heading">
      <div class="settings-card-head"><span class="settings-section-icon" aria-hidden="true">₱</span><div><h2 id="billing-student-heading">Select a student</h2><p>Retrieve a student's existing billing information.</p></div></div>
      <div class="billing-lookup-fields">
        <div class="settings-field"><label class="billing-field-label" for="billing-studentId">Student profile <b aria-hidden="true">*</b></label>
          <select id="billing-studentId" v-model="studentId" required :disabled="saving" aria-describedby="billing-studentId-hint" @change="loadRecords"><option value="">Select a student profile</option><option v-for="person in students" :key="person.id" :value="person.id">{{ person.name }} · {{ person.id }}</option></select>
          <small id="billing-studentId-hint">Choose a student to view their bills or create a new one.</small>
        </div>
        <div v-if="student" class="billing-student-meta"><span>GUARDIAN</span><strong>{{ student.guardian }}</strong><small>{{ student.grade }} · {{ student.id }}</small></div>
      </div>
    </section>

    <p v-if="loading" class="billing-loading" role="status">Retrieving billing records…</p>
    <div v-if="serviceError && !editing" class="billing-feedback form-error" role="alert">{{ serviceError }} <button class="text-back" type="button" @click="loadRecords">Retry loading records</button></div>
    <p v-if="message" class="billing-feedback form-success" role="status">{{ message }}</p>

    <template v-if="student && !loading && !loadFailed">
      <div v-if="!editing" class="billing-record-toolbar">
        <div v-if="records.length" class="settings-field"><label class="billing-field-label" for="billing-record">Saved billing record</label><select id="billing-record" :value="current?.id || ''" @change="chooseRecord"><option v-for="record in records" :key="record.id" :value="record.id">{{ formatDate(record.periodStart) }} – {{ formatDate(record.periodEnd) }} · {{ record.id }}</option></select></div>
        <button v-if="canManage" type="button" class="button-secondary" @click="editBill(true)">+ New billing record</button>
      </div>

      <section v-if="!editing && current" class="settings-card billing-statement" aria-labelledby="billing-statement-heading">
        <div class="student-section-heading"><div><p class="section-kicker">STUDENT BILLING RECORD</p><h2 id="billing-statement-heading" ref="statementHeading" tabindex="-1">{{ student.name }}</h2><p class="billing-reference">{{ current.id }}</p></div><span :class="['status-pill', `billing-status-${billingStatus(current).toLowerCase()}`]">{{ billingStatus(current) }}</span></div>
        <dl class="billing-details"><div><dt>Billing period</dt><dd>{{ formatDate(current.periodStart) }} – {{ formatDate(current.periodEnd) }}</dd></div><div><dt>Issue date</dt><dd>{{ formatDate(current.issueDate) }}</dd></div><div><dt>Payment due date</dt><dd>{{ formatDate(current.dueDate) }}</dd></div></dl>
        <div class="billing-table-wrap"><table class="billing-table"><caption class="sr-only">Saved session charges for {{ student.name }}</caption><thead><tr><th scope="col">Service / description</th><th scope="col">Sessions</th><th scope="col">Rate</th><th scope="col">Amount</th></tr></thead><tbody><tr v-for="(item, index) in current.items" :key="index"><th scope="row">{{ item.service }}<small>{{ item.description }}</small></th><td>{{ item.sessions }}</td><td>{{ formatMoney(totalCentavos([{ ...item, sessions: 1 }])) }}</td><td>{{ formatMoney(totalCentavos([item])) }}</td></tr></tbody></table></div>
        <dl class="billing-totals"><div><dt>Total charges</dt><dd>{{ formatMoney(current.totalCentavos) }}</dd></div><div><dt>Payments recorded</dt><dd>{{ formatMoney(current.amountPaidCentavos) }}</dd></div><div class="billing-total-final"><dt>Remaining balance</dt><dd>{{ formatMoney(current.balanceCentavos) }}</dd></div></dl>
        <div v-if="current.notes" class="billing-note"><strong>Billing notes</strong><p>{{ current.notes }}</p></div>
        <div class="settings-card-actions"><span>Charges reflect the saved session information.</span><button v-if="canManage" class="button-primary" type="button" @click="editBill()">Edit billing information <span aria-hidden="true">→</span></button></div>
      </section>

      <section v-else-if="!editing" class="settings-card billing-empty"><h2 ref="statementHeading" tabindex="-1">No billing records yet</h2><p>No bill has been created for {{ student.name }}.</p><button v-if="canManage" type="button" class="button-primary" @click="editBill(true)">Create first billing record <span aria-hidden="true">→</span></button></section>

      <form v-else class="settings-card billing-form" novalidate :aria-busy="saving" aria-labelledby="billing-form-heading" @submit.prevent="saveBill" @reset.prevent="resetDraft" @input="validateDraft" @change="validateDraft">
        <div class="settings-card-head"><span class="settings-section-icon" aria-hidden="true">₱</span><div><h2 id="billing-form-heading">{{ current ? 'Edit billing information' : 'New billing record' }}</h2><p>{{ student.name }} · {{ student.id }} <span aria-hidden="true">/</span> Fields marked * are required.</p></div></div>
        <div v-if="Object.keys(errors).length || serviceError" ref="summary" class="form-error billing-error-summary" role="alert" tabindex="-1"><strong>{{ serviceError || 'Please correct the following fields before saving.' }}</strong><ul v-if="Object.keys(errors).length"><li v-for="(error, key) in errors" :key="key"><a :href="`#${controlId(key)}`" @click.prevent="focusError(key)">{{ key.startsWith('items.') ? `Session charge ${Number(key.split('.')[1]) + 1}: ` : '' }}{{ error }}</a></li></ul></div>
        <fieldset :disabled="saving" class="billing-fieldset"><legend class="sr-only">Billing details for {{ student.name }}</legend>
          <div class="billing-form-section"><h3>Billing details</h3><div class="billing-form-grid">
            <BillingField v-for="field in dates" :id="controlId(field.key)" :key="field.key" v-model="draft[field.key]" :label="field.label" :hint="field.hint" :error="errors[field.key]" type="date" min="2000-01-01" max="2100-12-31" />
          </div></div>

          <div class="billing-form-section"><div class="billing-section-row"><div><h3>Session charges</h3><p>Enter the service, number of sessions, and rate per session.</p></div><button class="button-secondary" type="button" :disabled="draft.items.length >= 20" @click="addItem">+ Add session charge</button></div>
            <fieldset v-for="(item, index) in draft.items" :key="index" class="billing-charge"><legend>Session charge {{ index + 1 }}</legend><div class="billing-form-grid">
              <BillingField :id="controlId(`items.${index}.service`)" v-model="item.service" label="Therapy service" hint="Service provided during the billing period." :options="services" placeholder="Select a therapy service" :error="errors[`items.${index}.service`]" />
              <BillingField :id="controlId(`items.${index}.description`)" v-model="item.description" label="Charge description" hint="Describe this charge in 3–120 characters." minlength="3" maxlength="120" placeholder="For example, October therapy sessions" :error="errors[`items.${index}.description`]" />
              <BillingField :id="controlId(`items.${index}.sessions`)" v-model="item.sessions" label="Number of sessions" hint="Enter 1 to 1,000 whole sessions." type="number" min="1" max="1000" step="1" placeholder="For example, 8" :error="errors[`items.${index}.sessions`]" />
              <BillingField :id="controlId(`items.${index}.rate`)" v-model="item.rate" label="Rate per session (PHP)" hint="₱0.01–₱100,000; up to 2 decimal places." type="number" min="0.01" max="100000" step="0.01" placeholder="For example, 1500.00" :error="errors[`items.${index}.rate`]" />
            </div><div class="billing-charge-footer"><span>Line amount <strong>{{ formatMoney(totalCentavos([item])) }}</strong></span><button v-if="draft.items.length > 1" class="text-back" type="button" :aria-label="`Remove session charge ${index + 1}`" @click="removeItem(index)">Remove charge</button></div></fieldset>
            <p v-if="errors.items" class="billing-field-error">{{ errors.items }}</p>
          </div>

          <div class="billing-form-section"><BillingField id="billing-notes" v-model="draft.notes" label="Billing notes" :hint="`${draft.notes.length}/1,000 characters. Include billing details only.`" type="textarea" :required="false" maxlength="1000" placeholder="Add any details relevant to these session charges." :error="errors.notes" /></div>
          <dl class="billing-totals billing-preview" aria-live="polite" aria-atomic="true"><div><dt>Total charges</dt><dd>{{ formatMoney(total) }}</dd></div><div><dt>Payments recorded</dt><dd>{{ formatMoney(current?.amountPaidCentavos || 0) }}</dd></div><div class="billing-total-final"><dt>Remaining balance</dt><dd>{{ formatMoney(balance) }}</dd></div></dl>
          <p class="billing-preview-hint">Preview updates as you enter session charges. Save to update the student's record.</p>
          <label class="billing-review" for="billing-reviewed"><input id="billing-reviewed" v-model="draft.reviewed" type="checkbox" required :aria-invalid="Boolean(errors.reviewed)" :aria-describedby="`billing-reviewed-hint${errors.reviewed ? ' billing-reviewed-error' : ''}`"><span>I have reviewed the session charges and payment due date. <b aria-hidden="true">*</b></span></label><small id="billing-reviewed-hint" class="billing-review-hint">Confirm the details before saving this bill.</small><p v-if="errors.reviewed" id="billing-reviewed-error" class="billing-field-error">{{ errors.reviewed }}</p>
          <div class="settings-card-actions"><button class="text-back" type="button" @click="cancelEdit">Cancel billing changes</button><div class="billing-action-buttons"><button class="button-secondary" type="reset">Reset changes</button><button class="button-primary" type="submit">{{ saving ? 'Saving billing information…' : 'Save billing information' }} <span v-if="!saving" aria-hidden="true">✓</span></button></div></div>
        </fieldset>
      </form>
      <p v-if="!canManage" class="student-permission-note">An administrator must create or edit billing information.</p>
    </template>
    <div v-else-if="!studentId" class="billing-intro"><span class="section-kicker">STUDENT BILLING</span><p>Select a student profile to get started.</p></div>
  </section>
</template>

<style src="../billing.css"></style>
