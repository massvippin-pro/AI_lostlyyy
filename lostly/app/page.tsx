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
    date_time: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:MM
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[11px] bg-primary text-primary-foreground shadow-sm">
              <Package size={19} strokeWidth={2.4} />
            </div>
            <div>
              <span className="text-[17px] font-bold tracking-tight text-foreground">Lostly</span>
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                AI Matcher
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id as View)}
                className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all ${
                  view === id
                    ? 'bg-white text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={15} className="mr-2 inline" />
                {label}
                {id === 'reports' && reports.length > 0 && (
                  <span className="ml-2 rounded-full bg-muted px-1.5 py-0.2 text-[11px] font-semibold">
                    {reports.length}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {/* Live API status */}
            <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              API Connected
            </div>

            <button
              onClick={() => goReport('LOST')}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95"
            >
              <Plus size={15} />
              Report Item
            </button>

            <button
              aria-label="Menu"
              onClick={() => setMobileNav(!mobileNav)}
              className="ml-1 rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"
            >
              {mobileNav ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {mobileNav && (
          <nav className="border-t border-border bg-white p-3 md:hidden">
            {nav.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setView(id as View)
                  setMobileNav(false)
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-muted-foreground hover:bg-muted"
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-[1280px] px-5 py-8 pb-24 lg:px-8 lg:py-10">
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
            matchResponse={activeMatchResponse}
            selectedCandidate={selectedCandidate}
            isLoading={isMatchingLoading}
            error={matchError}
            onSelectCandidate={setSelectedCandidate}
            onBack={() => setView('home')}
            onNavigateReport={() => goReport('LOST')}
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
      {/* Hero Greeting */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            College Lost-and-Found AI System
          </span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Campus Matching Center
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Our explainable heuristic agent evaluates lost and found reports using Category (20%), Color (15%), Location (20%), Time (20%), and NLP Description (25%).
          </p>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={() => onReport('LOST')}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
          >
            <Search size={16} />
            I Lost Something
          </button>
          <button
            onClick={() => onReport('FOUND')}
            className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted"
          >
            <Package size={16} />
            I Found Something
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Total Active Reports</span>
            <FileText size={16} className="text-primary" />
          </div>
          <p className="mt-3 text-3xl font-bold text-foreground">{isLoading ? '...' : reports.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Synced in real-time with Supabase</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Lost vs Found</span>
            <Layers size={16} className="text-primary" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600">{lostCount}</span>
            <span className="text-xs text-muted-foreground">Lost</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-3xl font-bold text-emerald-600">{foundCount}</span>
            <span className="text-xs text-muted-foreground">Found</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Candidate pools cross-evaluated</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>AI Matching Status</span>
            <Sparkles size={16} className="text-primary" />
          </div>
          <p className="mt-3 text-lg font-bold text-emerald-600">
            {topMatch ? `Best: ${topMatch.overall_score}% (${topMatch.decision})` : 'Engine Ready'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {activeMatch ? `${activeMatch.candidates_evaluated} candidates evaluated` : 'Select any report to run matching'}
          </p>
        </div>
      </div>

      {/* Active Match Banner if present */}
      {topMatch && activeMatch && (
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/20 bg-white text-xl font-bold text-primary shadow-sm">
                {topMatch.overall_score}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                    {topMatch.decision}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Matched against {activeMatch.source_report.category} ({activeMatch.source_report.type})
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-foreground">
                  {topMatch.candidate_report.category} in {topMatch.candidate_report.location}
                </h3>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {topMatch.explanation.summary}
                </p>
              </div>
            </div>

            <button
              onClick={() => onView('matches')}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-95"
            >
              Examine Match Decomposition <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Recent Reports Section */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Recent Campus Reports</h2>
            <p className="text-xs text-muted-foreground">Select any item to trigger the heuristic matching agent</p>
          </div>
          <button
            onClick={() => onView('reports')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View all ({reports.length})
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading reports from database...</div>
          ) : reports.length === 0 ? (
            <div className="p-10 text-center">
              <Package size={32} className="mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm font-semibold">No reports filed yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Get started by filing a lost or found report.</p>
              <button
                onClick={() => onReport('LOST')}
                className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Create First Report
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reports.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:px-6"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        r.type === 'LOST'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {r.type}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {r.category} {r.color ? `· ${r.color}` : ''}
                      </h4>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {r.location}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {new Date(r.date_time).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/80">
                        {r.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewDetails(r)}
                      className="flex items-center gap-1 rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-sm"
                      title="View full submitted report details"
                    >
                      <Eye size={13} />
                      Details
                    </button>
                    <button
                      onClick={() => onTriggerMatch(r)}
                      className="flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all"
                    >
                      <Sparkles size={13} />
                      Run AI Match
                    </button>
                    <button
                      onClick={() => onDelete(r)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete report"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 disabled:opacity-70"
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
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={15} /> Back to dashboard
        </button>

        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => onReport('LOST')}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
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
        <div className="flex rounded-xl border border-border bg-white p-1 shadow-sm">
          {(['ALL', 'LOST', 'FOUND'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                filterType === t
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'ALL' ? 'All' : t === 'LOST' ? 'Lost Items' : 'Found Items'}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search category, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white pl-9 pr-3 py-1.5 text-xs focus:border-primary sm:w-64"
          />
        </div>
      </div>

      {/* Table / List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No matching reports found.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((r) => (
              <div key={r.id} className="p-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        r.type === 'LOST'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {r.type}
                    </span>
                    <h3 className="text-sm font-bold text-foreground">
                      {r.category} {r.color ? `· ${r.color}` : ''}
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground">{r.description}</p>

                  <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {r.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {new Date(r.date_time).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onViewDetails(r)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-all shadow-sm"
                    title="View full submitted details"
                  >
                    <Eye size={13} />
                    View Details
                  </button>
                  <button
                    onClick={() => onTriggerMatch(r)}
                    className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <Sparkles size={13} />
                    Run AI Match
                  </button>
                  <button
                    onClick={() => onDelete(r)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Delete report"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ==============================================================================
   AI MATCHES VIEW (EXPLAINABILITY ENGINE)
   ============================================================================== */
function MatchesView({
  matchResponse,
  selectedCandidate,
  isLoading,
  error,
  onSelectCandidate,
  onBack,
  onNavigateReport,
}: {
  matchResponse: MatchResponse | null
  selectedCandidate: CandidateMatch | null
  isLoading: boolean
  error: string | null
  onSelectCandidate: (c: CandidateMatch) => void
  onBack: () => void
  onNavigateReport: () => void
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
      <div className="mx-auto max-w-xl py-12 text-center">
        <Sparkles size={36} className="mx-auto text-primary" />
        <h2 className="mt-3 text-lg font-bold">No Active Match Session</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Select an item from the dashboard or file a report to run the AI matching engine.
        </p>
        <button
          onClick={onNavigateReport}
          className="mt-6 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          File a Report
        </button>
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
            <CandidateDetailCard candidate={selectedCandidate} />
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
   CANDIDATE EXPLANATION DETAIL CARD
   ============================================================================== */
function CandidateDetailCard({ candidate }: { candidate: CandidateMatch }) {
  const { candidate_report, overall_score, decision, factors, explanation } = candidate
  const isMatch = decision === 'MATCH'
  const isReview = decision === 'REVIEW'

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-2.5 py-1 text-xs font-bold ${
                isMatch
                  ? 'bg-emerald-100 text-emerald-800'
                  : isReview
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {decision === 'MATCH' ? 'HIGH CONFIDENCE MATCH' : decision === 'REVIEW' ? 'MANUAL REVIEW RECOMMENDED' : 'LOW COMPATIBILITY'}
            </span>
          </div>

          <h3 className="mt-2 text-xl font-bold text-foreground">
            {candidate_report.category} {candidate_report.color ? `· ${candidate_report.color}` : ''}
          </h3>
          <p className="text-xs text-muted-foreground">
            Location: {candidate_report.location} · {new Date(candidate_report.date_time).toLocaleString()}
          </p>
        </div>

        <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <span className="text-2xl font-black">{overall_score}</span>
          <span className="text-[9px] uppercase tracking-wider opacity-80">/ 100</span>
        </div>
      </div>

      {/* AI Summary Banner */}
      <div className="rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-foreground">
        <span className="font-semibold text-primary block mb-0.5">AI Agent Assessment:</span>
        {explanation.summary}
      </div>

      {/* Factor-by-Factor Sub-Scores */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Heuristic Factor Breakdown
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
        <div className="space-y-1.5">
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

      {/* Negative Factors / Penalties */}
      {explanation.negative_factors && explanation.negative_factors.length > 0 && (
        <div className="space-y-1.5">
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

      {/* Notes (e.g. missing color neutral baseline) */}
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

      {/* Candidate Description */}
      <div className="border-t border-border pt-4">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Report Description
        </span>
        <p className="mt-1 text-xs text-foreground leading-relaxed">
          {candidate_report.description}
        </p>
      </div>

      {/* Claim Action */}
      <button
        onClick={() => alert(`Connection request initiated for ${candidate_report.category} at ${candidate_report.location}!`)}
        className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-all"
      >
        Initiate Item Return / Claim
      </button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-2xl"
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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
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
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <button
            onClick={() => {
              onClose()
              onDelete(report)
            }}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={15} />
            Delete Report
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-border bg-white px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose()
                onTriggerMatch(report)
              }}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-2xl"
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
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="rounded-xl border border-border bg-white px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
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
