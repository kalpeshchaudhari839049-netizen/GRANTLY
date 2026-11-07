import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Award, Bell, BookOpen, Calculator,
  Bookmark, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, Clock3, FileCheck2, FileText, Filter, GraduationCap, Heart,
  House, LogOut, Menu, Mic, Moon, MoreHorizontal, ScanLine, Search, Send, Settings, ShieldCheck, Sparkles,
  Sun, UserRound, Wallet, X, Zap,
} from 'lucide-react'
import { scholarships } from './data/scholarships'
import ApplicationsPage from './pages/ApplicationsPage'
import EmptyState from './components/EmptyState'
import PageHeader from './components/PageHeader'
import type { ApplicationStatus, EducationLevel, GrantlySettings, ManagedDocument, Scholarship, ScholarshipApplication, ScholarshipNotification, StudentProfile } from './types'
import { getDemoAssistantReply } from './utils/assistant'
import { matchScholarships } from './utils/eligibility'
import { formatDate } from './utils/format'
import { usePersistentState } from './hooks/usePersistentState'
import './App.css'

const ApplicationChart = lazy(() => import('./components/ApplicationChart'))
const VoiceAssistantPage = lazy(() => import('./pages/VoiceAssistantPage'))
const FinancialPlannerPage = lazy(() => import('./pages/FinancialPlannerPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const DocumentScannerPage = lazy(() => import('./pages/DocumentScannerPage'))
const DocumentVaultPage = lazy(() => import('./pages/DocumentVaultPage'))

const profileSeed: StudentProfile = {
  name: 'Alex Morgan',
  email: 'alex.morgan@example.com',
  educationLevel: 'Undergraduate',
  course: 'Computer Science',
  year: '2nd year',
  graduationYear: '2028',
  location: 'Bengaluru',
  category: '',
  familyIncome: 450000,
  percentage: 82,
}
const settingsSeed: GrantlySettings = { reminderDays: 14, digestEnabled: true, language: 'en-US', reducedMotion: false }

const applicationSeed: ScholarshipApplication[] = [
  { id: 'app-seed-1', scholarshipId: 'bright-minds', status: 'Under Review', updatedAt: '2026-10-24', history: [{ status: 'Draft', updatedAt: '2026-10-04' }, { status: 'Applied', updatedAt: '2026-10-12' }, { status: 'Under Review', updatedAt: '2026-10-24' }] },
  { id: 'app-seed-2', scholarshipId: 'nextgen-tech', status: 'Draft', updatedAt: '2026-11-02', history: [{ status: 'Draft', updatedAt: '2026-11-02' }] },
]

const levels: EducationLevel[] = ['Undergraduate', 'Postgraduate', 'Doctoral', 'High school']
const categories = ['Merit', 'Need-based', 'STEM', 'Creative', 'Community', 'Research', 'Access']
const money = (value: number) => `₹${new Intl.NumberFormat('en-IN').format(value)}`
const prettyDate = formatDate
const daysLeft = (date: string) => Math.ceil((new Date(`${date}T23:59:59`).getTime() - Date.now()) / 86400000)

const loginSchema = z.object({
  identity: z.string().min(1, 'Enter your email or username.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  remember: z.boolean(),
})
const registrationSchema = z.object({
  name: z.string().min(2, 'Please enter your full name.'),
  email: z.string().email('Enter a valid email address.'),
  mobile: z.string().regex(/^[0-9+()\-\s]{8,16}$/, 'Enter a valid mobile number.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
  confirmPassword: z.string(),
  educationLevel: z.enum(['Undergraduate', 'Postgraduate', 'Doctoral', 'High school']),
  course: z.string().min(2, 'Enter your course.'),
  year: z.string().min(1, 'Select your year of study.'),
  graduationYear: z.string().min(4, 'Enter your expected graduation year.'),
}).refine((value) => value.password === value.confirmPassword, {
  path: ['confirmPassword'],
  message: 'Passwords do not match.',
})

type LoginValues = z.infer<typeof loginSchema>
type RegistrationValues = z.infer<typeof registrationSchema>
type FilterState = {
  name: string
  level: string
  course: string
  category: string
  location: string
  income: string
  amount: string
  deadline: string
}

function Platform() {
  const [profile, setProfile] = usePersistentState<StudentProfile>('grantly-profile', profileSeed)
  const [user, setUser] = usePersistentState<{ name: string; email: string } | null>('grantly-user', null)
  const [savedIds, setSavedIds] = usePersistentState<string[]>('grantly-saved', ['bright-minds', 'women-in-design'])
  const [applications, setApplications] = usePersistentState<ScholarshipApplication[]>('grantly-applications', applicationSeed)
  const [recentViewedIds, setRecentViewedIds] = usePersistentState<string[]>('grantly-recently-viewed', [])
  const [documents, setDocuments] = usePersistentState<ManagedDocument[]>('grantly-documents', [])
  const [settings, setSettings] = usePersistentState<GrantlySettings>('grantly-settings', settingsSeed)
  const [readNotificationIds, setReadNotificationIds] = usePersistentState<string[]>('grantly-read-notifications', [])
  const [sessionFiles, setSessionFiles] = useState<Record<string, File>>({})
  const [reminders, setReminders] = usePersistentState<string[]>('grantly-reminders', [])
  const [darkMode, setDarkMode] = usePersistentState<boolean>('grantly-dark', false)
  const [toast, setToast] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const [todayISO] = useState(() => new Date().toISOString().slice(0, 10))
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light'
  }, [darkMode])

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = settings.reducedMotion ? 'true' : 'false'
  }, [settings.reducedMotion])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  useEffect(() => {
    const scholarshipId = location.pathname.match(/^\/scholarships\/([^/]+)$/)?.[1]
    if (!scholarshipId || !scholarships.some((scholarship) => scholarship.id === scholarshipId)) return
    setRecentViewedIds((current) => [scholarshipId, ...current.filter((id) => id !== scholarshipId)].slice(0, 5))
  }, [location.pathname, setRecentViewedIds])

  const toggleSaved = (id: string) => {
    setSavedIds((current) => current.includes(id) ? current.filter((saved) => saved !== id) : [...current, id])
    setToast(savedIds.includes(id) ? 'Removed from your saved scholarships.' : 'Scholarship saved to your list.')
  }

  const addApplication = (scholarshipId: string, status: ApplicationStatus = 'Applied') => {
    if (applications.some((application) => application.scholarshipId === scholarshipId)) {
      setToast('This opportunity is already in your tracker.')
      return
    }
    const updatedAt = new Date().toISOString().slice(0, 10)
    setApplications((current) => [{ id: crypto.randomUUID(), scholarshipId, status, updatedAt, history: [{ status, updatedAt }] }, ...current])
    setToast(status === 'Draft' ? 'Draft added to your application tracker.' : 'Application added to your tracker.')
  }

  const updateApplication = (id: string, status: ApplicationStatus) => {
    setApplications((current) => current.map((application) => {
      if (application.id !== id || application.status === status) return application
      const updatedAt = new Date().toISOString().slice(0, 10)
      const history = application.history ?? [{ status: application.status, updatedAt: application.updatedAt }]
      return { ...application, status, updatedAt, history: [...history, { status, updatedAt }] }
    }))
    setToast(`Application status updated to ${status}.`)
  }

  const addDocument = (file: File, type: string) => {
    const id = crypto.randomUUID()
    setDocuments((current) => [{
      id,
      name: file.name,
      type,
      category: type,
      size: file.size,
      status: 'Needs review',
      addedAt: new Date().toISOString().slice(0, 10),
      verificationStatus: 'Not verified',
    }, ...current])
    setSessionFiles((current) => ({ ...current, [id]: file }))
    setToast('Document added to your session-only vault. File contents are not saved to local storage.')
    return id
  }

  const deleteDocument = (id: string) => {
    setDocuments((current) => current.filter((document) => document.id !== id))
    setSessionFiles((current) => {
      const { [id]: _removed, ...remaining } = current
      return remaining
    })
    setToast('Document entry removed.')
  }

  const updateDocumentStatus = (id: string, status: ManagedDocument['status']) => {
    setDocuments((current) => current.map((document) => document.id === id ? { ...document, status } : document))
    setToast(`Document marked ${status.toLowerCase()}.`)
  }

  const toggleReminder = (id: string) => {
    const isSet = reminders.includes(id)
    setReminders((current) => isSet ? current.filter((item) => item !== id) : [...current, id])
    setToast(isSet ? 'Reminder turned off.' : 'Deadline reminder enabled.')
  }

  const completeLogin = (name: string, email: string) => {
    const nextUser = { name, email }
    setUser(nextUser)
    setProfile((current) => ({ ...current, name, email }))
    setToast(`Welcome${name ? `, ${name.split(' ')[0]}` : ''}! Demo sign-in successful.`)
    const destination = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    navigate(destination ?? '/dashboard', { replace: true })
  }

  const logout = () => {
    setUser(null)
    setSessionFiles({})
    setToast('You have signed out of the demo account.')
    navigate('/')
  }

  const pageProps = {
    profile, user, savedIds, applications, documents, reminders, recentViewedIds, onSave: toggleSaved,
    onAddApplication: addApplication, onUpdateApplication: updateApplication,
    onAddDocument: addDocument, onDeleteDocument: deleteDocument,
    onToggleReminder: toggleReminder, onNotify: setToast, onProfileChange: setProfile,
  }

  const publicPath = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register'
  const notificationItems: ScholarshipNotification[] = [
    ...scholarships.filter((item) => daysLeft(item.deadline) >= 0 && (reminders.includes(item.id) || (settings.digestEnabled && daysLeft(item.deadline) <= settings.reminderDays)))
      .map((item) => ({ id: `deadline-${item.id}`, title: 'Scholarship deadline', message: `${item.name} closes in ${daysLeft(item.deadline)} days.`, date: item.deadline, kind: 'deadline' as const, read: readNotificationIds.includes(`deadline-${item.id}`), href: `/scholarships/${item.id}` })),
    ...applications.slice(0, 5).map((application) => {
      const item = scholarships.find((scholarship) => scholarship.id === application.scholarshipId)
      return { id: `application-${application.id}`, title: 'Application update', message: `${item?.name ?? 'Your scholarship'} is marked ${application.status}.`, date: application.updatedAt, kind: 'application' as const, read: readNotificationIds.includes(`application-${application.id}`), href: '/applications' }
    }),
    { id: 'profile-review', title: 'Profile-powered matches', message: 'Your student profile helps personalize opportunity recommendations.', date: todayISO, kind: 'profile', read: readNotificationIds.includes('profile-review'), href: '/profile' },
  ]
  const notifications = notificationItems.sort((a, b) => b.date.localeCompare(a.date))
  return (
    <MotionConfig reducedMotion={settings.reducedMotion ? 'always' : 'user'}>
    <div className={`app-root${darkMode ? ' dark-mode' : ''}${settings.reducedMotion ? ' reduced-motion' : ''}`}>
      {publicPath ? (
        <Routes>
          <Route path="/" element={<LandingPage savedIds={savedIds} onSave={toggleSaved} />} />
          <Route path="/login" element={<AuthPage mode="login" onLogin={completeLogin} />} />
          <Route path="/register" element={<AuthPage mode="register" onRegister={(values) => {
            const nextProfile: StudentProfile = { ...profileSeed, name: values.name, email: values.email, educationLevel: values.educationLevel, course: values.course, year: values.year, graduationYear: values.graduationYear }
            setProfile(nextProfile)
            completeLogin(values.name, values.email)
          }} />} />
        </Routes>
      ) : !user ? (
        <Navigate to="/login" replace state={{ from: location }} />
      ) : (
        <AppShell user={user} profile={profile} applications={applications} notifications={notifications} darkMode={darkMode} onTheme={() => setDarkMode((mode) => !mode)} onLogout={logout}>
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
              <Suspense fallback={<div className="page-loading" role="status"><span className="loading-dot" />Loading workspace…</div>}>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage {...pageProps} />} />
                  <Route path="/scholarships" element={<FinderPage {...pageProps} />} />
                  <Route path="/scholarships/:id" element={<DetailsPage {...pageProps} />} />
                  <Route path="/eligibility" element={<EligibilityPage profile={profile} onProfileChange={setProfile} onNotify={setToast} />} />
                  <Route path="/applications" element={<ApplicationsPage applications={applications} onAdd={addApplication} onUpdate={updateApplication} />} />
                  <Route path="/documents" element={<DocumentVaultPage documents={documents} sessionFiles={sessionFiles} onUpload={addDocument} onDelete={deleteDocument} onUpdateStatus={updateDocumentStatus} />} />
                  <Route path="/documents/scan" element={<DocumentScannerPage onSaveDocument={addDocument} onNotify={setToast} />} />
                  <Route path="/deadlines" element={<DeadlinesPage reminders={reminders} onToggleReminder={toggleReminder} />} />
                  <Route path="/assistant" element={<AssistantPage profile={profile} savedIds={savedIds} />} />
                  <Route path="/voice" element={<VoiceAssistantPage language={settings.language} onLanguageChange={(language) => setSettings((current) => ({ ...current, language }))} onNotify={setToast} />} />
                  <Route path="/planner" element={<FinancialPlannerPage applications={applications} onNotify={setToast} />} />
                  <Route path="/profile" element={<ProfilePage profile={profile} onSave={setProfile} onNotify={setToast} />} />
                  <Route path="/settings" element={<SettingsPage settings={settings} onSave={setSettings} onNotify={setToast} onTheme={() => setDarkMode((mode) => !mode)} darkMode={darkMode} />} />
                  <Route path="/notifications" element={<NotificationsPage notifications={notifications} onMarkRead={(id) => setReadNotificationIds((current) => current.includes(id) ? current : [...current, id])} onMarkAllRead={() => setReadNotificationIds(notifications.map((notification) => notification.id))} />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </AppShell>
      )}
      <AnimatePresence>
        {toast && <motion.div className="toast" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} role="status"><CheckCircle2 size={17} />{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></motion.div>}
      </AnimatePresence>
    </div>
    </MotionConfig>
  )
}

function AppShell({ children, user, profile, applications, notifications, darkMode, onTheme, onLogout }: {
  children: React.ReactNode
  user: { name: string; email: string } | null
  profile: StudentProfile
  applications: ScholarshipApplication[]
  notifications: ScholarshipNotification[]
  darkMode: boolean
  onTheme: () => void
  onLogout: () => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: House },
    { to: '/scholarships', label: 'Find scholarships', icon: Search },
    { to: '/eligibility', label: 'Eligibility check', icon: Sparkles },
    { to: '/applications', label: 'Applications', icon: FileCheck2 },
    { to: '/documents', label: 'My documents', icon: FileText },
    { to: '/deadlines', label: 'Deadlines', icon: CalendarDays },
    { to: '/documents/scan', label: 'Document scanner', icon: ScanLine },
    { to: '/voice', label: 'Voice assistant', icon: Mic },
    { to: '/planner', label: 'Funding planner', icon: Calculator },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'My profile', icon: UserRound },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]
  const activeTitle = location.pathname.startsWith('/scholarships/') ? 'Scholarship details' : location.pathname === '/documents/scan' ? 'Document scanner' : navItems.find((item) => item.to === location.pathname)?.label ?? (location.pathname === '/assistant' ? 'Grantly AI' : 'Overview')
  const unreadCount = notifications.filter((notification) => !notification.read).length
  return (
    <div className="workspace">
      {mobileOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
        <Link to="/" className="brand-lockup" aria-label="Grantly home"><span className="brand-mark"><Sparkles size={18} /></span><span>grantly<span className="brand-period">.</span></span></Link>
        <div className="workspace-label">STUDENT WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === 'Applications' && <span className="nav-count">{applications.length}</span>}</NavLink>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><div className="help-icon"><CircleHelp size={17} /></div><strong>Need a hand?</strong><p>Our guide is always here for you.</p><Link to="/assistant">Chat with Grantly <ArrowRight size={14} /></Link></div>
          <button className="side-link theme-switch" onClick={onTheme}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}<span>{darkMode ? 'Light appearance' : 'Dark appearance'}</span></button>
          <div className="profile-switch"><div className="avatar">{(user?.name ?? profile.name).split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="profile-text"><strong>{user?.name ?? profile.name}</strong><span>Student account</span></div><button aria-label={user ? 'Sign out' : 'Sign in'} title={user ? 'Sign out' : 'Sign in'} onClick={user ? onLogout : () => navigate('/login')}><LogOut size={16} /></button></div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeTitle}</strong></div></div>
          <div className="topbar-actions"><Link to="/scholarships" className="top-search"><Search size={16} /><span>Find a scholarship</span><kbd>⌘ K</kbd></Link>
            <div className="notification-wrap"><button className="icon-button notification-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} onClick={() => setNotificationsOpen((open) => !open)}><Bell size={18} />{unreadCount > 0 && <i />}</button>
                {notificationsOpen && <div className="notification-popover"><div className="popover-heading"><strong>Notifications</strong><span>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</span></div>{notifications.slice(0, 3).map((notification) => <p key={notification.id}><span className={`notification-dot${notification.read ? ' mint-dot' : ''}`} />{notification.message}</p>)}<Link to="/notifications" onClick={() => setNotificationsOpen(false)}>View all notifications <ArrowRight size={14} /></Link></div>}
            </div>
            <Link to="/assistant" className="top-avatar" aria-label="Open Grantly AI">{profile.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</Link>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}

function LandingPage({ savedIds, onSave }: { savedIds: string[]; onSave: (id: string) => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const featured = scholarships.filter((item) => item.featured).slice(0, 3)
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="brand-lockup"><span className="brand-mark"><Sparkles size={18} /></span><span>grantly<span className="brand-period">.</span></span></Link>
        <nav><a href="#opportunities">Explore</a><a href="#how-it-works">How it works</a><a href="#stories">Student stories</a></nav>
        <div className="landing-nav-actions"><Link className="nav-login" to="/login">Log in</Link><Link className="button button-primary nav-cta" to="/register">Get started <ArrowUpRight size={15} /></Link></div>
      </header>
      <section className="hero-section">
        <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <div className="hero-copy"><div className="eyebrow hero-eyebrow"><span className="eyebrow-spark"><Sparkles size={12} /></span> YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>Your Future.<br /><span>Your Scholarship.</span><br />One Platform.</h1>
          <p>Discover opportunities, check your eligibility, and manage your scholarship applications with ease.</p>
          <div className="hero-actions"><button className="button button-light" onClick={() => navigate('/scholarships')}>Explore scholarships <ArrowRight size={16} /></button><button className="button button-ghost-light" onClick={() => navigate('/eligibility')}><Sparkles size={15} /> Check eligibility</button></div>
          <div className="hero-social-proof"><div className="mini-avatars"><span>A</span><span>J</span><span>M</span><span>+</span></div><div><strong>Made for students, by possibility</strong><span>Your next opportunity is waiting</span></div></div>
        </div>
        <div className="hero-art" aria-label="Scholarship match preview">
          <div className="hero-orbit orbit-outer" /><div className="hero-orbit orbit-inner" />
          <div className="hero-star star-a">✳</div><div className="hero-star star-b">✦</div><div className="hero-star star-c">✧</div>
          <div className="hero-illustration"><div className="illustration-sun" /><div className="illustration-book book-back" /><div className="illustration-book book-front"><GraduationCap size={61} strokeWidth={1.2} /></div><div className="illustration-ground" /><div className="illustration-person"><div className="person-head" /><div className="person-body" /><div className="person-arm" /></div></div>
          <motion.div className="match-float" initial={{ y: 6 }} animate={{ y: [6, -5, 6] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}><div className="match-float-icon"><Check size={16} /></div><div><span>YOUR MATCH SCORE</span><strong>92% <small>great fit</small></strong></div><div className="match-spark">↗</div></motion.div>
          <div className="grant-float"><div className="grant-float-icon"><Award size={17} /></div><div><span>JUST FOR YOU</span><strong>₹50,000</strong></div></div>
        </div>
        <div className="hero-bottom-note"><span className="hero-note-dot" /> Opportunities, made easier <span className="hero-note-line" /></div>
      </section>
      <section className="landing-search-wrap"><form className="landing-search" onSubmit={(event) => { event.preventDefault(); navigate(`/scholarships?search=${encodeURIComponent(query)}`) }}><Search size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What are you studying? Try 'engineering'" aria-label="Search scholarships" /><span className="search-separator" /><button className="button button-primary" type="submit">Find opportunities <ArrowRight size={15} /></button></form><div className="search-suggestions"><span>Popular:</span>{['Undergraduate', 'STEM', 'Need-based'].map((tag) => <button key={tag} onClick={() => navigate(`/scholarships?search=${encodeURIComponent(tag)}`)}>{tag}</button>)}</div></section>
      <section className="landing-stats"><div><strong>6</strong><span>illustrative demo listings</span></div><div><strong>₹3.2<span>L</span></strong><span>combined sample award value</span></div><div><strong>5</strong><span>transparent match checks</span></div><div><strong>0</strong><span>verified official listings</span></div></section>
      <section className="section-block featured-section" id="opportunities"><SectionHeading eyebrow="A GOOD PLACE TO START" title="Opportunities worth a look" description="A few handpicked demo scholarships to get your search moving." action={<Link to="/scholarships" className="text-link">Explore all scholarships <ArrowRight size={15} /></Link>} /><div className="featured-grid">{featured.map((item, index) => <ScholarshipCard key={item.id} scholarship={item} saved={savedIds.includes(item.id)} onSave={onSave} index={index} />)}</div><p className="demo-caption"><ShieldCheck size={14} /> Sample listings for demonstration only. Verify details with each provider before applying.</p></section>
      <section className="how-section" id="how-it-works"><div className="section-block"><SectionHeading eyebrow="A LITTLE LESS OVERWHELMING" title="From searching to submitted." description="Your scholarship journey, all in one calm and clear place." /><div className="steps-grid">{[
        { number: '01', icon: UserRound, title: 'Tell us about you', text: 'Add your education details once. We use them to surface relevant opportunities.' },
        { number: '02', icon: Sparkles, title: 'Find your fit', text: 'Explore a curated list and see transparent, explainable eligibility matches.' },
        { number: '03', icon: CheckCircle2, title: 'Keep moving forward', text: 'Track applications, save important dates, and keep your checklist close.' },
      ].map(({ number, icon: Icon, title, text }) => <div className="step-card" key={number}><span className="step-number">{number}</span><div className="step-icon"><Icon size={20} /></div><h3>{title}</h3><p>{text}</p></div>)}</div></div></section>
      <section className="section-block testimonial-section" id="stories"><div className="testimonial-quote"><span className="quote-mark">“</span><blockquote>I used to keep opportunities in ten different tabs. Now I know what to work on next.</blockquote><div className="testimonial-person"><div className="testimonial-avatar">P</div><div><strong>Priya S.</strong><span>Design student · Bengaluru</span></div></div></div><div className="testimonial-aside"><div className="eyebrow">STUDENT STORIES</div><h2>Big dreams deserve a clearer path.</h2><p>Every student deserves the confidence to explore what’s possible. We’re here to help you take it one step at a time.</p><Link to="/register" className="text-link">Start your story <ArrowRight size={15} /></Link><div className="testimonial-doodle">✳</div></div></section>
      <section className="landing-cta"><div className="cta-shape cta-shape-one" /><div className="cta-shape cta-shape-two" /><div className="eyebrow">YOUR NEXT STEP IS YOURS</div><h2>Make room for what’s possible.</h2><p>Start exploring scholarships that fit your ambitions.</p><Link to="/register" className="button button-light">Create your free account <ArrowRight size={16} /></Link></section>
      <footer className="landing-footer"><Link to="/" className="brand-lockup"><span className="brand-mark"><Sparkles size={17} /></span><span>grantly<span className="brand-period">.</span></span></Link><span>Helping good things find good people.</span><div><a href="#opportunities">Explore</a><Link to="/assistant">Help center</Link><Link to="/login">Log in</Link></div><small>© 2026 Grantly · Demo platform. Listings are illustrative.</small></footer>
    </div>
  )
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>{action}</div>
}

function ScholarshipCard({ scholarship, saved, onSave, index = 0 }: { scholarship: Scholarship; saved: boolean; onSave: (id: string) => void; index?: number }) {
  return <motion.article className={`scholarship-card accent-${scholarship.accent}`} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ delay: index * 0.06, duration: 0.35 }}>
    <div className="card-topline"><span className="provider-avatar">{scholarship.provider.slice(0, 1)}</span><span className="provider-name">{scholarship.provider}</span><button className={`save-button${saved ? ' is-saved' : ''}`} onClick={() => onSave(scholarship.id)} aria-label={saved ? 'Unsave scholarship' : 'Save scholarship'}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} /></button></div>
    <h3>{scholarship.name}</h3><p className="scholarship-description">{scholarship.description}</p>
    <div className="scholarship-benefit"><Sparkles size={12} /><span>{scholarship.benefits[0]}</span></div>
    <div className="scholarship-tags"><span>{scholarship.levels[0]} · {scholarship.minPercentage}%+</span><span>{scholarship.categories[0]}</span></div>
    <div className="card-bottom"><div><strong>{scholarship.amountLabel}</strong><span><Clock3 size={13} /> Deadline {prettyDate(scholarship.deadline)}</span></div><Link to={`/scholarships/${scholarship.id}`} className="card-arrow" aria-label={`View ${scholarship.name}`}><ArrowUpRight size={18} /></Link></div>
  </motion.article>
}

function AuthPage({ mode, onLogin, onRegister }: {
  mode: 'login' | 'register'
  onLogin?: (name: string, email: string) => void
  onRegister?: (values: RegistrationValues) => void
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const isRegister = mode === 'register'
  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { identity: '', password: '', remember: true } })
  const registerForm = useForm<RegistrationValues>({ resolver: zodResolver(registrationSchema), defaultValues: { name: '', email: '', mobile: '', password: '', confirmPassword: '', educationLevel: 'Undergraduate', course: '', year: '1st year', graduationYear: '2028' } })
  const inputError = (error?: { message?: string }) => error?.message && <span className="field-error">{error.message}</span>
  return <div className="auth-page"><div className="auth-side"><Link to="/" className="brand-lockup"><span className="brand-mark"><Sparkles size={18} /></span><span>grantly<span className="brand-period">.</span></span></Link><div className="auth-side-content"><div className="eyebrow hero-eyebrow"><Sparkles size={12} /> YOUR NEXT CHAPTER STARTS HERE</div><h1>{isRegister ? 'A brighter path starts with one step.' : 'Good to have you back.'}</h1><p>{isRegister ? 'Create your free account and make room for the opportunities ahead.' : 'Pick up right where you left off. Your next opportunity is closer than you think.'}</p><div className="auth-quote"><span>“</span><p>Having everything in one place made the whole process feel possible.</p><small>— A student, just like you</small></div></div><span className="auth-side-footer">Thoughtfully built for your next big thing.</span><div className="auth-side-orb" /></div>
    <div className="auth-main"><Link to="/" className="auth-back"><ArrowLeft size={15} /> Back to home</Link><div className="auth-form-wrap"><div className="auth-form-heading"><span className="auth-icon"><GraduationCap size={21} /></span><div className="eyebrow">{isRegister ? 'A FRESH START' : 'WELCOME BACK'}</div><h2>{isRegister ? 'Create your account' : 'Sign in to Grantly'}</h2><p>{isRegister ? 'A few details and you’re on your way.' : 'Let’s get back to finding your next opportunity.'}</p></div>
      {!isRegister ? <form className="auth-form" onSubmit={loginForm.handleSubmit((value) => onLogin?.(value.identity.includes('@') ? value.identity.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : value.identity, value.identity.includes('@') ? value.identity : `${value.identity.toLowerCase().replace(/\s/g, '.')}@example.com`))}>
        <label className="field-label">Email or username<input {...loginForm.register('identity')} placeholder="you@example.com" autoComplete="username" />{inputError(loginForm.formState.errors.identity)}</label>
        <label className="field-label">Password<span className="password-field"><input {...loginForm.register('password')} type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((show) => !show)}>{showPassword ? 'Hide' : 'Show'}</button></span>{inputError(loginForm.formState.errors.password)}</label>
        <div className="form-row-between"><label className="check-label"><input type="checkbox" {...loginForm.register('remember')} /> Remember me</label><button type="button" className="link-button" onClick={() => setForgotOpen(true)}>Forgot password?</button></div>
        <button className="button button-primary auth-submit" type="submit">Sign in <ArrowRight size={16} /></button>
        <p className="auth-switch">New to Grantly? <Link to="/register">Create an account</Link></p>
      </form> : <form className="auth-form register-form" onSubmit={registerForm.handleSubmit((values) => onRegister?.(values))}>
        <div className="form-grid"><label className="field-label field-span">Full name<input {...registerForm.register('name')} placeholder="Your full name" autoComplete="name" />{inputError(registerForm.formState.errors.name)}</label>
          <label className="field-label">Email address<input {...registerForm.register('email')} type="email" placeholder="you@example.com" autoComplete="email" />{inputError(registerForm.formState.errors.email)}</label>
          <label className="field-label">Mobile number<input {...registerForm.register('mobile')} type="tel" placeholder="+91 98765 43210" autoComplete="tel" />{inputError(registerForm.formState.errors.mobile)}</label>
          <label className="field-label">Password<span className="password-field"><input {...registerForm.register('password')} type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((show) => !show)}>{showPassword ? 'Hide' : 'Show'}</button></span>{inputError(registerForm.formState.errors.password)}</label>
          <label className="field-label">Confirm password<span className="password-field"><input {...registerForm.register('confirmPassword')} type={showConfirm ? 'text' : 'password'} placeholder="Repeat your password" autoComplete="new-password" /><button type="button" onClick={() => setShowConfirm((show) => !show)}>{showConfirm ? 'Hide' : 'Show'}</button></span>{inputError(registerForm.formState.errors.confirmPassword)}</label>
          <label className="field-label">Education level<select {...registerForm.register('educationLevel')}>{levels.map((level) => <option key={level}>{level}</option>)}</select>{inputError(registerForm.formState.errors.educationLevel)}</label>
          <label className="field-label">Course<input {...registerForm.register('course')} placeholder="e.g. Computer Science" />{inputError(registerForm.formState.errors.course)}</label>
          <label className="field-label">Year of study<select {...registerForm.register('year')}><option>1st year</option><option>2nd year</option><option>3rd year</option><option>4th year</option><option>Final year</option></select>{inputError(registerForm.formState.errors.year)}</label>
          <label className="field-label">Graduation year<input {...registerForm.register('graduationYear')} inputMode="numeric" placeholder="2028" />{inputError(registerForm.formState.errors.graduationYear)}</label>
        </div>
        <button className="button button-primary auth-submit" type="submit">Create my account <ArrowRight size={16} /></button><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </form>}
      <p className="demo-notice"><ShieldCheck size={14} /> Demo authentication only. Use any valid details to explore.</p>
    </div><div className="auth-copyright">© 2026 Grantly · A demo scholarship platform</div></div>
    {forgotOpen && <Modal title="Reset your password" onClose={() => setForgotOpen(false)}><p className="modal-copy">Password reset is not connected in this demo. You can use any email and password with 6+ characters to sign in.</p><button className="button button-primary modal-action" onClick={() => setForgotOpen(false)}>Got it</button></Modal>}
  </div>
}

function DashboardPage({ profile, savedIds, applications, recentViewedIds, onSave }: {
  profile: StudentProfile
  savedIds: string[]
  applications: ScholarshipApplication[]
  recentViewedIds: string[]
  onSave: (id: string) => void
}) {
  const navigate = useNavigate()
  const [today] = useState(() => new Date())
  const profileMatches = matchScholarships(profile, scholarships)
  const matching = profileMatches.filter((match) => match.score >= 60).length
  const upcomingDeadlines = scholarships.filter((item) => daysLeft(item.deadline) >= 0).length
  const recommended = profileMatches.filter((match) => match.score >= 60).slice(0, 3).map((match) => match.scholarship)
  const recent = [...applications].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3)
  const recentScholarships = recentViewedIds.map((id) => scholarships.find((item) => item.id === id)).filter((item): item is Scholarship => Boolean(item))
  const confirmedFunding = applications.filter((application) => application.status === 'Approved').reduce((total, application) => total + (scholarships.find((item) => item.id === application.scholarshipId)?.amount ?? 0), 0)
  const firstName = profile.name.split(' ')[0] || 'there'
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const chartData = [
    { name: 'Draft', count: applications.filter((app) => app.status === 'Draft').length, fill: '#a99bf7' },
    { name: 'Applied', count: applications.filter((app) => app.status === 'Applied').length, fill: '#8797f8' },
    { name: 'Review', count: applications.filter((app) => app.status === 'Under Review').length, fill: '#d3a3f5' },
    { name: 'Approved', count: applications.filter((app) => app.status === 'Approved').length, fill: '#67c7ad' },
    { name: 'Rejected', count: applications.filter((app) => app.status === 'Rejected').length, fill: '#f0a29b' },
  ]
  return <div className="dashboard-page"><div className="dashboard-greeting"><div><span className="greeting-date">{today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1>{greeting}, {firstName}<span className="wave">✳</span></h1><p>Ready to make a little progress on your future?</p></div><button className="button button-primary" onClick={() => navigate('/scholarships')}><Search size={16} /> Explore scholarships</button></div>
    <div className="dashboard-welcome"><div className="welcome-copy"><div className="welcome-label"><Sparkles size={14} /> YOUR JOURNEY, YOUR PACE</div><h2>There’s opportunity<br />in every next step.</h2><p>We found <strong>{matching} scholarships</strong> that could fit your education profile. Explore your matches and keep moving forward.</p><button onClick={() => navigate('/eligibility')}>Check my eligibility <ArrowRight size={15} /></button></div><div className="welcome-visual"><div className="welcome-orbit" /><div className="welcome-tile tile-one"><Sparkles size={20} /></div><div className="welcome-tile tile-two"><GraduationCap size={26} /></div><div className="welcome-card-float"><span>YOUR MATCHES</span><strong>{matching} <small>opportunities</small></strong><div className="tiny-progress"><i /></div></div><div className="welcome-person"><div /><span /></div></div><div className="welcome-deco">✳</div></div>
    <div className="stat-grid">{[
      { label: 'Available scholarships', value: scholarships.length.toString(), note: 'in our demo directory', icon: BookOpen, color: 'purple', link: '/scholarships' },
      { label: 'Good profile matches', value: String(matching), note: 'based on your study level', icon: Sparkles, color: 'blue', link: '/eligibility' },
      { label: 'Saved for later', value: String(savedIds.length), note: 'keep your favorites close', icon: Heart, color: 'peach', link: '/scholarships' },
      { label: 'Applied scholarships', value: String(applications.filter((application) => application.status !== 'Draft').length), note: 'submitted or being reviewed', icon: FileCheck2, color: 'mint', link: '/applications' },
      { label: 'Upcoming deadlines', value: String(upcomingDeadlines), note: 'sample dates to keep in view', icon: CalendarDays, color: 'blue', link: '/deadlines' },
      { label: 'Confirmed funding', value: money(confirmedFunding), note: 'approved demo awards', icon: Wallet, color: 'mint', link: '/planner' },
    ].map(({ label, value, note, icon: Icon, color, link }) => <Link key={label} to={link} className="stat-card"><div className={`stat-icon ${color}`}><Icon size={18} /></div><span className="stat-label">{label}</span><div className="stat-value">{value}<ArrowUpRight size={15} /></div><span className="stat-note">{note}</span></Link>)}</div>
    <div className="dashboard-columns"><section className="panel application-panel"><div className="panel-heading"><div><div className="eyebrow">KEEP AN EYE ON IT</div><h2>Application progress</h2></div><Link to="/applications" className="icon-link" aria-label="View all applications"><ArrowUpRight size={17} /></Link></div><div className="chart-area"><Suspense fallback={<div className="chart-donut chart-loading" aria-label="Loading application chart" />}><ApplicationChart data={chartData} total={applications.length} /></Suspense><div className="chart-legend">{chartData.map((item) => <div key={item.name}><i style={{ backgroundColor: item.fill }} /><span>{item.name}</span><strong>{item.count}</strong></div>)}</div></div><div className="panel-footnote"><span><span className="live-dot" /> Your journey at a glance</span><Link to="/applications">Open tracker <ArrowRight size={14} /></Link></div></section>
      <section className="panel deadline-panel"><div className="panel-heading"><div><div className="eyebrow">DON’T MISS A MOMENT</div><h2>Coming up next</h2></div><Link to="/deadlines" className="text-link">See calendar <ArrowRight size={14} /></Link></div><div className="mini-deadlines">{scholarships.filter((item) => daysLeft(item.deadline) > 0).sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 3).map((item) => <div className="mini-deadline" key={item.id}><div className="mini-date"><strong>{new Date(`${item.deadline}T00:00:00`).getDate()}</strong><span>{new Date(`${item.deadline}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span></div><div className="mini-deadline-name"><strong>{item.name}</strong><span>{item.provider}</span></div><span className="days-pill">{daysLeft(item.deadline)} days</span></div>)}</div></section></div>
    <section className="recommended-section"><div className="panel-heading"><div><div className="eyebrow">PICKED FOR YOUR PROFILE</div><h2>Recommended for you</h2></div><Link to="/scholarships" className="text-link">View all <ArrowRight size={14} /></Link></div><div className="featured-grid dashboard-cards">{recommended.map((item, index) => <ScholarshipCard key={item.id} scholarship={item} saved={savedIds.includes(item.id)} onSave={onSave} index={index} />)}</div></section>
    {recentScholarships.length > 0 && <section className="recommended-section"><div className="panel-heading"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Recently viewed</h2></div><Link to="/scholarships" className="text-link">Explore more <ArrowRight size={14} /></Link></div><div className="featured-grid dashboard-cards">{recentScholarships.map((item, index) => <ScholarshipCard key={item.id} scholarship={item} saved={savedIds.includes(item.id)} onSave={onSave} index={index} />)}</div></section>}
    <div className="dashboard-bottom"><section className="panel recent-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR LATEST MOVES</div><h2>Recent activity</h2></div><Link to="/applications" className="icon-link"><ArrowUpRight size={17} /></Link></div>{recent.length ? <div className="activity-list">{recent.map((application) => {
      const scholarship = scholarships.find((item) => item.id === application.scholarshipId)
      return <div className="activity-item" key={application.id}><span className={`activity-icon status-${application.status.toLowerCase().replace(/\s/g, '-')}`}><FileCheck2 size={16} /></span><div><strong>{scholarship?.name ?? 'Scholarship application'}</strong><span>{application.status} · Updated {prettyDate(application.updatedAt)}</span></div><ArrowUpRight size={14} /></div>
    })}</div> : <EmptyState icon={FileText} title="Nothing here yet" text="Add a scholarship to your tracker to see activity." action={<Link to="/scholarships">Explore scholarships</Link>} />}</section><section className="profile-completion"><div className="completion-top"><div className="completion-icon"><UserRound size={18} /></div><span>PROFILE SNAPSHOT</span><MoreHorizontal size={17} /></div><h3>Your profile is looking good.</h3><p>A little more detail can help us surface more relevant opportunities.</p><div className="completion-meter"><i style={{ width: `${profile.percentage ? 82 : 50}%` }} /></div><div className="completion-percent"><span>Profile strength</span><strong>{profile.percentage ? '82%' : '50%'}</strong></div><button onClick={() => navigate('/eligibility')}>Review my matches <ArrowRight size={14} /></button></section></div>
  </div>
}

function FinderPage({ savedIds, onSave }: { savedIds: string[]; onSave: (id: string) => void }) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<FilterState>(() => ({
    name: new URLSearchParams(window.location.search).get('search') ?? '',
    level: '', course: '', category: '', location: '', income: '', amount: '', deadline: '',
  }))
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortNearest, setSortNearest] = useState(true)
  const update = (key: keyof FilterState, value: string) => setFilters((current) => ({ ...current, [key]: value }))
  const results = useMemo(() => scholarships.filter((item) => {
    const keyword = filters.name.toLowerCase()
    const matchesText = !keyword || [item.name, item.provider, item.description, ...item.courses, ...item.categories].join(' ').toLowerCase().includes(keyword)
    const matchesLevel = !filters.level || item.levels.includes(filters.level as EducationLevel)
    const matchesCourse = !filters.course || item.courses.some((course) => course === 'Any course' || course.toLowerCase().includes(filters.course.toLowerCase()))
    const matchesCategory = !filters.category || item.categories.includes(filters.category)
    const matchesLocation = !filters.location || item.locations.some((location) => location === 'All India' || location.toLowerCase().includes(filters.location.toLowerCase()))
    const matchesIncome = !filters.income || item.maxIncome >= Number(filters.income)
    const matchesAmount = !filters.amount || item.amount >= Number(filters.amount)
    const matchesDeadline = !filters.deadline || item.deadline <= filters.deadline
    return matchesText && matchesLevel && matchesCourse && matchesCategory && matchesLocation && matchesIncome && matchesAmount && matchesDeadline
  }).sort((a, b) => sortNearest ? a.deadline.localeCompare(b.deadline) : b.amount - a.amount), [filters, sortNearest])
  const clearFilters = () => setFilters({ name: '', level: '', course: '', category: '', location: '', income: '', amount: '', deadline: '' })
  return <div className="finder-page"><PageHeader eyebrow="EXPLORE THE POSSIBLE" title="Find your scholarship" description="Thoughtfully gathered sample opportunities, ready for you to explore." action={<button className="button button-outline" onClick={() => navigate('/eligibility')}><Sparkles size={15} /> Check my eligibility</button>} />
    <div className="finder-searchbar"><Search size={19} /><input value={filters.name} onChange={(event) => update('name', event.target.value)} placeholder="Search scholarships, providers, or subjects..." aria-label="Search scholarships" /><button className={`filter-toggle${filtersOpen ? ' selected' : ''}`} onClick={() => setFiltersOpen((open) => !open)}><Filter size={16} /> Filters <span>{Object.values(filters).filter(Boolean).length - (filters.name ? 1 : 0) || ''}</span></button></div>
    {filtersOpen && <div className="filter-panel"><label>Education level<select value={filters.level} onChange={(event) => update('level', event.target.value)}><option value="">All levels</option>{levels.map((level) => <option key={level}>{level}</option>)}</select></label><label>Course<input value={filters.course} onChange={(event) => update('course', event.target.value)} placeholder="e.g. Engineering" /></label><label>Category<select value={filters.category} onChange={(event) => update('category', event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Location<input value={filters.location} onChange={(event) => update('location', event.target.value)} placeholder="City or region" /></label><label>Annual family income<select value={filters.income} onChange={(event) => update('income', event.target.value)}><option value="">Any income</option><option value="500000">Up to ₹5 lakh</option><option value="800000">Up to ₹8 lakh</option><option value="1200000">Up to ₹12 lakh</option><option value="1500000">Up to ₹15 lakh</option></select></label><label>Minimum award<select value={filters.amount} onChange={(event) => update('amount', event.target.value)}><option value="">Any amount</option><option value="25000">₹25,000+</option><option value="50000">₹50,000+</option><option value="75000">₹75,000+</option></select></label><label>Deadline on or before<input type="date" value={filters.deadline} onChange={(event) => update('deadline', event.target.value)} /></label><button className="clear-filter" onClick={clearFilters}>Clear all filters</button></div>}
    <div className="results-bar"><div><strong>{results.length} opportunities</strong><span> · all sample listings</span></div><button className="sort-select" onClick={() => setSortNearest((nearest) => !nearest)}>{sortNearest ? 'Nearest deadline' : 'Highest award'} <ChevronDown size={15} /></button></div>
    {results.length ? <div className="featured-grid finder-grid">{results.map((item, index) => <ScholarshipCard key={item.id} scholarship={item} saved={savedIds.includes(item.id)} onSave={onSave} index={index} />)}</div> : <EmptyState icon={Search} title="No matches just yet" text="Try broadening your search or clearing one of your filters." action={<button className="button button-outline" onClick={clearFilters}>Clear filters</button>} />}
    <div className="notice-banner"><ShieldCheck size={17} /><span><strong>A note about these listings</strong> — Scholarship details are illustrative demo data. Always verify eligibility, deadlines, and application details with the provider.</span></div>
  </div>
}

function EligibilityPage({ profile, onProfileChange, onNotify }: { profile: StudentProfile; onProfileChange: (profile: StudentProfile) => void; onNotify: (message: string) => void }) {
  const [result, setResult] = useState<{ scholarship: Scholarship; score: number; eligible: boolean; reasons: string[]; missing: string[] }[] | null>(null)
  const [form, setForm] = useState({
    name: profile.name, educationLevel: profile.educationLevel, course: profile.course, year: profile.year,
    location: profile.location, category: profile.category, income: String(profile.familyIncome || ''),
    percentage: String(profile.percentage || ''),
  })
  const calculate = (event: React.FormEvent) => {
    event.preventDefault()
    const income = Number(form.income)
    const percentage = Number(form.percentage)
    if (!form.name.trim() || !form.course.trim() || !form.location.trim() || income <= 0 || percentage < 0 || percentage > 100) {
      onNotify('Please complete each required field. Academic percentage must be between 0 and 100.')
      return
    }
    const updatedProfile: StudentProfile = {
      ...profile,
      name: form.name.trim(),
      educationLevel: form.educationLevel,
      course: form.course.trim(),
      year: form.year,
      location: form.location.trim(),
      category: form.category,
      familyIncome: income,
      percentage,
    }
    onProfileChange(updatedProfile)
    const matches = matchScholarships(updatedProfile, scholarships)
    setResult(matches)
  }
  const setField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))
  return <div className="eligibility-page"><PageHeader eyebrow="A CLEARER WAY TO EXPLORE" title="Check your eligibility" description="A transparent first look at how your profile lines up with sample criteria." />
    <div className="eligibility-layout"><form className="panel eligibility-form" onSubmit={calculate}><div className="form-section-heading"><span className="form-section-icon"><UserRound size={17} /></span><div><h2>Tell us about yourself</h2><p>We’ll compare these details against the sample criteria.</p></div></div>
      <div className="form-grid eligibility-fields"><label className="field-label field-span">Student name<input value={form.name} onChange={(event) => setField('name', event.target.value)} placeholder="Your full name" required /></label><label className="field-label">Education level<select value={form.educationLevel} onChange={(event) => setField('educationLevel', event.target.value)}>{levels.map((level) => <option key={level}>{level}</option>)}</select></label><label className="field-label">Course or field<input value={form.course} onChange={(event) => setField('course', event.target.value)} placeholder="e.g. Computer Science" required /></label><label className="field-label">Year of study<select value={form.year} onChange={(event) => setField('year', event.target.value)}>{['1st year', '2nd year', '3rd year', '4th year', 'Final year'].map((year) => <option key={year}>{year}</option>)}</select></label><label className="field-label">Your location<input value={form.location} onChange={(event) => setField('location', event.target.value)} placeholder="City or region" required /></label><label className="field-label">Category <span className="optional">(optional)</span><select value={form.category} onChange={(event) => setField('category', event.target.value)}><option value="">Prefer not to say</option><option>General</option><option>OBC</option><option>SC</option><option>ST</option><option>Other</option></select></label><label className="field-label">Annual family income<input value={form.income} onChange={(event) => setField('income', event.target.value)} type="number" min="1" placeholder="e.g. 450000" required /><small className="field-hint">Used only for the demo rule-based estimate.</small></label><label className="field-label">Academic percentage<input value={form.percentage} onChange={(event) => setField('percentage', event.target.value)} type="number" min="0" max="100" step="0.1" placeholder="e.g. 82" required /></label></div><div className="privacy-hint"><ShieldCheck size={16} /><span>Your profile information stays in this browser in this demo. We never guarantee an award or approval.</span></div><button className="button button-primary eligibility-submit" type="submit"><Sparkles size={16} /> Show my matches <ArrowRight size={15} /></button></form>
      <aside className="eligibility-aside"><div className="aside-glow" /><div className="aside-spark"><Sparkles size={19} /></div><h3>A match is a starting point, not a promise.</h3><p>This transparent, rule-based demo compares your profile against sample opportunity criteria. Always double-check requirements with the provider.</p><div className="criteria-legend"><div><CheckCircle2 size={16} /><span><strong>Likely eligible</strong><small>All listed demo checks match</small></span></div><div><CircleHelp size={16} /><span><strong>Potentially eligible</strong><small>Some details may need a closer look</small></span></div></div><Link to="/scholarships" className="text-link">Browse all opportunities <ArrowRight size={14} /></Link></aside></div>
    {result && <section className="eligibility-results"><div className="results-title"><div><div className="eyebrow">YOUR DEMO MATCH REPORT</div><h2>{result.filter((item) => item.eligible).length} likely matches <span>·</span> {result.filter((item) => !item.eligible).length} potential matches</h2></div><button className="button button-outline" onClick={() => setResult(null)}>Edit profile</button></div><div className="match-results">{result.map((item) => <MatchResult key={item.scholarship.id} match={item} />)}</div></section>}
  </div>
}

function MatchResult({ match }: { match: { scholarship: Scholarship; score: number; eligible: boolean; reasons: string[]; missing: string[] } }) {
  const [expanded, setExpanded] = useState(false)
  return <article className="match-result"><div className={`match-score${match.eligible ? ' score-good' : ''}`}><strong>{match.score}%</strong><span>match</span></div><div className="match-result-main"><div className="match-result-title"><div><span className={`match-label${match.eligible ? ' likely' : ''}`}>{match.eligible ? 'Likely eligible' : 'Potentially eligible'}</span><h3>{match.scholarship.name}</h3><p>{match.scholarship.provider} · {match.scholarship.amountLabel}</p></div><Link to={`/scholarships/${match.scholarship.id}`} className="card-arrow"><ArrowUpRight size={17} /></Link></div><div className="match-reasons">{match.reasons.slice(0, expanded ? 5 : 2).map((reason) => <span key={reason}><Check size={13} />{reason}</span>)}{match.missing.slice(0, expanded ? 5 : 1).map((missing) => <span className="missing-reason" key={missing}><CircleHelp size={13} />{missing}</span>)}</div><button className="expand-reasons" onClick={() => setExpanded((open) => !open)}>{expanded ? 'Show less' : 'See all criteria'} <ChevronDown size={14} className={expanded ? 'rotated' : ''} /></button></div></article>
}

function DetailsPage({ savedIds, applications, onSave, onAddApplication, onToggleReminder }: {
  savedIds: string[]
  applications: ScholarshipApplication[]
  onSave: (id: string) => void
  onAddApplication: (id: string, status?: ApplicationStatus) => void
  onToggleReminder: (id: string) => void
}) {
  const { id = '' } = useParams()
  const scholarship = scholarships.find((item) => item.id === id)
  const navigate = useNavigate()
  if (!scholarship) return <div className="not-found"><h1>Opportunity not found</h1><Link to="/scholarships" className="text-link"><ArrowLeft size={15} /> Back to scholarships</Link></div>
  const alreadyTracked = applications.some((application) => application.scholarshipId === scholarship.id)
  return <div className="details-page"><button className="back-link" onClick={() => navigate('/scholarships')}><ArrowLeft size={15} /> Back to opportunities</button><div className={`details-hero accent-${scholarship.accent}`}><div className="details-hero-content"><span className="provider-chip"><span className="provider-avatar">{scholarship.provider[0]}</span>{scholarship.provider}</span><div className="eyebrow">DEMO SCHOLARSHIP</div><h1>{scholarship.name}</h1><p>{scholarship.description}</p><div className="details-meta"><span><Wallet size={15} /> {scholarship.amountLabel}</span><span><CalendarDays size={15} /> Closes {prettyDate(scholarship.deadline)}</span><span><GraduationCap size={16} /> {scholarship.levels.join(', ')}</span></div><div className="details-actions"><button className="button button-primary" onClick={() => onAddApplication(scholarship.id)}>{alreadyTracked ? <Check size={16} /> : <ArrowUpRight size={16} />}{alreadyTracked ? 'In your tracker' : 'Add to my tracker'}</button><button className={`button button-outline${savedIds.includes(scholarship.id) ? ' saved-outline' : ''}`} onClick={() => onSave(scholarship.id)}><Bookmark size={16} fill={savedIds.includes(scholarship.id) ? 'currentColor' : 'none'} />{savedIds.includes(scholarship.id) ? 'Saved' : 'Save for later'}</button><button className="button button-outline" onClick={() => onToggleReminder(scholarship.id)}><Bell size={15} /> Remind me</button></div></div><div className="details-hero-art"><div className="details-art-orbit" /><div className="details-art-cap"><GraduationCap size={87} strokeWidth={1} /></div><div className="details-art-label"><Award size={15} /> A STEP TOWARD WHAT’S NEXT</div></div></div>
    <div className="details-layout"><div className="details-main-column"><section className="panel detail-section"><div className="detail-heading"><span className="detail-icon lavender"><BookOpen size={17} /></span><div><h2>About this opportunity</h2><p>A quick overview of this sample listing.</p></div></div><p className="detail-body">{scholarship.description} This illustrative listing is intended to show how scholarship information can be organized in Grantly. It is not an official offer; confirm current details directly with the provider.</p><div className="important-date"><CalendarDays size={15} /><span><strong>Sample deadline</strong><small>{prettyDate(scholarship.deadline)} · Verify opening and closing dates with the provider.</small></span></div></section>
      <section className="panel detail-section"><div className="detail-heading"><span className="detail-icon blue"><CheckCircle2 size={17} /></span><div><h2>Eligibility criteria</h2><p>Sample matching rules used in this demo.</p></div></div><ul className="detail-list">{scholarship.requirements.map((requirement) => <li key={requirement}><Check size={15} />{requirement}</li>)}<li><Check size={15} />Eligible sample courses: {scholarship.courses.join(', ')}</li></ul></section>
      <section className="panel detail-section"><div className="detail-heading"><span className="detail-icon mint"><Zap size={17} /></span><div><h2>What it could include</h2><p>Illustrative benefits, subject to provider confirmation.</p></div></div><ul className="detail-list">{scholarship.benefits.map((benefit) => <li key={benefit}><Check size={15} />{benefit}</li>)}</ul></section>
      <section className="panel detail-section"><div className="detail-heading"><span className="detail-icon peach"><FileText size={17} /></span><div><h2>Documents to prepare</h2><p>Possible checklist items for this demo opportunity.</p></div></div><div className="document-chip-list">{scholarship.documents.map((document) => <span key={document}><FileText size={14} />{document}</span>)}</div><Link to="/documents" className="text-link">Open document manager <ArrowRight size={14} /></Link></section>
      <section className="panel detail-section"><div className="detail-heading"><span className="detail-icon blue"><ArrowUpRight size={17} /></span><div><h2>Application instructions</h2><p>A safe starting point for your next steps.</p></div></div><ol className="application-steps"><li><span>1</span><p>Review the sample eligibility criteria and important dates above.</p></li><li><span>2</span><p>Confirm current requirements, dates, and the application link with {scholarship.provider}.</p></li><li><span>3</span><p>Prepare only the documents requested by the provider, then submit through its official channel.</p></li><li><span>4</span><p>Add your progress to the Grantly tracker. This demo does not submit applications.</p></li></ol></section></div>
      <aside className="details-side-column"><div className="panel detail-facts"><div className="eyebrow">AT A GLANCE</div><div className="fact-row"><span>Sample award</span><strong>{scholarship.amountLabel}</strong></div><div className="fact-row"><span>Application deadline</span><strong>{prettyDate(scholarship.deadline)}</strong></div><div className="fact-row"><span>Academic minimum</span><strong>{scholarship.minPercentage}%</strong></div><div className="fact-row"><span>Sample income limit</span><strong>{money(scholarship.maxIncome)}</strong></div><div className="fact-row"><span>Categories</span><strong>{scholarship.categories.join(', ')}</strong></div><button className="button button-primary full-button" onClick={() => onAddApplication(scholarship.id)}>{alreadyTracked ? 'Already in tracker' : 'Start an application'} <ArrowRight size={15} /></button><p className="demo-caption"><ShieldCheck size={13} /> Demo link unavailable. Confirm application steps with the provider.</p></div><div className="provider-note"><ShieldCheck size={18} /><div><strong>Keep it verified</strong><p>This is demo information, not a verified scholarship. Always use an official provider source before sharing details or applying.</p></div></div></aside></div></div>
}

function DeadlinesPage({ reminders, onToggleReminder }: { reminders: string[]; onToggleReminder: (id: string) => void }) {
  const [monthOffset, setMonthOffset] = useState(0)
  const [today] = useState(() => new Date())
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const monthLabel = monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const firstWeekday = (monthDate.getDay() + 6) % 7
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const deadlineMap = new Map<string, Scholarship[]>()
  scholarships.forEach((item) => {
    const key = item.deadline
    deadlineMap.set(key, [...(deadlineMap.get(key) ?? []), item])
  })
  const upcoming = scholarships.filter((item) => daysLeft(item.deadline) >= 0).sort((a, b) => a.deadline.localeCompare(b.deadline))
  const calendarCells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1
    return day > 0 && day <= daysInMonth ? day : null
  })
  return <div className="deadlines-page"><PageHeader eyebrow="A LITTLE HEADS-UP GOES A LONG WAY" title="Deadlines & reminders" description="Keep important dates in view and turn on a browser-local reminder for what matters." />
    <div className="deadline-layout"><section className="panel calendar-panel"><div className="calendar-heading"><div><div className="eyebrow">YOUR MONTH AT A GLANCE</div><h2>{monthLabel}</h2></div><div className="calendar-controls"><button aria-label="Previous month" onClick={() => setMonthOffset((offset) => offset - 1)}><ChevronLeft size={17} /></button><button aria-label="Next month" onClick={() => setMonthOffset((offset) => offset + 1)}><ChevronRight size={17} /></button></div></div><div className="calendar-grid calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid calendar-days">{calendarCells.map((day, index) => {
      const dateKey = day ? `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
      const hasDeadline = deadlineMap.has(dateKey)
      const isToday = day === today.getDate() && monthDate.getMonth() === today.getMonth() && monthDate.getFullYear() === today.getFullYear()
      return <div key={index} className={`calendar-cell${day ? '' : ' empty'}${isToday ? ' today' : ''}${hasDeadline ? ' has-deadline' : ''}`}><span>{day}</span>{hasDeadline && <i title={`${deadlineMap.get(dateKey)?.length} scholarship deadline`} />}</div>
    })}</div><div className="calendar-legend"><span><i className="legend-deadline" /> Scholarship deadline</span><span><i className="legend-today" /> Today</span></div></section>
      <aside className="panel upcoming-panel"><div className="panel-heading"><div><div className="eyebrow">ON YOUR RADAR</div><h2>Upcoming deadlines</h2></div><span className="upcoming-count">{upcoming.length}</span></div>{upcoming.length ? <div className="upcoming-list">{upcoming.map((item) => {
        const remaining = daysLeft(item.deadline)
        const reminderOn = reminders.includes(item.id)
        return <article className="upcoming-item" key={item.id}><div className={`upcoming-date ${remaining <= 14 ? 'urgent' : ''}`}><strong>{new Date(`${item.deadline}T00:00:00`).getDate()}</strong><span>{new Date(`${item.deadline}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span></div><div className="upcoming-item-main"><Link to={`/scholarships/${item.id}`}>{item.name}</Link><span>{remaining === 0 ? 'Due today' : `${remaining} days left`} · {item.amountLabel}</span></div><button className={`reminder-toggle${reminderOn ? ' reminder-on' : ''}`} title={reminderOn ? 'Turn reminder off' : 'Turn reminder on'} aria-label={`${reminderOn ? 'Turn off' : 'Set'} reminder for ${item.name}`} onClick={() => onToggleReminder(item.id)}><Bell size={15} /></button></article>
      })}</div> : <EmptyState icon={CalendarDays} title="All clear for now" text="No upcoming sample deadlines." />}</aside></div>
    <div className="notice-banner"><Bell size={16} /><span>Reminders are saved in this browser for the demo. They don’t send emails or push notifications when you’re away.</span></div>
  </div>
}

function AssistantPage({ profile, savedIds }: { profile: StudentProfile; savedIds: string[] }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([
    { role: 'assistant', text: `Hi ${profile.name.split(' ')[0]}! I’m Grantly AI, your scholarship sidekick. I can help you explore sample matches, prepare a document checklist, or understand the next steps. What’s on your mind?` },
  ])
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  const send = (text = input) => {
    const clean = text.trim()
    if (!clean) return
    setMessages((current) => [...current, { role: 'user', text: clean }, { role: 'assistant', text: getDemoAssistantReply(clean, profile, savedIds.length) }])
    setInput('')
  }
  const prompts = ['Which scholarships match my profile?', 'What documents might I need?', 'How do I apply?']
  return <div className="assistant-page"><PageHeader eyebrow="A FRIENDLY GUIDE, NOT A GATEKEEPER" title="Meet Grantly AI" description="A demo assistant for your scholarship journey. Ask away—no question is too small." />
    <div className="assistant-layout"><section className="panel chat-panel"><div className="chat-header"><div className="chat-avatar"><Sparkles size={18} /></div><div><strong>Grantly AI</strong><span><i /> Here to help · Demo mode</span></div><button title="New conversation" aria-label="Start a new conversation" onClick={() => setMessages([{ role: 'assistant', text: `Hi ${profile.name.split(' ')[0]}! What can I help you explore today?` }])}><MoreHorizontal size={19} /></button></div><div className="chat-messages">{messages.map((message, index) => <div key={index} className={`chat-message ${message.role}`}><div className="chat-message-avatar">{message.role === 'assistant' ? <Sparkles size={14} /> : profile.name[0]}</div><div className="chat-bubble">{message.text}</div></div>)}<div ref={endRef} /></div>{messages.length === 1 && <div className="prompt-suggestions">{prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)}>{prompt}<ArrowUpRight size={13} /></button>)}</div>}<form className="chat-compose" onSubmit={(event) => { event.preventDefault(); send() }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask me anything about your scholarship journey..." aria-label="Message Grantly AI" /><button className="send-button" type="submit" disabled={!input.trim()} aria-label="Send message"><Send size={17} /></button></form><p className="chat-disclaimer"><ShieldCheck size={13} /> Demo responses only. Verify official details with scholarship providers.</p></section>
      <aside className="assistant-aside"><div className="assistant-card ai-about"><div className="ai-orbit"><Sparkles size={22} /></div><div className="eyebrow">YOUR SCHOLARSHIP SIDEKICK</div><h3>Curious minds welcome.</h3><p>Ask me to explain an application step or help you think through what to prepare.</p><span className="demo-badge"><span /> Rule-based demo assistant</span></div><div className="assistant-card quick-questions"><div className="eyebrow">QUICK QUESTIONS</div>{prompts.map((prompt, index) => <button key={prompt} onClick={() => send(prompt)}><span>{['✳', '▧', '↗'][index]}</span>{prompt}<ArrowUpRight size={14} /></button>)}</div><div className="privacy-small"><ShieldCheck size={16} /><span>Your questions stay in this browser session in the demo.</span></div></aside></div>
  </div>
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  return <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><motion.div className="modal-card" initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="modal-close" onClick={onClose} aria-label="Close dialog"><X size={17} /></button><div className="eyebrow">GRANTLY</div><h2 id="modal-title">{title}</h2>{children}</motion.div></div>
}

export default function App() {
  return <BrowserRouter><Platform /></BrowserRouter>
}
