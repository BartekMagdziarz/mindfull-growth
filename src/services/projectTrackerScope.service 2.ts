import type { Commitment, Project } from '@/domain/planning'
import { toLocalISODateString } from '@/utils/periodUtils'

interface WeeklyScopeInput {
  projects: Project[]
  commitments: Commitment[]
  weeklyPlanId?: string
  startDate: string
  endDate: string
}

interface MonthlyScopeInput {
  projects: Project[]
  commitments: Commitment[]
  monthlyPlanId?: string
  startDate: string
  endDate: string
}

function resolveLinkedProjectIds(
  commitments: Commitment[],
  matcher: (commitment: Commitment) => boolean
): Set<string> {
  const projectIds = new Set<string>()
  for (const commitment of commitments) {
    if (!commitment.projectId) continue
    if (!matcher(commitment)) continue
    projectIds.add(commitment.projectId)
  }
  return projectIds
}

export function resolveWeeklyTrackerProjects(input: WeeklyScopeInput): Project[] {
  const focusedProjectIds = new Set<string>()
  if (input.weeklyPlanId) {
    for (const project of input.projects) {
      if ((project.focusWeekIds ?? []).includes(input.weeklyPlanId)) {
        focusedProjectIds.add(project.id)
      }
    }
  }

  const linkedProjectIds = resolveLinkedProjectIds(input.commitments, (commitment) => {
    if (commitment.periodType !== 'weekly') return false
    if (commitment.weeklyPlanId && input.weeklyPlanId) {
      if (commitment.weeklyPlanId === input.weeklyPlanId) return true
    }
    return commitment.startDate === input.startDate && commitment.endDate === input.endDate
  })

  const allowedProjectIds = new Set<string>([...focusedProjectIds, ...linkedProjectIds])
  return input.projects.filter((project) => allowedProjectIds.has(project.id))
}

export function resolveMonthlyTrackerProjects(input: MonthlyScopeInput): Project[] {
  const focusedProjectIds = new Set<string>()
  if (input.monthlyPlanId) {
    for (const project of input.projects) {
      if (
        (project.focusMonthIds ?? []).includes(input.monthlyPlanId) ||
        (project.monthIds ?? []).includes(input.monthlyPlanId)
      ) {
        focusedProjectIds.add(project.id)
      }
    }
  }

  const linkedProjectIds = resolveLinkedProjectIds(input.commitments, (commitment) => {
    if (commitment.periodType !== 'monthly') return false
    if (commitment.monthlyPlanId && input.monthlyPlanId) {
      if (commitment.monthlyPlanId === input.monthlyPlanId) return true
    }
    return commitment.startDate === input.startDate && commitment.endDate === input.endDate
  })

  const allowedProjectIds = new Set<string>([...focusedProjectIds, ...linkedProjectIds])
  return input.projects.filter((project) => allowedProjectIds.has(project.id))
}

export function resolveEntryDateWithinPeriod(
  startDate: string,
  endDate: string,
  referenceDate: Date = new Date()
): string {
  const today = toLocalISODateString(referenceDate)
  if (today >= startDate && today <= endDate) {
    return today
  }
  return endDate
}
