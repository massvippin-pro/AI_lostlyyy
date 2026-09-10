import { apiRequest } from './client'
import type { MatchResponse } from '@/types/lost-found'

export async function runMatching(reportId: string, limit: number = 10): Promise<MatchResponse> {
  return apiRequest<MatchResponse>('/match', {
    method: 'POST',
    body: JSON.stringify({
      report_id: reportId,
      limit,
    }),
  })
}

export async function getMatchesForReport(reportId: string, limit: number = 10): Promise<MatchResponse> {
  return apiRequest<MatchResponse>(`/matches/${reportId}?limit=${limit}`)
}
