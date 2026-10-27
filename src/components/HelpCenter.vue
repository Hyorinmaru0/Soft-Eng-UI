<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  activeTopic: { type: String, default: 'overview' },
  canManage: { type: Boolean, default: false },
})
const emit = defineEmits(['select-topic'])

const search = ref('')
const topics = [
  {
    id: 'overview',
    label: 'Getting started',
    description: 'Find your way around the workspace and use these guides.',
    steps: [
      'Choose a workspace area from the main sidebar: Dashboard, Student Profiles, Billing Information, or Settings.',
      'Use the Help Center section in that sidebar to open these instructions at any time.',
      'Select a guide from this Help sidebar, or search for a task or keyword.',
    ],
    note: 'This in-system reference explains the application only. Follow your center’s existing procedures and permissions for decisions and record handling.',
  },
  {
    id: 'registration',
    label: 'Student registration',
    description: 'Add a student record and check the details before saving.',
    steps: [
      'Open Student Profiles and choose the option to add a student, if it is available to your account.',
      'Enter the student’s identifying and contact details, then review each field for accuracy.',
      'Add only the support information required by your center’s procedure.',
      'Review the complete record and use the form’s save or validate action. Confirm that the student appears in search.',
    ],
    note: 'Student information is sensitive. Use an authorized account and follow your center’s consent, privacy, and record-retention procedures.',
  },
  {
    id: 'scheduling',
    label: 'Therapy scheduling',
    description: 'Review or arrange a session using the scheduling tools available to you.',
    steps: [
      'Open the schedule or appointments area provided by your center.',
      'Find the student and review the therapist, service, date, time, and availability.',
      'Create or update the appointment using the center’s scheduling rules.',
      'Confirm the saved appointment and communicate changes through the center’s usual process.',
    ],
    note: 'Scheduling is not available in every workspace. Do not treat the dashboard’s sample schedule as a saved appointment record.',
  },
  {
    id: 'progress',
    label: 'Daily progress recording',
    description: 'Document a session using the student’s daily report workflow.',
    steps: [
      'Open Student Profiles, search by student name or ID, and select the correct profile.',
      'Choose Daily Reports and enter the session date, observations, participation, and goals as prompted.',
      'Check that your notes are factual, relevant, and associated with the correct student.',
      'Validate and save the report, then confirm it appears in the saved reports list.',
    ],
    note: 'Record observations according to your professional and center documentation standards.',
  },
  {
    id: 'documents',
    label: 'Uploading documents',
    description: 'Use an available document area to attach the correct file to a record.',
    steps: [
      'Open the student or record where the document belongs and locate its document or attachment area.',
      'Check that the file is the intended version and does not include unrelated student information.',
      'Select the file, complete any required document details, and submit the upload.',
      'Wait for confirmation and verify the file appears on the intended record.',
    ],
    note: 'Document upload may not be enabled in this workspace. Follow center rules for file types, access, and secure handling; do not use an unapproved storage location.',
  },
  {
    id: 'billing',
    label: 'Billing records',
    description: 'Review a student’s billing statement or create and update a bill.',
    steps: [
      'Open Billing Information and select the student whose record you need.',
      'Choose an existing bill to review it, or start a new billing record if you are authorized.',
      'Enter the billing dates, service, session count, rate, and any required notes. Review the line items and due date.',
      'Confirm the review checkbox and save. Check the resulting statement and totals.',
    ],
    note: 'Payment recording is separate from billing information. Only administrators can manage billing records in this workspace.',
  },
  {
    id: 'reports',
    label: 'Generating reports',
    description: 'Prepare a report from the reporting tools enabled for your account.',
    steps: [
      'Open the reporting area and choose the report type that matches your request.',
      'Set the required student, date range, and other filters before generating the report.',
      'Review the output for the correct scope and reporting period.',
      'Export or share the report only through a method approved by your center.',
    ],
    note: 'Report-generation tools may depend on your account and system configuration. Avoid sharing reports beyond their authorized audience.',
  },
  {
    id: 'search',
    label: 'Searching student records',
    description: 'Find the right student profile using a name or student ID.',
    steps: [
      'Open Student Profiles and enter a student name or ID in the search field.',
      'Review the matching results and verify the student ID before opening a profile.',
      'If there are no matches, check spelling and the complete ID, then search again.',
      'Use the profile actions available to your role to review or update the record.',
    ],
    note: 'Limit searches and record access to the information needed for your assigned work.',
  },
  {
    id: 'account',
    label: 'Account and accessibility',
    description: 'Review account settings and adjust your personal display preferences.',
    steps: [
      'Open Settings from the main sidebar.',
      'Use Accessibility to adjust font size, contrast, theme, font, line spacing, or motion preferences.',
      'Choose Account & Password to review your account details or use the password-change form.',
      'Save preference changes on this device. Follow your center’s account-support process if you cannot sign in.',
    ],
    note: 'Accessibility preferences are personal to this browser. Never share your password with another user.',
  },
]

const faqs = [
  {
    question: 'Why can’t I see an action or menu?',
    answer: 'Available actions depend on your role and the tools enabled for your workspace. Ask your administrator to confirm access; do not use another person’s account.',
  },
  {
    question: 'What should I do if a save fails?',
    answer: 'Keep the page open, read any field-level message, and correct the indicated information before trying again. If the problem continues, note the page and error and contact your administrator through the center’s usual support process.',
  },
  {
    question: 'Does this Help Center change center procedures?',
    answer: 'No. These are in-system usage instructions only. Existing center procedures, professional judgment, privacy practices, and authorization requirements remain in effect.',
  },
]

const filteredTopics = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  if (!query) return topics
  return topics.filter(topic => [topic.label, topic.description, ...topic.steps, topic.note]
    .some(text => text.toLocaleLowerCase().includes(query)))
})

const currentTopic = computed(() => topics.find(topic => topic.id === props.activeTopic) || topics[0])

function selectTopic(topic) {
  emit('select-topic', topic.id)
}
</script>

<template>
  <section class="help-page page-content" aria-labelledby="help-title">
    <header class="help-heading">
      <div>
        <p class="eyebrow">IN-SYSTEM REFERENCE</p>
        <h1 id="help-title">Help Center</h1>
        <p>Practical guidance for common tasks in the student profile and academic information workspace.</p>
      </div>
      <span class="help-role-badge">{{ canManage ? 'Administrator access' : 'Therapist access' }}</span>
    </header>

    <div class="help-layout">
      <aside class="help-guide-sidebar" aria-label="Help topics">
        <label class="help-search">
          <span>Search help topics</span>
          <input v-model="search" type="search" placeholder="Search guides…" />
        </label>
        <nav class="help-topic-nav" aria-label="Guides">
          <button
            v-for="topic in filteredTopics"
            :key="topic.id"
            type="button"
            :class="['help-topic-link', { selected: currentTopic.id === topic.id }]"
            :aria-current="currentTopic.id === topic.id ? 'page' : undefined"
            @click="selectTopic(topic)"
          >
            <span>{{ topic.label }}</span>
            <span aria-hidden="true">→</span>
          </button>
          <p v-if="!filteredTopics.length" class="help-no-results">No guides match that search. Try another word.</p>
        </nav>
      </aside>

      <div class="help-article-column">
        <article class="help-article" :key="currentTopic.id">
          <p class="section-kicker">STEP-BY-STEP GUIDE</p>
          <h2>{{ currentTopic.label }}</h2>
          <p class="help-topic-description">{{ currentTopic.description }}</p>
          <ol class="help-steps">
            <li v-for="step in currentTopic.steps" :key="step">{{ step }}</li>
          </ol>
          <aside class="help-note" aria-label="Important guidance">
            <strong>Keep in mind</strong>
            <p>{{ currentTopic.note }}</p>
          </aside>
        </article>

        <section class="help-faq" aria-labelledby="help-faq-title">
          <p class="section-kicker">QUICK ANSWERS</p>
          <h2 id="help-faq-title">Frequently asked questions</h2>
          <details v-for="faq in faqs" :key="faq.question">
            <summary>{{ faq.question }}</summary>
            <p>{{ faq.answer }}</p>
          </details>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.help-page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 34px 32px 56px;
}

.help-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 25px;
}

.help-heading h1 {
  margin: 0;
  color: #293d36;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(32px, 4vw, 43px);
  font-weight: 400;
}

.help-heading p:not(.eyebrow) {
  max-width: 650px;
  margin: 8px 0 0;
  color: #718078;
  font-size: 13px;
  line-height: 1.65;
}

.help-role-badge {
  flex: 0 0 auto;
  padding: 8px 12px;
  border: 1px solid #dce8df;
  border-radius: 999px;
  background: #f0f7f1;
  color: #52705c;
  font-size: 11px;
  font-weight: 700;
}

.help-layout {
  display: grid;
  grid-template-columns: minmax(210px, 255px) minmax(0, 1fr);
  align-items: start;
  gap: 20px;
}

.help-guide-sidebar,
.help-article,
.help-faq {
  border: 1px solid #e8ece8;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 5px 18px rgb(42 61 53 / 4%);
}

.help-guide-sidebar {
  position: sticky;
  top: 88px;
  overflow: hidden;
  padding: 15px 11px;
}

.help-search {
  display: grid;
  gap: 7px;
  padding: 0 5px 13px;
  color: #63736a;
  font-size: 11px;
  font-weight: 700;
}

.help-search input {
  width: 100%;
  min-width: 0;
  padding: 10px 11px;
  border: 1px solid #dfe7e0;
  border-radius: 8px;
  background: #fbfcfb;
  color: #293d36;
  font: inherit;
  font-size: 12px;
}

.help-topic-nav {
  display: grid;
  gap: 3px;
}

.help-topic-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 10px 11px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #5f7067;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  text-align: left;
}

.help-topic-link > span:last-child {
  color: #8ca397;
  opacity: 0;
}

.help-topic-link:hover,
.help-topic-link.selected {
  background: #eff6f0;
  color: #345b44;
}

.help-topic-link.selected {
  font-weight: 700;
}

.help-topic-link.selected > span:last-child,
.help-topic-link:hover > span:last-child {
  opacity: 1;
}

.help-no-results {
  margin: 8px 7px;
  color: #718078;
  font-size: 12px;
  line-height: 1.5;
}

.help-article-column {
  display: grid;
  gap: 18px;
}

.help-article,
.help-faq {
  padding: 24px clamp(18px, 3vw, 31px);
}

.help-article h2,
.help-faq h2 {
  margin: 0;
  color: #293d36;
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: 26px;
  font-weight: 400;
}

.help-topic-description {
  margin: 8px 0 19px;
  color: #718078;
  font-size: 13px;
  line-height: 1.6;
}

.help-steps {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: help-step;
}

.help-steps li {
  position: relative;
  min-height: 36px;
  padding: 5px 0 5px 46px;
  color: #4f6259;
  counter-increment: help-step;
  font-size: 13px;
  line-height: 1.65;
}

.help-steps li::before {
  position: absolute;
  top: 0;
  left: 0;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 50%;
  background: #edf5ee;
  color: #4d7459;
  content: counter(help-step, decimal-leading-zero);
  font-size: 10px;
  font-weight: 700;
}

.help-note {
  margin-top: 21px;
  padding: 13px 15px;
  border-left: 3px solid #82a68c;
  border-radius: 0 8px 8px 0;
  background: #f4f8f4;
}

.help-note strong {
  color: #45634d;
  font-size: 12px;
}

.help-note p {
  margin: 5px 0 0;
  color: #63736a;
  font-size: 12px;
  line-height: 1.6;
}

.help-faq h2 {
  margin-bottom: 13px;
  font-size: 22px;
}

.help-faq details {
  border-top: 1px solid #edf0ed;
}

.help-faq summary {
  padding: 13px 2px;
  color: #40564b;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.5;
}

.help-faq details p {
  margin: -3px 0 14px;
  color: #718078;
  font-size: 12px;
  line-height: 1.65;
}

.help-page button:focus-visible,
.help-page input:focus-visible,
.help-page summary:focus-visible {
  outline: 3px solid #6c9778;
  outline-offset: 3px;
}

.theme-dark .help-guide-sidebar,
.theme-dark .help-article,
.theme-dark .help-faq {
  border-color: #3a4a40;
  background: #202b25;
}

.theme-dark .help-heading h1,
.theme-dark .help-article h2,
.theme-dark .help-faq h2 {
  color: #e4ede6;
}

.theme-dark .help-heading p:not(.eyebrow),
.theme-dark .help-topic-description,
.theme-dark .help-steps li,
.theme-dark .help-faq details p {
  color: #bac8bd;
}

.theme-dark .help-topic-link {
  color: #c3d0c6;
}

.theme-dark .help-topic-link:hover,
.theme-dark .help-topic-link.selected,
.theme-dark .help-note {
  background: #2c3b31;
}

.theme-dark .help-search input {
  border-color: #435247;
  background: #1b251f;
  color: #e4ede6;
}

.theme-dark .help-note p,
.theme-dark .help-note strong,
.theme-dark .help-faq summary {
  color: #c5d5c9;
}

.theme-dark .help-faq details {
  border-color: #3a4a40;
}

@media (max-width: 760px) {
  .help-page {
    padding: 26px 18px 42px;
  }

  .help-layout {
    grid-template-columns: 1fr;
  }

  .help-guide-sidebar {
    position: static;
    padding: 12px;
  }

  .help-topic-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .help-topic-link {
    min-height: 42px;
  }
}

@media (max-width: 520px) {
  .help-page {
    padding: 22px 14px 36px;
  }

  .help-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .help-topic-nav {
    grid-template-columns: 1fr;
  }

  .help-article,
  .help-faq {
    padding: 20px 17px;
  }
}
</style>
