export type ReportType = 'LOST' | 'FOUND'
export type MatchDecision = 'MATCH' | 'REVIEW' | 'NO_RELIABLE_MATCH'

export type Report = {
  id: string
  type: ReportType
  category: string
  color: string | null
  location: string
  date_time: string
  description: string
  photo_url?: string | null
  created_at: string
  updated_at: string
}

export type FactorScores = {
  category: number
  color: number
  location: number
  time: number
  description: number
}

export type ExplanationDetail = {
  summary: string
  reasons: string[]
  negative_factors: string[]
  notes: string[]
}

export type CandidateMatch = {
  candidate_report: Report
  overall_score: number
  decision: MatchDecision
  factors: FactorScores
  explanation: ExplanationDetail
}

export type MatchResponse = {
  source_report: Report
  candidates_evaluated: number
  total_matches_returned: number
  matches: CandidateMatch[]
}

export type CreateReportInput = {
  type: ReportType
  category: string
  color?: string | null
  location: string
  date_time: string
  description: string
}

export type ApiEnvelope<T> = {
  success: boolean
  data: T
  error: {
    code: string
    message: string
    details?: any
  } | null
}
