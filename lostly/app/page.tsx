'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  FileText,
  Home,
  MapPin,
  Menu,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  ArrowLeft,
  SlidersHorizontal,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Palette,
  Layers,
  Info,
  ExternalLink,
  Eye,
  Copy,
  Check,
  Tag,
  Calendar,
} from 'lucide-react'
import { listReports, createReport, deleteReport } from '@/lib/api/reports'
import { runMatching } from '@/lib/api/matches'
import type {
  Report,
  ReportType,
  CandidateMatch,
  MatchResponse,
  CreateReportInput,
} from '@/types/lost-found'

type View = 'home' | 'report' | 'reports' | 'matches'

const nav = [
  { id: 'home', label: 'Dashboard', icon: Home },
  { id: 'reports', label: 'All Reports', icon: FileText },
  { id: 'matches', label: 'AI Matching Engine', icon: Sparkles },
]

const STANDARD_CATEGORIES = [
  'Mobile Phone',
  'Laptop',
  'Tablet',
  'Electronics',
  'Wallet',
  'ID Card',
  'Keys',
  'Bag',
  'Book',
  'Clothing',
  'Accessory',
  'Document',
  'Watch',
  'Other',
]

const CAMPUS_LOCATIONS = [
  'Library',
  'Cafeteria',
  'Main Block',
  'Science Hall',
  'Hostel',
  'Parking',
  'Computer Lab',
  'Auditorium',
  'Sports Ground',
  'Classroom',
  'Other',
]

function getLocalDateTimeString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
}

function extractSharedTokens(text1: string, text2: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'in', 'on', 'at', 'with', 'and', 'or', 'for', 'of', 'to', 'from',
    'by', 'is', 'was', 'it', 'its', 'near', 'found', 'lost', 'item', 'my', 'left', 'some',
    'this', 'that', 'there', 'here', 'set', 'into', 'over', 'room', 'area',
  ])
  const tokenize = (t: string) =>
    (t.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 2 && !stopWords.has(w))

  const tokens1 = new Set(tokenize(text1))
  const tokens2 = tokenize(text2)
  const shared = new Set<string>()
  for (const tok of tokens2) {
    if (tokens1.has(tok)) {
      shared.add(tok)
    }
  }
  return Array.from(shared).slice(0, 8)
}

const DEMO_SCENARIOS = [
  {
    title: '🔑 Lost Keys (Spider-Man)',
    tag: 'Matches Library Found Keys (>90%)',
    type: 'LOST' as ReportType,
    category: 'Keys',
    color: 'Red',
    location: 'Library',
    description: 'Lost a set of room keys with a red Spider-Man keychain and silver ring near the 2nd floor study area.',
  },
  {
    title: '🎧 Found AirPods Pro',
    tag: 'Location & NLP Match Demo',
    type: 'FOUND' as ReportType,
    category: 'Electronics',
    color: 'White',
    location: 'Cafeteria',
    description: 'Found Apple AirPods Pro 2nd Gen inside a matte black silicone case with a carabiner clip on table #14.',
  },
  {
    title: '💻 Lost MacBook Air',
    tag: 'High Value Student Asset',
    type: 'LOST' as ReportType,
    category: 'Laptop',
    color: 'Silver',
    location: 'Computer Lab',
    description: 'Silver 13-inch M2 MacBook Air with GitHub Octocat and React stickers on top cover. Left near terminal 18.',
  },
]

export default function Page() {
  const [view, setView] = useState<View>('home')
  const [mobileNav, setMobileNav] = useState(false)
  const [reportType, setReportType] = useState<ReportType>('LOST')
  const [reports, setReports] = useState<Report[]>([])
  const [isLoadingReports, setIsLoadingReports] = useState(false)
  const [reportsError, setReportsError] = useState<string | null>(null)

  // Matching state
  const [activeMatchResponse, setActiveMatchResponse] = useState<MatchResponse | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateMatch | null>(null)
  const [isMatchingLoading, setIsMatchingLoading] = useState(false)
  const [matchError, setMatchError] = useState<string | null>(null)

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // New report form fields
  const [form, setForm] = useState({
    category: 'Mobile Phone',
    color: 'Black',
    location: 'Library',
    date_time: getLocalDateTimeString(),
    description: 'Black Samsung Galaxy S23 with a cracked screen and blue protective case.',
  })

  // Fetch reports on mount
  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    setIsLoadingReports(true)
    setReportsError(null)
    try {
      const data = await listReports()
      setReports(data)
    } catch (err: any) {
      setReportsError(err.message || 'Unable to connect to backend API.')
    } finally {
      setIsLoadingReports(false)
    }
  }

  // Handle triggering match for any report
  async function handleTriggerMatch(report: Report) {
    setIsMatchingLoading(true)
    setMatchError(null)
    setView('matches')
    try {
      const res = await runMatching(report.id, 10)
      setActiveMatchResponse(res)
      if (res.matches && res.matches.length > 0) {
        setSelectedCandidate(res.matches[0])
      } else {
        setSelectedCandidate(null)
      }
    } catch (err: any) {
      setMatchError(err.message || 'Failed to calculate candidate matches.')
    } finally {
      setIsMatchingLoading(false)
    }
  }

  // Handle report creation
  async function submitReport(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    try {
      const payload: CreateReportInput = {
        type: reportType,
        category: form.category,
        color: form.color.trim() || null,
        location: form.location,
        date_time: new Date(form.date_time).toISOString(),
        description: form.description.trim(),
      }

      const created = await createReport(payload)
      setSuccessMessage(`Successfully filed ${created.type} report for ${created.category}!`)
      await loadReports()

      // Automatically execute matching for the newly created report
      await handleTriggerMatch(created)
    } catch (err: any) {
      setFormError(err.message || 'Validation error submitting report.')
      setIsSubmitting(false)
    }
  }

  // Modals and feedback state
  const [selectedReportForDetails, setSelectedReportForDetails] = useState<Report | null>(null)
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [claimHandoverData, setClaimHandoverData] = useState<{
    source: Report
    candidate: CandidateMatch
  } | null>(null)

  function showToast(type: 'success' | 'error', text: string) {
    setToastMessage({ type, text })
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur))
    }, 4500)
  }

  function onRequestDeleteReport(report: Report) {
    setReportToDelete(report)
  }

  async function handleConfirmDelete() {
    if (!reportToDelete) return
    setIsDeleting(true)
    try {
      await deleteReport(reportToDelete.id)
      setReports((prev) => prev.filter((r) => r.id !== reportToDelete.id))
      if (activeMatchResponse?.source_report.id === reportToDelete.id) {
        setActiveMatchResponse(null)
        setSelectedCandidate(null)
      }
      if (selectedReportForDetails?.id === reportToDelete.id) {
        setSelectedReportForDetails(null)
      }
      showToast('success', `Deleted report for "${reportToDelete.category}" (${reportToDelete.location})`)
      setReportToDelete(null)
    } catch (err: any) {
      showToast('error', `Failed to delete report: ${err.message || 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  function handleViewDetails(report: Report) {
    setSelectedReportForDetails(report)
  }

  const goReport = (type: ReportType) => {
    setReportType(type)
    setFormError(null)
    setView('report')
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[550px] w-[1100px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-primary/15 via-indigo-400/10 to-purple-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute top-[36rem] -left-48 -z-10 h-[450px] w-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute top-[50rem] -right-48 -z-10 h-[450px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />

      {/* Circular Floating Navbar */}
      <div className="sticky top-3 sm:top-5 z-40 mx-auto w-[calc(100%-1.25rem)] sm:w-[calc(100%-2.5rem)] max-w-5xl transition-all duration-300">
        <header className="relative flex h-14 sm:h-16 items-center justify-between rounded-full border border-white/70 bg-white/85 px-3 sm:px-4 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-2xl ring-1 ring-black/[0.04]">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none pl-1"
            onClick={() => setView('home')}
          >
            <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-indigo-600 to-blue-600 text-white shadow-md shadow-primary/25 ring-2 ring-white">
              <Package size={17} className="sm:size-[19px]" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-foreground">Lostly</span>
                <span className="hidden xs:inline-flex rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-primary shrink-0">
                  AI Matcher
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Tabs (Pill Island) */}
          <nav className="hidden items-center gap-1 rounded-full bg-muted/60 p-1 border border-border/60 md:flex">
            {nav.map(({ id, label, icon: Icon }) => {
              const isActive = view === id
              return (
                <button
                  key={id}
                  onClick={() => {
                    if (id === 'matches' && !activeMatchResponse && reports.length > 0) {
                      handleTriggerMatch(reports[0])
                    } else {
                      setView(id as View)
                    }
                  }}
                  className={`flex items-center rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white text-foreground shadow-xs ring-1 ring-border/80'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/60'
                  }`}
                >
                  <Icon size={14} className={`mr-1.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {label}
                  {id === 'reports' && reports.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-extrabold text-primary">
                      {reports.length}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 pr-1">
            {/* Live API status dot pill */}
            <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-[10px] font-bold text-emerald-800 lg:flex shadow-2xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
              </span>
              Live API
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => goReport('LOST')}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-indigo-600 px-3.5 sm:px-4 py-2 text-xs font-bold text-white shadow-sm shadow-primary/30 hover:shadow-md hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden xs:inline">Report Item</span>
              <span className="xs:hidden">Report</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              aria-label="Toggle Navigation Menu"
              onClick={() => setMobileNav(!mobileNav)}
              className="flex size-9 items-center justify-center rounded-full border border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all md:hidden"
            >
              {mobileNav ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </header>

        {/* Floating Mobile Dropdown Menu Card */}
        {mobileNav && (
          <div className="mt-2.5 w-full rounded-3xl border border-border/80 bg-white/95 backdrop-blur-2xl p-3.5 shadow-2xl ring-1 ring-black/5 animate-in slide-in-from-top-2 duration-200 md:hidden">
            <nav className="space-y-1">
              {nav.map(({ id, label, icon: Icon }) => {
                const isActive = view === id
                return (
                  <button
                    key={id}
                    onClick={() => {
                      if (id === 'matches' && !activeMatchResponse && reports.length > 0) {
                        handleTriggerMatch(reports[0])
                      } else {
                        setView(id as View)
                      }
                      setMobileNav(false)
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-left text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                      <span>{label}</span>
                    </div>
                    {id === 'reports' && reports.length > 0 && (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {reports.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Mobile Drawer Quick Actions */}
            <div className="mt-2.5 pt-2.5 border-t border-border/60 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  goReport('LOST')
                  setMobileNav(false)
                }}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-amber-500/10 text-amber-800 border border-amber-500/20 py-2.5 text-xs font-bold hover:bg-amber-500/20 active:scale-95 transition-all"
              >
                <Search size={14} />
                Report Lost
              </button>
              <button
                onClick={() => {
                  goReport('FOUND')
                  setMobileNav(false)
                }}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 py-2.5 text-xs font-bold hover:bg-emerald-500/20 active:scale-95 transition-all"
              >
                <Package size={14} />
                Report Found
              </button>
            </div>

            {/* Mobile API Live status bar */}
            <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-1.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                Live PostgreSQL Sync
              </span>
              <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Connected
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Container */}
      <main className="mx-auto max-w-[1280px] px-4 pt-4 sm:pt-6 pb-24 lg:px-8">
        {view === 'home' && (
          <Dashboard
            reports={reports}
            isLoading={isLoadingReports}
            onReport={goReport}
            onView={setView}
            onTriggerMatch={handleTriggerMatch}
            onViewDetails={handleViewDetails}
            onDelete={onRequestDeleteReport}
            activeMatch={activeMatchResponse}
          />
        )}

        {view === 'report' && (
          <ReportForm
            type={reportType}
            setType={setReportType}
            form={form}
            setForm={setForm}
            isSubmitting={isSubmitting}
            error={formError}
            onBack={() => setView('home')}
            onSubmit={submitReport}
          />
        )}

        {view === 'reports' && (
          <ReportsView
            reports={reports}
            isLoading={isLoadingReports}
            error={reportsError}
            onRefresh={loadReports}
            onReport={goReport}
            onTriggerMatch={handleTriggerMatch}
            onViewDetails={handleViewDetails}
            onDelete={onRequestDeleteReport}
            onBack={() => setView('home')}
          />
        )}

        {view === 'matches' && (
          <MatchesView
            reports={reports}
            matchResponse={activeMatchResponse}
            selectedCandidate={selectedCandidate}
            isLoading={isMatchingLoading}
            error={matchError}
            onSelectCandidate={setSelectedCandidate}
            onTriggerMatch={handleTriggerMatch}
            onBack={() => setView('home')}
            onNavigateReport={() => goReport('LOST')}
            onInitiateClaim={(source, candidate) => {
              setClaimHandoverData({ source, candidate })
            }}
          />
        )}
      </main>

      {/* View Details Modal */}
      {selectedReportForDetails && (
        <ReportDetailsModal
          report={selectedReportForDetails}
          onClose={() => setSelectedReportForDetails(null)}
          onTriggerMatch={(r) => {
            setSelectedReportForDetails(null)
            handleTriggerMatch(r)
          }}
          onDelete={(r) => {
            setReportToDelete(r)
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <DeleteConfirmationModal
          report={reportToDelete}
          isDeleting={isDeleting}
          onCancel={() => {
            if (!isDeleting) setReportToDelete(null)
          }}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Campus Handover & Claim Pass Modal */}
      {claimHandoverData && (
        <ClaimHandoverModal
          sourceReport={claimHandoverData.source}
          candidate={claimHandoverData.candidate}
          onClose={() => setClaimHandoverData(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-border bg-white px-5 py-4 shadow-xl">
          <div
            className={`flex size-8 items-center justify-center rounded-xl ${
              toastMessage.type === 'success'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="max-w-xs text-xs">
            <p className="font-semibold text-foreground">
              {toastMessage.type === 'success' ? 'Action Completed' : 'Operation Failed'}
            </p>
            <p className="text-muted-foreground mt-0.5">{toastMessage.text}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ==============================================================================
   DASHBOARD VIEW
   ============================================================================== */
function Dashboard({
  reports,
  isLoading,
  onReport,
  onView,
  onTriggerMatch,
  onViewDetails,
  onDelete,
  activeMatch,
}: {
  reports: Report[]
  isLoading: boolean
  onReport: (type: ReportType) => void
  onView: (view: View) => void
  onTriggerMatch: (r: Report) => void
  onViewDetails: (r: Report) => void
  onDelete: (r: Report) => void
  activeMatch: MatchResponse | null
}) {
  const lostCount = reports.filter((r) => r.type === 'LOST').length
  const foundCount = reports.filter((r) => r.type === 'FOUND').length
  const topMatch = activeMatch?.matches && activeMatch.matches.length > 0 ? activeMatch.matches[0] : null

  return (
    <div className="space-y-8">
      {/* Hero Greeting Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-white via-white to-slate-50/50 p-5 sm:p-8 lg:p-10 shadow-xs">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] sm:text-xs font-semibold text-primary backdrop-blur-xs mb-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Campus Intelligent Agent • 5-Factor Weighted Engine
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              Campus Matching Center
            </h1>
            <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground">
              Deterministic heuristic matching cross-evaluating student Lost & Found reports across <span className="font-semibold text-foreground">Category (20%)</span>, <span className="font-semibold text-foreground">Color (15%)</span>, <span className="font-semibold text-foreground">Location (20%)</span>, <span className="font-semibold text-foreground">Time (20%)</span>, and <span className="font-semibold text-foreground">NLP Description Overlap (25%)</span>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={() => onReport('LOST')}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-amber-500/20 hover:opacity-95 active:scale-95 transition-all w-full sm:w-auto"
            >
              <Search size={17} />
              I Lost Something
            </button>
            <button
              onClick={() => onReport('FOUND')}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:opacity-95 active:scale-95 transition-all w-full sm:w-auto"
            >
              <Package size={17} />
              I Found Something
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Total Active Reports */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-white p-5 sm:p-6 shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Total Active Reports</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <FileText size={16} />
            </div>
          </div>
          <p className="mt-3 sm:mt-4 text-3xl sm:text-4xl font-black tracking-tight text-foreground">{isLoading ? '...' : reports.length}</p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Synced in real-time with PostgreSQL</span>
          </div>
        </div>

        {/* Lost vs Found */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-white p-5 sm:p-6 shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>Lost vs Found Ratio</span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <Layers size={16} />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-amber-600">{lostCount}</span>
            <span className="text-xs font-semibold text-muted-foreground">Lost</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-3xl sm:text-4xl font-black text-emerald-600">{foundCount}</span>
            <span className="text-xs font-semibold text-muted-foreground">Found</span>
          </div>
          {/* Visual Ratio Bar */}
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              style={{ width: `${lostCount + foundCount > 0 ? (lostCount / (lostCount + foundCount)) * 100 : 50}%` }}
              className="bg-amber-500 transition-all duration-500"
            />
            <div
              style={{ width: `${lostCount + foundCount > 0 ? (foundCount / (lostCount + foundCount)) * 100 : 50}%` }}
              className="bg-emerald-500 transition-all duration-500"
            />
          </div>
        </div>

        {/* AI Matching Status */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-white p-5 sm:p-6 shadow-xs hover:border-primary/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>AI Engine Status</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Sparkles size={16} />
              </div>
            </div>
            <p className="mt-3 sm:mt-4 text-lg sm:text-xl font-bold text-emerald-600 flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              {topMatch ? `Best: ${topMatch.overall_score}% (${topMatch.decision})` : 'Engine Ready'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {activeMatch ? `${activeMatch.candidates_evaluated} opposite candidates evaluated` : '5-factor heuristic algorithm ready'}
            </p>
          </div>
          {!activeMatch && reports.length > 0 && (
            <button
              onClick={() => onTriggerMatch(reports[0])}
              className="mt-4 inline-flex w-full sm:w-fit items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:opacity-95 active:scale-95 transition-all"
            >
              <Sparkles size={13} />
              Run Demo Match ({reports[0].category})
            </button>
          )}
        </div>
      </div>

      {/* Active Match Banner if present */}
      {topMatch && activeMatch && (
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/[0.04] to-indigo-50/50 p-4 sm:p-7 shadow-xs">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-3.5 sm:gap-4">
              <div className="flex size-13 sm:size-16 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/30 bg-white text-xl sm:text-2xl font-black text-primary shadow-sm">
                {topMatch.overall_score}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    {topMatch.decision}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    Matched against {activeMatch.source_report.category} ({activeMatch.source_report.type})
                  </span>
                </div>
                <h3 className="mt-1 text-base sm:text-lg font-bold text-foreground">
                  {topMatch.candidate_report.category} in {topMatch.candidate_report.location}
                </h3>
                <p className="mt-1 line-clamp-2 sm:line-clamp-1 text-xs text-muted-foreground">
                  {topMatch.explanation.summary}
                </p>
              </div>
            </div>

            <button
              onClick={() => onView('matches')}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:opacity-95 active:scale-95 transition-all w-full sm:w-auto"
            >
              Examine Match Decomposition <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Recent Reports Section */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Recent Campus Reports</h2>
            <p className="text-xs text-muted-foreground">Select any item to trigger the heuristic matching agent</p>
          </div>
          <button
            onClick={() => onView('reports')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all ({reports.length})
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="rounded-2xl border border-border bg-white p-12 text-center text-sm text-muted-foreground">
              Loading reports from database...
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl border border-border bg-white p-12 text-center">
              <Package size={36} className="mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-base font-bold">No reports filed yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Get started by filing a lost or found report.</p>
              <button
                onClick={() => onReport('LOST')}
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                Create First Report
              </button>
            </div>
          ) : (
            reports.slice(0, 6).map((r) => (
              <div
                key={r.id}
                className="group flex flex-col justify-between gap-3.5 rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-xs hover:border-primary/40 hover:shadow-md transition-all sm:flex-row sm:items-center sm:px-6"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl font-black text-xs shadow-xs ${
                      r.type === 'LOST'
                        ? 'bg-gradient-to-br from-amber-50 to-orange-100 text-amber-800 border border-amber-200/80'
                        : 'bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-800 border border-emerald-200/80'
                    }`}
                  >
                    {r.type}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-foreground truncate">
                        {r.category}
                      </h4>
                      {r.color && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                          {r.color}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground/80">
                        <MapPin size={12} className="text-primary shrink-0" /> {r.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="shrink-0" /> {new Date(r.date_time).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 sm:line-clamp-1 text-xs text-muted-foreground/90 max-w-xl">
                      {r.description}
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-2 pt-3 border-t border-border/60 sm:w-auto sm:border-0 sm:pt-0 sm:justify-end shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onViewDetails(r)}
                      className="flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs"
                      title="View full submitted report details"
                    >
                      <Eye size={13} />
                      Details
                    </button>
                    <button
                      onClick={() => onDelete(r)}
                      className="rounded-xl p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 active:scale-95 transition-colors"
                      title="Delete report"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <button
                    onClick={() => onTriggerMatch(r)}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:opacity-95 active:scale-95 transition-all"
                  >
                    <Sparkles size={13} />
                    Run AI Match
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/* ==============================================================================
   REPORT FORM VIEW
   ============================================================================== */
function ReportForm({
  type,
  setType,
  form,
  setForm,
  isSubmitting,
  error,
  onBack,
  onSubmit,
}: {
  type: ReportType
  setType: (t: ReportType) => void
  form: any
  setForm: any
  isSubmitting: boolean
  error: string | null
  onBack: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      <div className="mb-6">
        <span className="text-xs font-bold uppercase tracking-wider text-primary">New Item Report</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">File a Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Provide structured item details. Our deterministic AI heuristic engine will automatically evaluate opposite candidates.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs font-medium text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Quick Demo Scenarios */}
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles size={14} /> Quick Demo Presets (1-Click Fill)
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">Click to auto-populate</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {DEMO_SCENARIOS.map((sc) => (
              <button
                key={sc.title}
                type="button"
                onClick={() => {
                  setType(sc.type)
                  setForm({
                    category: sc.category,
                    color: sc.color,
                    location: sc.location,
                    date_time: getLocalDateTimeString(),
                    description: sc.description,
                  })
                }}
                className="rounded-xl border border-border bg-white p-2.5 text-left shadow-xs hover:border-primary hover:bg-primary/[0.04] transition-all"
              >
                <p className="text-xs font-bold text-foreground">{sc.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sc.tag}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Type Toggle */}
        <div className="flex rounded-xl border border-border bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setType('LOST')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              type === 'LOST'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            I Lost An Item
          </button>
          <button
            type="button"
            onClick={() => setType('FOUND')}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              type === 'FOUND'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            I Found An Item
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Item Category *
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:bg-white"
              >
                {STANDARD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Primary Color
              </label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="e.g. Black, Silver, Navy"
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Campus Location *
              </label>
              <select
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-medium text-foreground focus:border-primary focus:bg-white"
              >
                {CAMPUS_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date & Time *
              </label>
              <input
                required
                type="datetime-local"
                value={form.date_time}
                onChange={(e) => setForm({ ...form, date_time: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Detailed Description *
              </label>
              <span className="text-[11px] text-muted-foreground">
                Weight: 25% in heuristic calculation
              </span>
            </div>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe distinguishing attributes (model, scratches, stickers, screen damage, case color)..."
              className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background p-3.5 text-sm leading-relaxed placeholder:text-muted-foreground focus:border-primary focus:bg-white"
            />
          </div>

          <div className="rounded-xl bg-muted/60 p-3.5 text-xs leading-relaxed text-muted-foreground flex items-start gap-2">
            <Info size={15} className="mt-0.5 shrink-0 text-primary" />
            <span>
              The AI matching engine does not use generic keywords: it executes token overlap, category taxonomy affinity, campus location proximity, and chronological verification.
            </span>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-70 text-center"
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Submitting & Evaluating AI...
              </>
            ) : (
              <>
                <Sparkles size={15} />
                Submit & Run AI Match
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ==============================================================================
   ALL REPORTS VIEW
   ============================================================================== */
function ReportsView({
  reports,
  isLoading,
  error,
  onRefresh,
  onReport,
  onTriggerMatch,
  onViewDetails,
  onDelete,
  onBack,
}: {
  reports: Report[]
  isLoading: boolean
  error: string | null
  onRefresh: () => void
  onReport: (type: ReportType) => void
  onTriggerMatch: (r: Report) => void
  onViewDetails: (r: Report) => void
  onDelete: (r: Report) => void
  onBack: () => void
}) {
  const [filterType, setFilterType] = useState<'ALL' | 'LOST' | 'FOUND'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (filterType !== 'ALL' && r.type !== filterType) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          r.category.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.color && r.color.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [reports, filterType, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={15} /> Back to dashboard
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted shadow-xs active:scale-95 transition-all"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => onReport('LOST')}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-95 active:scale-95 transition-all"
          >
            <Plus size={14} />
            New Report
          </button>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Database Reports</h1>
        <p className="text-xs text-muted-foreground">
          All verified items stored in Supabase PostgreSQL repository
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs font-medium text-red-700">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex w-full sm:w-auto overflow-x-auto rounded-xl border border-border bg-white p-1 shadow-sm">
          {(['ALL', 'LOST', 'FOUND'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`flex-1 sm:flex-initial rounded-lg px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                filterType === t
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'LOST' ? 'Lost Items' : 'Found Items'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search category, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white pl-9 pr-3 py-2 sm:py-1.5 text-xs focus:border-primary"
          />
        </div>
      </div>

      {/* Table / List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-12 text-center text-sm text-muted-foreground shadow-xs">
            No matching reports found.
          </div>
        ) : (
          filtered.map((r) => (
            <div
              key={r.id}
              className="group flex flex-col justify-between gap-3.5 rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-xs hover:border-primary/40 hover:shadow-md transition-all sm:flex-row sm:items-center sm:px-6"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl font-black text-xs shadow-xs ${
                    r.type === 'LOST'
                      ? 'bg-gradient-to-br from-amber-50 to-orange-100 text-amber-800 border border-amber-200/80'
                      : 'bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-800 border border-emerald-200/80'
                  }`}
                >
                  {r.type}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground truncate">
                      {r.category}
                    </h3>
                    {r.color && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground shrink-0">
                        {r.color}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground/90 max-w-xl line-clamp-2 leading-relaxed">
                    {r.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground/80">
                      <MapPin size={11} className="text-primary shrink-0" /> {r.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} className="shrink-0" /> {new Date(r.date_time).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex w-full items-center justify-between gap-2 pt-3 border-t border-border/60 sm:w-auto sm:border-0 sm:pt-0 sm:justify-end shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onViewDetails(r)}
                    className="flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted active:scale-95 transition-all shadow-xs"
                    title="View full submitted details"
                  >
                    <Eye size={13} />
                    Details
                  </button>
                  <button
                    onClick={() => onDelete(r)}
                    className="rounded-xl p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600 active:scale-95 transition-colors"
                    title="Delete report"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <button
                  onClick={() => onTriggerMatch(r)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:opacity-95 active:scale-95 transition-all"
                >
                  <Sparkles size={13} />
                  Run AI Match
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ==============================================================================
   AI MATCHES VIEW (EXPLAINABILITY ENGINE)
   ============================================================================== */
function MatchesView({
  reports,
  matchResponse,
  selectedCandidate,
  isLoading,
  error,
  onSelectCandidate,
  onTriggerMatch,
  onBack,
  onNavigateReport,
  onInitiateClaim,
}: {
  reports: Report[]
  matchResponse: MatchResponse | null
  selectedCandidate: CandidateMatch | null
  isLoading: boolean
  error: string | null
  onSelectCandidate: (c: CandidateMatch) => void
  onTriggerMatch: (r: Report) => void
  onBack: () => void
  onNavigateReport: () => void
  onInitiateClaim: (source: Report, candidate: CandidateMatch) => void
}) {
  if (isLoading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw size={36} className="mx-auto animate-spin text-primary" />
        <h2 className="mt-4 text-lg font-bold">Evaluating Candidate Matches...</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Executing multi-factor heuristic compatibility scoring across opposite-type reports
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <AlertCircle size={36} className="mx-auto text-red-500" />
        <h2 className="mt-3 text-lg font-bold">Matching Evaluation Error</h2>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <button
          onClick={onBack}
          className="mt-6 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          Return to Dashboard
        </button>
      </div>
    )
  }

  if (!matchResponse) {
    return (
      <div className="space-y-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={15} /> Back to dashboard
        </button>

        <div className="rounded-2xl border border-border bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  AI Matching Engine
                </span>
                <span className="text-xs text-muted-foreground">Select a report to evaluate</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                Campus Candidate Matcher
              </h1>
              <p className="mt-1 max-w-xl text-xs text-muted-foreground leading-relaxed">
                Select any active lost or found item below to execute our deterministic 5-factor heuristic agent (Category 20%, Color 15%, Location 20%, Chronology 20%, NLP Overlap 25%).
              </p>
            </div>

            {reports.length > 0 && (
              <button
                onClick={() => onTriggerMatch(reports[0])}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 active:scale-95 transition-all w-full sm:w-auto"
              >
                <Sparkles size={15} />
                Run Match on {reports[0].category} ({reports[0].type})
              </button>
            )}
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
            <Sparkles size={36} className="mx-auto text-primary" />
            <h3 className="mt-3 text-base font-bold text-foreground">No Reports in Database Yet</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              File a lost or found report to run candidate heuristic matching.
            </p>
            <button
              onClick={onNavigateReport}
              className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
            >
              File a Report
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Choose a Report to Cross-Evaluate ({reports.length} available)
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-white p-5 shadow-xs hover:border-primary/40 transition-all gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          r.type === 'LOST'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {r.type}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {r.id.slice(0, 8)}...
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-foreground">
                      {r.category} {r.color ? `· ${r.color}` : ''}
                    </h4>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} /> {r.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {new Date(r.date_time).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-xs text-muted-foreground/80 leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  <button
                    onClick={() => onTriggerMatch(r)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 py-2.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <Sparkles size={14} />
                    Evaluate Against Opposite Pool
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const { source_report, matches, candidates_evaluated } = matchResponse

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={15} /> Back to dashboard
      </button>

      {/* Query Banner */}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  source_report.type === 'LOST'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Query Report: {source_report.type}
              </span>
              <span className="text-xs text-muted-foreground">
                Evaluated against {candidates_evaluated} candidate reports
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {source_report.category} {source_report.color ? `(${source_report.color})` : ''} at {source_report.location}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">{source_report.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold">
              {matches.length} matches ranked
            </span>
          </div>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-12 text-center shadow-sm">
          <Info size={32} className="mx-auto text-muted-foreground" />
          <h3 className="mt-3 text-base font-bold">No Candidates Found</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            No reports of the opposite type ({source_report.type === 'LOST' ? 'FOUND' : 'LOST'}) currently exist in the database.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* Candidates Column */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Ranked Candidates
            </h3>

            {matches.map((m, idx) => {
              const isSelected = selectedCandidate?.candidate_report.id === m.candidate_report.id
              const isMatch = m.decision === 'MATCH'
              const isReview = m.decision === 'REVIEW'

              return (
                <button
                  key={m.candidate_report.id}
                  onClick={() => onSelectCandidate(m)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/[0.02] shadow-sm ring-2 ring-primary/20'
                      : 'border-border bg-white hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            isMatch
                              ? 'bg-emerald-100 text-emerald-800'
                              : isReview
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {m.decision}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground">
                        {m.candidate_report.category}
                        {m.candidate_report.color ? ` (${m.candidate_report.color})` : ''}
                      </h4>

                      <p className="text-xs text-muted-foreground">
                        {m.candidate_report.location} · {new Date(m.candidate_report.date_time).toLocaleDateString()}
                      </p>

                      <p className="line-clamp-2 text-xs text-muted-foreground/80">
                        {m.candidate_report.description}
                      </p>
                    </div>

                    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-primary/20 bg-primary/5 text-primary">
                      <span className="text-base font-bold leading-none">{m.overall_score}</span>
                      <span className="mt-0.5 text-[8px] uppercase tracking-wider text-muted-foreground">Score</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Candidate Explanation Detail Column */}
          {selectedCandidate ? (
            <SideBySideMatchInspector
              sourceReport={source_report}
              candidate={selectedCandidate}
              onInitiateClaim={onInitiateClaim}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-white p-6 text-center text-xs text-muted-foreground">
              Select a candidate match to inspect its explainability breakdown
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ==============================================================================
   SIDE-BY-SIDE MATCH INSPECTOR (ACADEMIC EXPLAINABILITY)
   ============================================================================== */
function SideBySideMatchInspector({
  sourceReport,
  candidate,
  onInitiateClaim,
}: {
  sourceReport: Report
  candidate: CandidateMatch
  onInitiateClaim: (source: Report, candidate: CandidateMatch) => void
}) {
  const { candidate_report, overall_score, decision, factors, explanation } = candidate
  const isMatch = decision === 'MATCH'
  const isReview = decision === 'REVIEW'
  const sharedTokens = extractSharedTokens(sourceReport.description, candidate_report.description)

  return (
    <div className="space-y-6">
      {/* Top Banner & Decision */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                  isMatch
                    ? 'bg-emerald-100 text-emerald-800'
                    : isReview
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {decision === 'MATCH'
                  ? 'HIGH CONFIDENCE MATCH'
                  : decision === 'REVIEW'
                  ? 'MANUAL REVIEW RECOMMENDED'
                  : 'LOW COMPATIBILITY'}
              </span>
              <span className="text-[11px] text-muted-foreground">Deterministic Heuristic AI</span>
            </div>
            <h3 className="mt-1.5 text-base sm:text-xl font-bold text-foreground">
              Candidate #{candidate_report.id.slice(0, 6)} Compatibility
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Cross-evaluated across 5 weighted academic heuristic dimensions
            </p>
          </div>

          <div className="flex size-14 sm:size-20 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <span className="text-2xl sm:text-3xl font-black leading-none">{overall_score}</span>
            <span className="mt-0.5 sm:mt-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest opacity-80">/ 100</span>
          </div>
        </div>

        {/* AI Summary Banner */}
        <div className="mt-3.5 sm:mt-4 rounded-xl bg-muted/60 p-3 sm:p-4 text-xs leading-relaxed text-foreground">
          <span className="font-semibold text-primary block mb-0.5">AI Agent Assessment:</span>
          {explanation.summary}
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Side-by-Side Attribute Comparison
          </h4>
          <span className="text-[11px] text-muted-foreground">Source vs Candidate</span>
        </div>

        <div className="grid gap-3.5 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          {/* Source Column */}
          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  sourceReport.type === 'LOST'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Your Report: {sourceReport.type}
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Item Category & Color
              </span>
              <p className="text-sm font-bold text-foreground">
                {sourceReport.category} {sourceReport.color ? `· ${sourceReport.color}` : ''}
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Campus Location
              </span>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                <MapPin size={12} className="text-primary" />
                {sourceReport.location}
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reported Incident Time
              </span>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock size={12} />
                {new Date(sourceReport.date_time).toLocaleString()}
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                User Submitted Description
              </span>
              <p className="rounded-lg bg-white p-2.5 text-xs text-muted-foreground border border-border leading-relaxed">
                {sourceReport.description}
              </p>
            </div>
          </div>

          {/* Candidate Column */}
          <div className="rounded-xl border border-border bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                  candidate_report.type === 'LOST'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Candidate Match: {candidate_report.type}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {candidate_report.id.slice(0, 8)}...
              </span>
            </div>

            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Item Category & Color
              </span>
              <p className="text-sm font-bold text-foreground">
                {candidate_report.category} {candidate_report.color ? `· ${candidate_report.color}` : ''}
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Campus Location
              </span>
              <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                <MapPin size={12} className="text-primary" />
                {candidate_report.location}
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Reported Incident Time
              </span>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock size={12} />
                {new Date(candidate_report.date_time).toLocaleString()}
              </p>
            </div>

            <div>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                User Submitted Description
              </span>
              <p className="rounded-lg bg-white p-2.5 text-xs text-muted-foreground border border-border leading-relaxed">
                {candidate_report.description}
              </p>
            </div>
          </div>
        </div>

        {/* NLP Shared Tokens Proof */}
        {sharedTokens.length > 0 && (
          <div className="rounded-xl bg-primary/[0.04] border border-primary/20 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Sparkles size={14} /> Shared NLP Keywords Extracted ({sharedTokens.length})
              </span>
              <span className="text-[10px] text-muted-foreground">Weight: 25% in heuristic</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sharedTokens.map((tok) => (
                <span
                  key={tok}
                  className="rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-primary border border-primary/30 shadow-xs"
                >
                  #{tok}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Heuristic Factors & Evidence */}
      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-6">
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Heuristic Factor Sub-Scores
          </h4>

          <div className="space-y-2.5">
            <FactorBar label="Category Affinity" weight="20%" score={factors.category} />
            <FactorBar label="Color Compatibility" weight="15%" score={factors.color} />
            <FactorBar label="Campus Location Proximity" weight="20%" score={factors.location} />
            <FactorBar label="Chronological Compatibility" weight="20%" score={factors.time} />
            <FactorBar label="NLP Description Overlap" weight="25%" score={factors.description} />
          </div>
        </div>

        {/* Positive Reasons */}
        {explanation.reasons && explanation.reasons.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Positive Evidence Corroboration
            </h4>
            <ul className="space-y-1 text-xs text-foreground">
              {explanation.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Penalties / Discrepancies */}
        {explanation.negative_factors && explanation.negative_factors.length > 0 && (
          <div className="space-y-1.5 border-t border-border pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Penalties / Discrepancies
            </h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {explanation.negative_factors.map((nf, i) => (
                <li key={i} className="flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>{nf}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {explanation.notes && explanation.notes.length > 0 && (
          <div className="space-y-1 text-xs text-muted-foreground border-t border-border pt-3">
            {explanation.notes.map((n, i) => (
              <p key={i} className="flex items-center gap-1.5 text-[11px]">
                <Info size={13} className="text-primary shrink-0" />
                <span>{n}</span>
              </p>
            ))}
          </div>
        )}

        {/* Claim Action Button */}
        <button
          onClick={() => onInitiateClaim(sourceReport, candidate)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-all"
        >
          <ShieldCheck size={17} />
          Initiate Item Return / Claim Pass
        </button>
      </div>
    </div>
  )
}

function FactorBar({ label, weight, score }: { label: string; weight: string; score: number }) {
  const percentage = Math.round(score * 100)
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-foreground">
          {label} <span className="text-muted-foreground text-[11px]">({weight})</span>
        </span>
        <span className="font-mono font-bold text-foreground">{percentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/* ==============================================================================
   REPORT DETAILS MODAL
   ============================================================================== */
function ReportDetailsModal({
  report,
  onClose,
  onTriggerMatch,
  onDelete,
}: {
  report: Report
  onClose: () => void
  onTriggerMatch: (r: Report) => void
  onDelete: (r: Report) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopyId = () => {
    navigator.clipboard.writeText(report.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formattedDate = new Date(report.date_time).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = new Date(report.date_time).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedCreated = new Date(report.created_at).toLocaleString()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close details"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 pr-8">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm shadow-sm ${
              report.type === 'LOST'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {report.type === 'LOST' ? <Search size={20} /> : <Package size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  report.type === 'LOST'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {report.type} ITEM REPORT
              </span>
              <span className="text-xs text-muted-foreground">ID: {report.id.slice(0, 8)}...</span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-foreground">
              {report.category}
              {report.color ? <span className="font-normal text-muted-foreground"> · {report.color}</span> : ''}
            </h2>
          </div>
        </div>

        {/* Structured Details Grid */}
        <div className="mt-5 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2.5 sm:gap-3">
          <div className="rounded-xl border border-border bg-background p-3.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Category
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Tag size={14} className="text-primary" />
              {report.category}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background p-3.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Color Descriptor
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Palette size={14} className="text-primary" />
              {report.color || <span className="text-muted-foreground italic font-normal">None specified</span>}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background p-3.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Campus Location
            </span>
            <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1.5">
              <MapPin size={14} className="text-primary" />
              {report.location}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background p-3.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Incident Date & Time
            </span>
            <div className="mt-1 text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar size={14} className="text-primary shrink-0" />
              <div className="truncate">
                <span>{formattedDate}</span>
                <span className="ml-1 text-muted-foreground">({formattedTime})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Full Description Section */}
        <div className="mt-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Full Submitted Description
          </label>
          <div className="rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {report.description}
          </div>
        </div>

        {/* System & Metadata Footer */}
        <div className="mt-4 rounded-xl bg-muted/50 p-3.5 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Full Report UUID:</span>
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted transition-all border border-border"
              title="Copy UUID to clipboard"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy UUID'}</span>
            </button>
          </div>
          <p className="font-mono text-[11px] break-all select-all text-muted-foreground/90">
            {report.id}
          </p>

          <div className="flex flex-wrap items-center justify-between pt-1 border-t border-border/60 text-[11px]">
            <span>Submitted: {formattedCreated}</span>
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Active in Supabase Database
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-border pt-4">
          <button
            onClick={() => {
              onClose()
              onDelete(report)
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 active:scale-95 transition-all text-center"
          >
            <Trash2 size={15} />
            Delete Report
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted active:scale-95 transition-all text-center"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose()
                onTriggerMatch(report)
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 active:scale-95 transition-all text-center"
            >
              <Sparkles size={14} />
              Run AI Match
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==============================================================================
   DELETE CONFIRMATION MODAL
   ============================================================================== */
function DeleteConfirmationModal({
  report,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  report: Report
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-white p-5 sm:p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
          <Trash2 size={24} />
        </div>

        <h3 className="mt-4 text-lg font-bold text-foreground">Delete Report?</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          Are you sure you want to permanently delete this report? This will remove it from the Supabase PostgreSQL database and eliminate it from AI candidate matching calculations.
        </p>

        {/* Report Preview */}
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3.5 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                report.type === 'LOST'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {report.type}
            </span>
            <span className="font-bold text-foreground">
              {report.category} {report.color ? `· ${report.color}` : ''}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground flex items-center gap-1">
            <MapPin size={11} /> {report.location} · {new Date(report.date_time).toLocaleDateString()}
          </p>
          <p className="mt-1 line-clamp-2 text-muted-foreground italic">
            &quot;{report.description}&quot;
          </p>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="w-full sm:w-auto rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50 text-center"
          >
            {isDeleting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={14} />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ==============================================================================
   CAMPUS CLAIM & HANDOVER PASS MODAL
   ============================================================================== */
function ClaimHandoverModal({
  sourceReport,
  candidate,
  onClose,
}: {
  sourceReport: Report
  candidate: CandidateMatch
  onClose: () => void
}) {
  const [verificationNote, setVerificationNote] = useState('')
  const [handoverStation, setHandoverStation] = useState('Central Campus Security Desk (Main Gate)')
  const [generatedPass, setGeneratedPass] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGeneratePass = (e: React.FormEvent) => {
    e.preventDefault()
    const randomCode = `PASS-${Math.floor(1000 + Math.random() * 9000)}`
    setGeneratedPass(randomCode)
  }

  const handleCopyPass = () => {
    if (generatedPass) {
      navigator.clipboard.writeText(generatedPass)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-white p-4 sm:p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>

        {!generatedPass ? (
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Initiate Item Handover</h3>
                <p className="text-xs text-muted-foreground">Campus Security & Claim Verification Pass</p>
              </div>
            </div>

            {/* Matched Summary */}
            <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3.5 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Matched Item:</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {candidate.overall_score}% Compatibility Match
                </span>
              </div>
              <p className="text-muted-foreground">
                <strong className="text-foreground">{candidate.candidate_report.category}</strong> ({candidate.candidate_report.color || 'No color specified'}) reported at {candidate.candidate_report.location}
              </p>
            </div>

            <form onSubmit={handleGeneratePass} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Private Ownership Verification Detail *
                </label>
                <textarea
                  required
                  rows={2}
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="State an unmentioned identifying detail (e.g. scratch, lock screen wallpaper, keychain detail, or contents inside)..."
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-xs focus:border-primary focus:bg-white"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Campus staff/security verifies this detail before handing over the item.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Designated Safe Handover Station *
                </label>
                <select
                  value={handoverStation}
                  onChange={(e) => setHandoverStation(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-xs font-medium focus:border-primary focus:bg-white"
                >
                  <option value="Central Campus Security Desk (Main Gate)">
                    🏢 Central Campus Security Desk (Main Gate)
                  </option>
                  <option value="University Library 1st Floor Helpdesk">
                    📚 University Library 1st Floor Helpdesk
                  </option>
                  <option value="Student Affairs Office (Admin Block, Room 102)">
                    🏛️ Student Affairs Office (Admin Block, Room 102)
                  </option>
                </select>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted active:scale-95 transition-all text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 active:scale-95 transition-all text-center"
                >
                  <ShieldCheck size={14} />
                  Issue Campus Handover Pass
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-2 space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Official Campus Claim Pass Issued
              </span>
              <h3 className="mt-2 text-xl font-bold text-foreground">Handover Pass Authorized</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Present this verification code at the campus handover desk to claim your item.
              </p>
            </div>

            {/* Pass Code Card */}
            <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary/[0.04] p-5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Handover Verification Code
              </span>
              <div className="mt-1 flex items-center justify-center gap-3">
                <span className="font-mono text-3xl font-black tracking-wider text-foreground">
                  {generatedPass}
                </span>
                <button
                  onClick={handleCopyPass}
                  className="rounded-lg border border-border bg-white p-2 text-muted-foreground hover:text-foreground shadow-xs"
                  title="Copy pass code"
                >
                  {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                📍 Location: <strong className="text-foreground">{handoverStation}</strong>
              </p>
            </div>

            <div className="rounded-xl bg-muted/60 p-3 text-left text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Next Steps for Demo / Pickup:</p>
              <p>• Visit {handoverStation} with your student ID card.</p>
              <p>• Provide pass code <strong>{generatedPass}</strong> and state your verification detail.</p>
              <p>• Campus staff will verify against the log and close both reports.</p>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-primary py-3 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-95 active:scale-95 transition-all text-center"
            >
              Done & Return to Match Center
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
