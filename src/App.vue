<script setup>
import { computed, reactive, ref } from 'vue'
import BillingInformation from './components/BillingInformation.vue'
import HelpCenter from './components/HelpCenter.vue'

const activePage = ref('dashboard')
const activeHelpTopic = ref('overview')
const activeSettingsTab = ref('accessibility')
const studentView = ref('search')
const savedMessage = ref('')
const passwordError = ref('')
const passwordMessage = ref('')
const studentError = ref('')
const studentNotice = ref('')
const studentSearch = ref('')
const studentSearchAttempted = ref(false)
const selectedStudentId = ref('')

const accessibility = reactive({ fontSize: 'normal', highContrast: false, darkMode: false, dyslexiaFont: false, lineSpacing: 'normal', reduceMotion: false })
const notifications = reactive({ scheduleChanges: true, passwordChanges: true, accountLockouts: true })
const backup = reactive({ enabled: false, frequency: 'weekly', keepCount: 7 })
const account = { name: 'Center Administrator', email: 'admin@breakthroughcenter.com', role: 'Administrator', userId: 'BT-001' }
const passwordForm = reactive({ current: '', next: '', confirm: '' })
const canManageStudents = account.role === 'Administrator'
const demoStudents = [
  { id: 'BT-101', name: 'Jordan Morgan', dateOfBirth: '2018-04-12', grade: 'Grade 3', guardian: 'Casey Morgan', guardianPhone: '(555) 010-0101', email: 'casey.morgan@example.com', supportPlan: 'Behavior and communication support', behaviorNotes: 'Responds well to visual schedules and specific praise.', reports: [{ date: '2026-10-27', mood: 'Calm', participation: 'Engaged', notes: 'Used the visual schedule and completed each transition with one reminder.', goals: 'Practice asking for a break.' }] },
  { id: 'BT-102', name: 'Avery Taylor', dateOfBirth: '2017-09-03', grade: 'Grade 4', guardian: 'Riley Taylor', guardianPhone: '(555) 010-0102', email: 'riley.taylor@example.com', supportPlan: 'Speech and language support', behaviorNotes: 'Benefits from extra processing time before responding.', reports: [] },
  { id: 'BT-103', name: 'Taylor Singh', dateOfBirth: '2019-01-21', grade: 'Grade 2', guardian: 'Sam Singh', guardianPhone: '(555) 010-0103', email: 'sam.singh@example.com', supportPlan: 'Occupational therapy support', behaviorNotes: '', reports: [] },
]
const studentStorageError = ref('')
const students = ref(readStudentRecords())
const studentForm = reactive({ name: '', dateOfBirth: '', grade: '', guardian: '', guardianPhone: '', email: '', supportPlan: '' })
const reportForm = reactive({ date: new Date().toISOString().slice(0, 10), mood: '', participation: '', notes: '', goals: '' })
const behaviorDraft = ref('')
const studentFormError = ref('')
const reportFormError = ref('')
const behaviorFormError = ref('')
const matchingStudents = computed(() => {
  const query = studentSearch.value.trim().toLocaleLowerCase()
  if (!query) return []
  return students.value.filter(student => student.name.toLocaleLowerCase().includes(query) || student.id.toLocaleLowerCase().includes(query))
})
const selectedStudent = computed(() => students.value.find(student => student.id === selectedStudentId.value) || null)

function readStudentRecords() {
  try {
    const saved = localStorage.getItem('breakthrough-student-records')
    if (!saved) return demoStudents
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) throw new Error('Stored student records are not a list.')
    return parsed
  } catch {
    studentStorageError.value = 'Student records could not be loaded from this browser. The sample records are shown instead.'
    return demoStudents
  }
}

function persistStudentRecords(updatedStudents) {
  try {
    localStorage.setItem('breakthrough-student-records', JSON.stringify(updatedStudents))
    students.value = updatedStudents
    studentStorageError.value = ''
    return true
  } catch {
    studentStorageError.value = 'Changes could not be saved in this browser. Check storage availability and try again.'
    return false
  }
}

function restorePreference(key, target) {
  try {
    const value = localStorage.getItem(key)
    if (value) Object.assign(target, JSON.parse(value))
  } catch {
    // Use defaults when browser preferences cannot be read.
  }
}
restorePreference('breakthrough-accessibility', accessibility)
restorePreference('breakthrough-email-preferences', notifications)
restorePreference('breakthrough-backup-schedule', backup)

const passwordMeetsLength = () => passwordForm.next.length >= 8
const passwordHasUpper = () => /[A-Z]/.test(passwordForm.next)
const passwordHasNumber = () => /\d/.test(passwordForm.next)
const passwordHasSpecial = () => /[^A-Za-z0-9]/.test(passwordForm.next)
const passwordIsValid = () => passwordMeetsLength() && passwordHasUpper() && passwordHasNumber() && passwordHasSpecial()

const settingTabs = [
  { id: 'accessibility', label: 'Accessibility', hint: 'Display & comfort' },
  { id: 'account', label: 'Account & Password', hint: 'Your account' },
  { id: 'notifications', label: 'Email Notifications', hint: 'Email preferences' },
  { id: 'backup', label: 'Backup Schedule', hint: 'Administrator' },
]

const schedule = [
  { time: '09:00 AM', initials: 'JM', name: 'Jordan M.', service: 'Behavior therapy', provider: 'A. Rivera', status: 'Confirmed', color: 'sage' },
  { time: '10:30 AM', initials: 'AT', name: 'Avery T.', service: 'Speech therapy', provider: 'M. Chen', status: 'Checked in', color: 'peach' },
  { time: '11:15 AM', initials: 'TS', name: 'Taylor S.', service: 'Occupational therapy', provider: 'J. Patel', status: 'Confirmed', color: 'blue' },
  { time: '01:00 PM', initials: 'KC', name: 'Kai C.', service: 'Family guidance', provider: 'A. Rivera', status: 'Needs review', color: 'lavender' },
]

function openPage(page) {
  activePage.value = page
  savedMessage.value = ''
  studentError.value = ''
  studentNotice.value = ''
}

function searchForStudent() {
  studentSearchAttempted.value = true
  studentError.value = ''
  studentNotice.value = ''
  if (!studentSearch.value.trim()) {
    studentError.value = 'Enter a student name or ID to search.'
    return
  }
  if (!matchingStudents.value.length) studentError.value = 'No student matched that name or ID. Check the entry and try again.'
}

function selectStudent(student) {
  selectedStudentId.value = student.id
  studentView.value = 'profile'
  studentError.value = ''
  studentNotice.value = ''
}

function returnToStudentSearch() {
  studentView.value = 'search'
  studentError.value = ''
  studentNotice.value = ''
}

function startStudentEdit() {
  if (!selectedStudent.value || !canManageStudents) return
  Object.assign(studentForm, {
    name: selectedStudent.value.name,
    dateOfBirth: selectedStudent.value.dateOfBirth,
    grade: selectedStudent.value.grade,
    guardian: selectedStudent.value.guardian,
    guardianPhone: selectedStudent.value.guardianPhone,
    email: selectedStudent.value.email,
    supportPlan: selectedStudent.value.supportPlan,
  })
  studentFormError.value = ''
  studentView.value = 'edit'
}

function saveStudentEdit() {
  studentFormError.value = ''
  if (!canManageStudents) {
    studentFormError.value = 'Only authorized personnel can edit student information.'
    return
  }
  if (!studentForm.name.trim() || !studentForm.dateOfBirth || !studentForm.grade.trim() || !studentForm.guardian.trim() || !studentForm.guardianPhone.trim()) {
    studentFormError.value = 'Complete the student name, date of birth, grade, guardian, and phone number.'
    return
  }
  if (!/^[+()\d\s.-]{7,20}$/.test(studentForm.guardianPhone.trim())) {
    studentFormError.value = 'Enter a valid guardian phone number.'
    return
  }
  if (studentForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentForm.email.trim())) {
    studentFormError.value = 'Enter a valid email address or leave the field blank.'
    return
  }
  const updatedStudents = students.value.map(student => student.id === selectedStudentId.value
    ? { ...student, ...studentForm, name: studentForm.name.trim(), guardian: studentForm.guardian.trim(), guardianPhone: studentForm.guardianPhone.trim(), email: studentForm.email.trim(), supportPlan: studentForm.supportPlan.trim() }
    : student)
  if (!persistStudentRecords(updatedStudents)) return
  studentView.value = 'profile'
  studentNotice.value = 'Student information was updated successfully.'
}

function startDailyReport() {
  if (!selectedStudent.value || !canManageStudents) return
  Object.assign(reportForm, { date: new Date().toISOString().slice(0, 10), mood: '', participation: '', notes: '', goals: '' })
  reportFormError.value = ''
  studentView.value = 'reports'
}

function saveDailyReport() {
  reportFormError.value = ''
  if (!canManageStudents) {
    reportFormError.value = 'Only authorized personnel can manage daily reports.'
    return
  }
  if (!reportForm.date || !reportForm.mood || !reportForm.participation || !reportForm.notes.trim()) {
    reportFormError.value = 'Complete the date, mood, participation, and daily summary before saving.'
    return
  }
  const report = { ...reportForm, notes: reportForm.notes.trim(), goals: reportForm.goals.trim() }
  const updatedStudents = students.value.map(student => student.id === selectedStudentId.value
    ? { ...student, reports: [report, ...(student.reports || [])] }
    : student)
  if (!persistStudentRecords(updatedStudents)) return
  studentView.value = 'profile'
  studentNotice.value = 'Daily report saved. The student report has been refreshed.'
}

function startBehaviorEdit() {
  if (!selectedStudent.value || !canManageStudents) return
  behaviorDraft.value = selectedStudent.value.behaviorNotes || ''
  behaviorFormError.value = ''
  studentView.value = 'behavior'
}

function saveBehaviorNotes() {
  behaviorFormError.value = ''
  if (!canManageStudents) {
    behaviorFormError.value = 'Only authorized personnel can update behavior notes.'
    return
  }
  const notes = behaviorDraft.value.trim()
  if (!notes) {
    behaviorFormError.value = 'Behavior notes cannot be empty. Enter the updated notes and try again.'
    return
  }
  if (notes.length > 1000) {
    behaviorFormError.value = 'Behavior notes must be 1,000 characters or fewer.'
    return
  }
  const updatedStudents = students.value.map(student => student.id === selectedStudentId.value ? { ...student, behaviorNotes: notes } : student)
  if (!persistStudentRecords(updatedStudents)) return
  studentView.value = 'profile'
  studentNotice.value = 'Behavior notes were updated successfully.'
}

function selectSettingsTab(tab) {
  activeSettingsTab.value = tab
  savedMessage.value = ''
  passwordError.value = ''
  passwordMessage.value = ''
}

function saveAccessibility() {
  localStorage.setItem('breakthrough-accessibility', JSON.stringify(accessibility))
  savedMessage.value = 'Accessibility preferences saved and applied.'
}

function saveNotifications() {
  localStorage.setItem('breakthrough-email-preferences', JSON.stringify(notifications))
  savedMessage.value = 'Email notification preferences saved.'
}

function changePassword() {
  passwordError.value = ''
  passwordMessage.value = ''
  if (!passwordForm.current) passwordError.value = 'Enter your current password.'
  else if (!passwordIsValid()) passwordError.value = 'Your new password does not meet all the requirements.'
  else if (passwordForm.next !== passwordForm.confirm) passwordError.value = 'The new password and confirmation do not match.'
  if (passwordError.value) return
  passwordMessage.value = 'Password requirements passed. Secure password verification and update must be completed by the connected account service.'
  passwordForm.current = ''
  passwordForm.next = ''
  passwordForm.confirm = ''
}

function saveBackupSchedule() {
  const count = Number(backup.keepCount)
  if (!Number.isInteger(count) || count < 1 || count > 30) {
    savedMessage.value = 'Choose a backup retention count from 1 to 30.'
    return
  }
  backup.keepCount = count
  localStorage.setItem('breakthrough-backup-schedule', JSON.stringify(backup))
  savedMessage.value = 'Backup schedule settings saved. A connected backup service is required to run scheduled backups.'
}
</script>

<template>
  <div class="app-frame" :class="{ 'font-large': accessibility.fontSize === 'large', 'font-larger': accessibility.fontSize === 'larger', 'high-contrast': accessibility.highContrast, 'theme-dark': accessibility.darkMode, 'dyslexia-font': accessibility.dyslexiaFont, 'line-relaxed': accessibility.lineSpacing === 'relaxed', 'line-wide': accessibility.lineSpacing === 'wide', 'reduce-motion': accessibility.reduceMotion }">
    <aside class="sidebar">
      <a class="sidebar-brand" href="#dashboard" @click.prevent="openPage('dashboard')">
        <img src="/logo.jpg" alt="" class="sidebar-logo" />
        <span><strong>Breakthrough</strong><small>BEHAVIOR THERAPY</small></span>
      </a>

      <div class="sidebar-label">WORKSPACE</div>
      <nav class="side-nav" aria-label="Main navigation">
        <button :class="['nav-link', { active: activePage === 'dashboard' }]" :aria-current="activePage === 'dashboard' ? 'page' : undefined" @click="openPage('dashboard')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="4" rx="1.2"/><rect x="13.5" y="10.5" width="7" height="10" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/></svg>
          <span>Dashboard</span>
        </button>
        <button :class="['nav-link', { active: activePage === 'students' }]" :aria-current="activePage === 'students' ? 'page' : undefined" @click="openPage('students'); studentView = 'search'">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20v-1.6A4.4 4.4 0 0 1 7.9 14h2.2a4.4 4.4 0 0 1 4.4 4.4V20M16 5.2a3.1 3.1 0 0 1 0 5.9m1.2 3h.9a3.8 3.8 0 0 1 3.8 3.8V20"/></svg>
          <span>Student Profiles</span>
        </button>
        <button :class="['nav-link', { active: activePage === 'billing' }]" :aria-current="activePage === 'billing' ? 'page' : undefined" aria-label="Billing Information" title="Billing Information" @click="openPage('billing')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h12v17l-3-1.5-3 1.5-3-1.5-3 1.5zM9 8h6M9 12h6M9 16h3"/></svg>
          <span>Billing Information</span>
        </button>
        <button :class="['nav-link', { active: activePage === 'settings' }]" :aria-current="activePage === 'settings' ? 'page' : undefined" @click="openPage('settings')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="m19.2 13.8 1.1.9-1.5 2.6-1.4-.5a7.8 7.8 0 0 1-1.8 1l-.3 1.5h-3l-.3-1.5a7.8 7.8 0 0 1-1.8-1l-1.4.5-1.5-2.6 1.1-.9a7.2 7.2 0 0 1 0-2.1l-1.1-.9 1.5-2.6 1.4.5a7.8 7.8 0 0 1 1.8-1l.3-1.5h3l.3 1.5a7.8 7.8 0 0 1 1.8 1l1.4-.5 1.5 2.6-1.1.9a7.2 7.2 0 0 1 0 2.1Z"/></svg>
          <span>Settings</span>
        </button>
      </nav>

      <div class="sidebar-label help-sidebar-label">HELP &amp; GUIDANCE</div>
      <nav class="side-nav" aria-label="Help navigation">
        <button :class="['nav-link', { active: activePage === 'help' }]" :aria-current="activePage === 'help' ? 'page' : undefined" @click="openPage('help')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 4.1 1.7c-1.1 1.1-1.8 1.4-1.8 3M12 17.2v.1"/></svg>
          <span>Help Center</span>
        </button>
      </nav>

      <div class="sidebar-bottom">
        <div class="support-card"><span class="support-spark">✳</span><strong>Here for your team</strong><p>Need a hand with the workspace?</p><a href="mailto:hello@breakthroughcenter.com">Contact support <span aria-hidden="true">→</span></a></div>
        <div class="sidebar-user"><span class="user-avatar">BT</span><span class="user-copy"><strong>Center team</strong><small>Administrator</small></span><button aria-label="Open settings" title="Settings" @click="openPage('settings')">···</button></div>
      </div>
    </aside>

    <main class="main-panel">
      <header class="top-header">
        <div class="breadcrumb"><span>Workspace</span><span class="crumb-slash">/</span><strong>{{ activePage === 'dashboard' ? 'Dashboard' : activePage === 'students' ? 'Student Profiles' : activePage === 'billing' ? 'Billing Information' : activePage === 'help' ? 'Help Center' : 'Settings' }}</strong></div>
        <div class="header-right"><span class="today-label">Tuesday, October 27</span><span class="header-divider"></span><button class="header-avatar" aria-label="Center team profile">BT</button></div>
      </header>

      <div v-if="savedMessage" class="toast" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{{ savedMessage }}<button aria-label="Dismiss message" @click="savedMessage = ''">×</button></div>

      <section v-if="activePage === 'dashboard'" class="dashboard page-content">
        <div class="welcome-row"><div><p class="eyebrow">TUESDAY · OCTOBER 27, 2026</p><h1>Your day, <em>in balance.</em></h1><p class="welcome-subtitle">Here’s what’s happening at the center today.</p></div><button class="date-button"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7.5 3.5v3M16.5 3.5v3M4 9h16"/></svg>Today <span aria-hidden="true">⌄</span></button></div>

        <div class="summary-grid" aria-label="Center summary">
          <article class="summary-card"><div class="summary-top"><span class="summary-icon mint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 20v-1.7a3.3 3.3 0 0 0-3.3-3.3H6.3A3.3 3.3 0 0 0 3 18.3V20M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 4.2a3.5 3.5 0 0 1 0 6.7M17.5 15h.2a3.3 3.3 0 0 1 3.3 3.3V20"/></svg></span><span class="trend positive">↗ 8.2%</span></div><p class="summary-label">Active clients</p><div class="summary-value">128</div><p class="summary-foot">Compared with last month</p></article>
          <article class="summary-card"><div class="summary-top"><span class="summary-icon sky"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7.5 3.5v3M16.5 3.5v3M4 9h16M8 13h2m4 0h2M8 16.5h2"/></svg></span><span class="trend neutral">Today</span></div><p class="summary-label">Appointments</p><div class="summary-value">18</div><p class="summary-foot">4 sessions remaining</p></article>
          <article class="summary-card"><div class="summary-top"><span class="summary-icon peach"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2s-7.5-4.4-7.5-10a4.2 4.2 0 0 1 7.5-2.6 4.2 4.2 0 0 1 7.5 2.6c0 5.6-7.5 10-7.5 10Z"/><path d="M8.5 12h2l1.2-2.5 1.6 5 1.2-2.5h1"/></svg></span><span class="trend positive">↗ 3.1%</span></div><p class="summary-label">Sessions this week</p><div class="summary-value">86</div><p class="summary-foot">Across all care programs</p></article>
          <article class="summary-card"><div class="summary-top"><span class="summary-icon lavender"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 14.7 9l6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3L9.3 9 12 3.5Z"/></svg></span><span class="trend neutral">Needs attention</span></div><p class="summary-label">Pending requests</p><div class="summary-value">6</div><p class="summary-foot">2 received since yesterday</p></article>
        </div>

        <div class="dashboard-columns">
          <section class="panel schedule-panel"><div class="panel-heading"><div><p class="section-kicker">YOUR SCHEDULE</p><h2>Today’s appointments</h2></div><button class="view-all" @click="openPage('settings')">Manage preferences <span aria-hidden="true">→</span></button></div><div class="schedule-meta"><span>Tuesday, October 27</span><span>18 total appointments</span></div>
            <div class="schedule-list"><article v-for="item in schedule" :key="item.time" class="schedule-row"><time>{{ item.time }}</time><span :class="['client-avatar', item.color]">{{ item.initials }}</span><div class="session-info"><strong>{{ item.name }}</strong><span>{{ item.service }} <i>·</i> {{ item.provider }}</span></div><span :class="['status-pill', item.status === 'Confirmed' ? 'status-confirmed' : item.status === 'Checked in' ? 'status-checked' : 'status-review']"><i></i>{{ item.status }}</span><button class="row-more" :aria-label="`More options for ${item.name}`">···</button></article></div>
            <button class="schedule-footer" @click="savedMessage = 'You’re viewing all appointments scheduled for today.'">View today’s full schedule <span aria-hidden="true">→</span></button>
          </section>

          <aside class="right-column">
            <section class="panel focus-panel"><div class="panel-heading"><div><p class="section-kicker">A LITTLE HEADS-UP</p><h2>Needs your attention</h2></div><span class="attention-count">2</span></div><article class="attention-item"><span class="attention-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5 21 20H3l9-16.5Z"/><path d="M12 9v4.5m0 3h.01"/></svg></span><div><strong>New intake requests</strong><p>2 families are waiting for a first response.</p><button @click="openPage('settings')">Review notification settings <span aria-hidden="true">→</span></button></div></article><article class="attention-item"><span class="attention-icon calendar-attention"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M7.5 3.5v3M16.5 3.5v3M4 9h16M8 13h3v3H8z"/></svg></span><div><strong>Schedule update</strong><p>One appointment needs a time confirmation.</p><button @click="savedMessage = 'Schedule updates are ready to review.'">See what changed <span aria-hidden="true">→</span></button></div></article></section>
            <section class="team-note"><div class="note-flower">✳</div><div><p class="section-kicker">A MOMENT FOR YOUR TEAM</p><h2>Progress happens<br />one step at a time.</h2><p>Take a breath. You’re making a difference.</p></div><div class="note-decoration" aria-hidden="true">✳</div></section>
          </aside>
        </div>
      </section>

      <section v-else-if="activePage === 'students'" class="students-page page-content">
        <div class="settings-heading students-heading">
          <div><p class="eyebrow">STUDENT RECORDS</p><h1>Student Profiles</h1><p>Find a student, review their profile, and manage support records.</p></div>
          <button class="button-secondary" type="button" @click="openPage('dashboard')">← Return to Dashboard</button>
        </div>

        <p v-if="studentStorageError" class="form-error" role="alert">{{ studentStorageError }}</p>
        <p v-if="studentError" class="form-error student-feedback" role="alert">{{ studentError }}</p>
        <p v-if="studentNotice" class="form-success student-feedback" role="status">{{ studentNotice }}</p>

        <section v-if="studentView === 'search'" class="settings-card student-search-card">
          <div class="settings-card-head"><span class="settings-section-icon student-icon">⌕</span><div><h2>Find a student</h2><p>Search by student name or ID to open their record.</p></div></div>
          <form class="student-search-form" @submit.prevent="searchForStudent">
            <label class="settings-field"><span>Student name or ID</span><input v-model="studentSearch" type="search" placeholder="For example, Jordan Morgan or BT-101" autocomplete="off"></label>
            <button class="button-primary" type="submit">Search students <span aria-hidden="true">→</span></button>
          </form>
          <div v-if="studentSearchAttempted && studentSearch.trim() && matchingStudents.length" class="student-results" aria-live="polite">
            <p class="section-kicker">MATCHING STUDENTS · {{ matchingStudents.length }}</p>
            <button v-for="student in matchingStudents" :key="student.id" class="student-result" type="button" @click="selectStudent(student)">
              <span class="student-result-avatar">{{ student.name.split(' ').map(part => part[0]).slice(0, 2).join('') }}</span>
              <span class="student-result-copy"><strong>{{ student.name }}</strong><small>{{ student.id }} <i>·</i> {{ student.grade }}</small></span><span class="student-result-arrow" aria-hidden="true">→</span>
            </button>
          </div>
          <div v-else class="student-search-hint"><strong>Student records are confidential.</strong><p>Search for a student to view their profile and related reports.</p></div>
        </section>

        <template v-else-if="selectedStudent">
          <div class="student-subnav">
            <button type="button" class="text-back" @click="returnToStudentSearch">← Back to search</button>
            <span class="student-id-pill">STUDENT ID · {{ selectedStudent.id }}</span>
          </div>

          <section v-if="studentView === 'profile'" class="settings-card student-profile-card">
            <div class="student-profile-header">
              <span class="student-large-avatar">{{ selectedStudent.name.split(' ').map(part => part[0]).slice(0, 2).join('') }}</span>
              <div><p class="section-kicker">STUDENT PROFILE</p><h2>{{ selectedStudent.name }}</h2><p>{{ selectedStudent.grade }} <i>·</i> Born {{ selectedStudent.dateOfBirth }}</p></div>
              <span class="role-badge">Authorized access</span>
            </div>
            <div class="student-details-grid">
              <div><small>GUARDIAN</small><strong>{{ selectedStudent.guardian }}</strong></div>
              <div><small>GUARDIAN PHONE</small><strong>{{ selectedStudent.guardianPhone }}</strong></div>
              <div><small>EMAIL ADDRESS</small><strong>{{ selectedStudent.email || 'Not provided' }}</strong></div>
              <div><small>SUPPORT PLAN</small><strong>{{ selectedStudent.supportPlan || 'Not provided' }}</strong></div>
            </div>
            <div class="student-actions-heading"><div><p class="section-kicker">STUDENT RECORD</p><h3>What would you like to do?</h3></div><span>Choose an action to continue</span></div>
            <div class="student-action-grid">
              <button type="button" class="student-action" @click="studentView = 'fullProfile'"><span class="student-action-icon">01</span><strong>View full profile</strong><small>Review the complete student information.</small><span class="student-action-arrow">→</span></button>
              <button v-if="canManageStudents" type="button" class="student-action" @click="startStudentEdit"><span class="student-action-icon peach-action">02</span><strong>Edit information</strong><small>Update student or guardian details.</small><span class="student-action-arrow">→</span></button>
              <button v-if="canManageStudents" type="button" class="student-action" @click="startDailyReport"><span class="student-action-icon blue-action">03</span><strong>Manage daily reports</strong><small>Add a report and review saved entries.</small><span class="student-action-arrow">→</span></button>
              <button v-if="canManageStudents" type="button" class="student-action" @click="startBehaviorEdit"><span class="student-action-icon lavender-action">04</span><strong>Manage behavior notes</strong><small>Review or update behavior support notes.</small><span class="student-action-arrow">→</span></button>
            </div>
            <p v-if="!canManageStudents" class="student-permission-note">You can view this profile. An administrator must manage edits, reports, and behavior notes.</p>
          </section>

          <section v-else-if="studentView === 'fullProfile'" class="settings-card student-detail-card">
            <div class="student-section-heading"><div><p class="section-kicker">COMPLETE RECORD</p><h2>{{ selectedStudent.name }}</h2><p>Full student profile information</p></div><button class="button-secondary" type="button" @click="studentView = 'profile'">Back to profile</button></div>
            <div class="student-details-grid expanded-details">
              <div><small>STUDENT ID</small><strong>{{ selectedStudent.id }}</strong></div><div><small>DATE OF BIRTH</small><strong>{{ selectedStudent.dateOfBirth }}</strong></div><div><small>GRADE</small><strong>{{ selectedStudent.grade }}</strong></div><div><small>GUARDIAN</small><strong>{{ selectedStudent.guardian }}</strong></div><div><small>GUARDIAN PHONE</small><strong>{{ selectedStudent.guardianPhone }}</strong></div><div><small>EMAIL ADDRESS</small><strong>{{ selectedStudent.email || 'Not provided' }}</strong></div><div class="student-detail-wide"><small>SUPPORT PLAN</small><strong>{{ selectedStudent.supportPlan || 'Not provided' }}</strong></div><div class="student-detail-wide"><small>BEHAVIOR NOTES</small><strong class="student-notes">{{ selectedStudent.behaviorNotes || 'No behavior notes recorded.' }}</strong></div>
            </div>
            <div class="student-actions-heading"><div><p class="section-kicker">DAILY REPORTS</p><h3>Recent report history</h3></div><span>{{ (selectedStudent.reports || []).length }} saved</span></div>
            <article v-for="report in (selectedStudent.reports || []).slice(0, 5)" :key="report.date + report.notes" class="report-history-item"><div><strong>{{ report.date }}</strong><span>{{ report.mood }} <i>·</i> {{ report.participation }}</span></div><p>{{ report.notes }}</p><small v-if="report.goals">Next steps: {{ report.goals }}</small></article>
            <p v-if="!(selectedStudent.reports || []).length" class="student-empty-state">No daily reports have been recorded for this student.</p>
          </section>

          <form v-else-if="studentView === 'edit'" class="settings-card student-form-card" @submit.prevent="saveStudentEdit" novalidate>
            <div class="student-section-heading"><div><p class="section-kicker">AUTHORIZED PERSONNEL</p><h2>Edit student information</h2><p>Update the record, then validate and save your changes.</p></div><button class="button-secondary" type="button" @click="studentView = 'profile'">Cancel</button></div>
            <div class="student-form-grid">
              <label class="settings-field"><span>Student name <b>*</b></span><input v-model="studentForm.name" type="text" required></label>
              <label class="settings-field"><span>Date of birth <b>*</b></span><input v-model="studentForm.dateOfBirth" type="date" required></label>
              <label class="settings-field"><span>Grade <b>*</b></span><input v-model="studentForm.grade" type="text" required></label>
              <label class="settings-field"><span>Guardian name <b>*</b></span><input v-model="studentForm.guardian" type="text" required></label>
              <label class="settings-field"><span>Guardian phone <b>*</b></span><input v-model="studentForm.guardianPhone" type="tel" required></label>
              <label class="settings-field"><span>Email address</span><input v-model="studentForm.email" type="email"></label>
              <label class="settings-field student-form-wide"><span>Support plan</span><textarea v-model="studentForm.supportPlan" rows="3"></textarea></label>
            </div>
            <p v-if="studentFormError" class="form-error" role="alert">{{ studentFormError }}</p>
            <div class="settings-card-actions"><span>All fields marked * are required.</span><button class="button-primary" type="submit">Validate and save changes <span aria-hidden="true">✓</span></button></div>
          </form>

          <section v-else-if="studentView === 'reports'" class="settings-card student-form-card">
            <div class="student-section-heading"><div><p class="section-kicker">AUTHORIZED PERSONNEL</p><h2>Daily report management</h2><p>Add a complete daily report for {{ selectedStudent.name }}.</p></div><button class="button-secondary" type="button" @click="studentView = 'profile'">Back to profile</button></div>
            <form class="student-report-form" @submit.prevent="saveDailyReport" novalidate>
              <div class="student-form-grid">
                <label class="settings-field"><span>Report date <b>*</b></span><input v-model="reportForm.date" type="date" required></label>
                <label class="settings-field"><span>Student mood <b>*</b></span><select v-model="reportForm.mood" required><option value="" disabled>Select mood</option><option>Calm</option><option>Happy</option><option>Anxious</option><option>Frustrated</option><option>Other</option></select></label>
                <label class="settings-field"><span>Participation <b>*</b></span><select v-model="reportForm.participation" required><option value="" disabled>Select participation</option><option>Engaged</option><option>Some prompting</option><option>Limited</option><option>Not observed</option></select></label>
                <label class="settings-field student-form-wide"><span>Daily summary <b>*</b></span><textarea v-model="reportForm.notes" rows="4" required placeholder="Describe the student's day and activities."></textarea></label>
                <label class="settings-field student-form-wide"><span>Goals and next steps</span><textarea v-model="reportForm.goals" rows="3" placeholder="Record goals or recommended follow-up."></textarea></label>
              </div>
              <p v-if="reportFormError" class="form-error" role="alert">{{ reportFormError }}</p>
              <div class="settings-card-actions"><span>Required fields must be complete before saving.</span><button class="button-primary" type="submit">Validate and save report <span aria-hidden="true">✓</span></button></div>
            </form>
            <div class="student-actions-heading"><div><p class="section-kicker">SAVED REPORTS</p><h3>Recent daily reports</h3></div><span>{{ (selectedStudent.reports || []).length }} saved</span></div>
            <article v-for="report in (selectedStudent.reports || []).slice(0, 3)" :key="report.date + report.notes" class="report-history-item"><div><strong>{{ report.date }}</strong><span>{{ report.mood }} <i>·</i> {{ report.participation }}</span></div><p>{{ report.notes }}</p><small v-if="report.goals">Next steps: {{ report.goals }}</small></article>
            <p v-if="!(selectedStudent.reports || []).length" class="student-empty-state">No daily reports have been saved yet.</p>
          </section>

          <form v-else-if="studentView === 'behavior'" class="settings-card student-form-card" @submit.prevent="saveBehaviorNotes" novalidate>
            <div class="student-section-heading"><div><p class="section-kicker">AUTHORIZED PERSONNEL</p><h2>Behavior management</h2><p>Review and update behavior notes for {{ selectedStudent.name }}.</p></div><button class="button-secondary" type="button" @click="studentView = 'profile'">Cancel</button></div>
            <div class="behavior-current"><small>CURRENT BEHAVIOR NOTES</small><p>{{ selectedStudent.behaviorNotes || 'No behavior notes have been recorded.' }}</p></div>
            <label class="settings-field behavior-edit-field"><span>Updated behavior notes <b>*</b></span><textarea v-model="behaviorDraft" rows="6" maxlength="1000" required placeholder="Enter relevant behavior observations and support strategies."></textarea><small>{{ behaviorDraft.length }}/1,000 characters</small></label>
            <p v-if="behaviorFormError" class="form-error" role="alert">{{ behaviorFormError }}</p>
            <div class="settings-card-actions"><span>Notes are validated before they are saved.</span><button class="button-primary" type="submit">Validate and save notes <span aria-hidden="true">✓</span></button></div>
          </form>
        </template>
        <section v-else class="settings-card student-empty-card"><p class="student-empty-state">This student record is no longer available.</p><button class="button-secondary" type="button" @click="returnToStudentSearch">Return to search</button></section>
      </section>

      <BillingInformation v-else-if="activePage === 'billing'" :students="students" :can-manage="canManageStudents" @back="openPage('dashboard')" />

      <HelpCenter v-else-if="activePage === 'help'" :can-manage="canManageStudents" :active-topic="activeHelpTopic" @select-topic="activeHelpTopic = $event" />

      <section v-else class="settings-page page-content">
        <div class="settings-heading"><p class="eyebrow">WORKSPACE PREFERENCES</p><h1>Settings</h1><p>Personalize your account and workspace, separately from center procedures.</p></div>
        <div class="settings-layout">
          <nav class="settings-tabs" aria-label="Settings sections" role="tablist" aria-orientation="vertical">
            <button v-for="tab in settingTabs" :key="tab.id" :id="'tab-' + tab.id" :class="['settings-tab', { selected: activeSettingsTab === tab.id }]" role="tab" :aria-selected="activeSettingsTab === tab.id" :aria-controls="'panel-' + tab.id" @click="selectSettingsTab(tab.id)"><span>{{ tab.label }}</span><small>{{ tab.hint }}</small></button>
          </nav>
          <div class="settings-content">
            <section v-if="activeSettingsTab === 'accessibility'" id="panel-accessibility" class="settings-card" role="tabpanel" aria-labelledby="tab-accessibility">
              <div class="settings-card-head"><span class="settings-section-icon lavender-icon">Aa</span><div><h2>Accessibility</h2><p>Adjust the display to stay comfortable throughout your working day.</p></div></div>
              <div class="accessibility-fields"><label class="settings-field"><span>Font size</span><select v-model="accessibility.fontSize"><option value="normal">Standard</option><option value="large">Large</option><option value="larger">Extra large</option></select></label><label class="settings-field"><span>Line spacing</span><select v-model="accessibility.lineSpacing"><option value="normal">Standard</option><option value="relaxed">Relaxed</option><option value="wide">Wide</option></select></label></div>
              <div class="toggle-list accessibility-toggles">
                <label class="toggle-row"><span><strong>High contrast</strong><small>Strengthen text and interface contrast.</small></span><input v-model="accessibility.highContrast" type="checkbox" role="switch"><i aria-hidden="true"></i></label>
                <label class="toggle-row"><span><strong>Dark mode</strong><small>Use a darker appearance across the workspace.</small></span><input v-model="accessibility.darkMode" type="checkbox" role="switch"><i aria-hidden="true"></i></label>
                <label class="toggle-row"><span><strong>Dyslexia-friendly font</strong><small>Use Atkinson Hyperlegible for clearer letterforms.</small></span><input v-model="accessibility.dyslexiaFont" type="checkbox" role="switch"><i aria-hidden="true"></i></label>
                <label class="toggle-row"><span><strong>Reduce motion</strong><small>Reduce transitions and animated movement.</small></span><input v-model="accessibility.reduceMotion" type="checkbox" role="switch"><i aria-hidden="true"></i></label>
              </div>
              <div class="accessibility-preview"><span class="preview-label">LIVE PREVIEW</span><p>Clear, comfortable reading helps everyone do their best work.</p><small>Changes preview immediately. Save to keep them on this device.</small></div>
              <div class="settings-card-actions"><span>These display preferences are personal to this browser.</span><button class="button-primary" type="button" @click="saveAccessibility">Save and apply <span>?</span></button></div>
            </section>

            <section v-else-if="activeSettingsTab === 'account'" id="panel-account" class="settings-card" role="tabpanel" aria-labelledby="tab-account">
              <div class="settings-card-head"><span class="settings-section-icon">ID</span><div><h2>Account &amp; Password</h2><p>View your account details and request a password change.</p></div></div>
              <div class="account-details"><div><small>ACCOUNT NAME</small><strong>{{ account.name }}</strong></div><div><small>EMAIL ADDRESS</small><strong>{{ account.email }}</strong></div><div><small>ROLE</small><strong>{{ account.role }} <span class="role-badge">Authorized</span></strong></div><div><small>ACCOUNT ID</small><strong>{{ account.userId }}</strong></div></div>
              <form class="password-form" @submit.prevent="changePassword" novalidate><div class="subsection-heading"><h3>Change password</h3><p>Enter your current password, then choose a new one.</p></div>
                <label class="settings-field"><span>Current password</span><input v-model="passwordForm.current" type="password" autocomplete="current-password" required placeholder="Enter current password"></label>
                <label class="settings-field"><span>New password</span><input v-model="passwordForm.next" type="password" autocomplete="new-password" required placeholder="Create a strong password"></label>
                <div class="password-rules" aria-live="polite"><span :class="{ met: passwordMeetsLength() }">{{ passwordMeetsLength() ? '?' : '?' }} At least 8 characters</span><span :class="{ met: passwordHasUpper() }">{{ passwordHasUpper() ? '?' : '?' }} One capital letter</span><span :class="{ met: passwordHasNumber() }">{{ passwordHasNumber() ? '?' : '?' }} One number</span><span :class="{ met: passwordHasSpecial() }">{{ passwordHasSpecial() ? '?' : '?' }} One special character</span></div>
                <label class="settings-field"><span>Confirm new password</span><input v-model="passwordForm.confirm" type="password" autocomplete="new-password" required placeholder="Enter the new password again"></label>
                <p v-if="passwordError" class="form-error" role="alert">{{ passwordError }}</p><p v-if="passwordMessage" class="form-success" role="status">{{ passwordMessage }}</p>
                <div class="settings-card-actions"><span>Secure password changes require account verification.</span><button class="button-primary" type="submit">Update password <span>?</span></button></div>
              </form>
            </section>

            <section v-else-if="activeSettingsTab === 'notifications'" id="panel-notifications" class="settings-card" role="tabpanel" aria-labelledby="tab-notifications">
              <div class="settings-card-head"><span class="settings-section-icon peach-icon">@</span><div><h2>Email Notification Preferences</h2><p>Choose the system emails you want to receive at {{ account.email }}.</p></div></div>
              <div class="toggle-list notification-toggles"><label class="toggle-row"><span><strong>Schedule changes</strong><small>Email when appointments are created, changed, or cancelled.</small></span><input v-model="notifications.scheduleChanges" type="checkbox" role="switch"><i aria-hidden="true"></i></label><label class="toggle-row"><span><strong>Password changes</strong><small>Security email when your account password changes.</small></span><input v-model="notifications.passwordChanges" type="checkbox" role="switch"><i aria-hidden="true"></i></label><label class="toggle-row"><span><strong>Account lockouts</strong><small>Email when your account is locked after unsuccessful sign-ins.</small></span><input v-model="notifications.accountLockouts" type="checkbox" role="switch"><i aria-hidden="true"></i></label></div>
              <div class="settings-card-actions"><span>Essential security notices may still be sent by your administrator.</span><button class="button-primary" type="button" @click="saveNotifications">Save preferences <span>?</span></button></div>
            </section>

            <section v-else id="panel-backup" class="settings-card" role="tabpanel" aria-labelledby="tab-backup">
              <div class="settings-card-head"><span class="settings-section-icon">?</span><div><h2>Backup Schedule</h2><p>Set automatic backup frequency and how many copies to retain.</p></div></div>
              <div class="admin-callout"><span class="admin-badge">ADMIN</span><p>Only authorized administrators can change backup settings.</p></div>
              <div class="backup-toggle"><div><strong>Automatic backups</strong><small>Schedule recurring backups for the center?s data.</small></div><label class="toggle-row compact-toggle"><span class="sr-only">Enable automatic backups</span><input v-model="backup.enabled" type="checkbox" role="switch"><i aria-hidden="true"></i></label></div>
              <div class="backup-fields" :class="{ disabled: !backup.enabled }"><label class="settings-field"><span>Backup frequency</span><select v-model="backup.frequency" :disabled="!backup.enabled"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label class="settings-field"><span>Backups to keep</span><input v-model.number="backup.keepCount" type="number" min="1" max="30" :disabled="!backup.enabled"><small>Choose from 1 to 30 backup copies.</small></label></div>
              <div class="backup-info"><strong>Backup and restoration service</strong><p>The schedule is saved on this device. A connected backup service is required to create, restore, or delete backup files.</p></div>
              <div class="settings-card-actions"><span>Schedule changes are saved on this device.</span><button class="button-primary" type="button" @click="saveBackupSchedule">Save schedule <span>?</span></button></div>
            </section>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
