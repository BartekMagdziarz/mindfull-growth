import type {
  AssessmentAttempt,
  AssessmentId,
  AssessmentResponse,
  CompleteAssessmentAttemptPayload,
  SaveAssessmentResponsePayload,
  StartAssessmentAttemptPayload,
} from '@/domain/assessments'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { AssessmentsRepository } from './assessmentsRepository'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

class AssessmentsDexieRepository implements AssessmentsRepository {
  private get db() {
    return getUserDatabase()
  }

  async startAttempt(data: StartAssessmentAttemptPayload): Promise<AssessmentAttempt> {
    try {
      const now = new Date().toISOString()
      const attempt: AssessmentAttempt = {
        id: crypto.randomUUID(),
        assessmentId: data.assessmentId,
        instrumentVersion: data.instrumentVersion,
        language: data.language,
        startedAt: now,
        status: 'in-progress',
        scoringKeyVersion: data.scoringKeyVersion,
        missingDataPolicyVersion: data.missingDataPolicyVersion,
        responseCount: 0,
        totalItems: data.totalItems,
        createdAt: now,
        updatedAt: now,
      }
      await this.db.assessmentAttempts.add(toPlain(attempt))
      return attempt
    } catch (error) {
      console.error('Failed to start assessment attempt:', error)
      throw new Error('Failed to start assessment attempt')
    }
  }

  async getAttemptById(id: string): Promise<AssessmentAttempt | undefined> {
    try {
      return await this.db.assessmentAttempts.get(id)
    } catch (error) {
      console.error(`Failed to get assessment attempt ${id}:`, error)
      throw new Error(`Failed to get assessment attempt ${id}`)
    }
  }

  async getInProgressAttempt(assessmentId: AssessmentId): Promise<AssessmentAttempt | undefined> {
    try {
      const attempts = await this.db.assessmentAttempts
        .where('assessmentId')
        .equals(assessmentId)
        .toArray()

      return attempts
        .filter((attempt) => attempt.status === 'in-progress')
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]
    } catch (error) {
      console.error(`Failed to get in-progress attempt for ${assessmentId}:`, error)
      throw new Error(`Failed to get in-progress attempt for ${assessmentId}`)
    }
  }

  async getAttemptsByAssessment(assessmentId: AssessmentId): Promise<AssessmentAttempt[]> {
    try {
      const attempts = await this.db.assessmentAttempts
        .where('assessmentId')
        .equals(assessmentId)
        .toArray()
      return attempts.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    } catch (error) {
      console.error(`Failed to get attempts for assessment ${assessmentId}:`, error)
      throw new Error(`Failed to get attempts for assessment ${assessmentId}`)
    }
  }

  async getLatestCompletedAttempt(assessmentId: AssessmentId): Promise<AssessmentAttempt | undefined> {
    try {
      const attempts = await this.getAttemptsByAssessment(assessmentId)
      return attempts
        .filter((attempt) => attempt.status === 'completed' && Boolean(attempt.completedAt))
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0]
    } catch (error) {
      console.error(`Failed to get latest completed attempt for ${assessmentId}:`, error)
      throw new Error(`Failed to get latest completed attempt for ${assessmentId}`)
    }
  }

  async getPreviousCompletedAttempt(
    assessmentId: AssessmentId,
    beforeCompletedAt?: string,
  ): Promise<AssessmentAttempt | undefined> {
    try {
      const attempts = (await this.getAttemptsByAssessment(assessmentId))
        .filter((attempt) => attempt.status === 'completed' && Boolean(attempt.completedAt))
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))

      if (!beforeCompletedAt) {
        return attempts[1]
      }

      return attempts.find((attempt) => (attempt.completedAt ?? '') < beforeCompletedAt)
    } catch (error) {
      console.error(`Failed to get previous completed attempt for ${assessmentId}:`, error)
      throw new Error(`Failed to get previous completed attempt for ${assessmentId}`)
    }
  }

  async saveResponse(data: SaveAssessmentResponsePayload): Promise<AssessmentResponse> {
    try {
      const now = new Date().toISOString()
      const existing = await this.db.assessmentResponses
        .where('[attemptId+itemId]')
        .equals([data.attemptId, data.itemId])
        .first()

      let response: AssessmentResponse
      if (existing) {
        response = {
          ...existing,
          responseValue: data.responseValue,
          reverseFlagAtTime: data.reverseFlagAtTime,
          scoringKeyVersion: data.scoringKeyVersion,
          answeredAt: now,
          updatedAt: now,
        }
        await this.db.assessmentResponses.put(toPlain(response))
      } else {
        response = {
          id: crypto.randomUUID(),
          attemptId: data.attemptId,
          assessmentId: data.assessmentId,
          itemId: data.itemId,
          responseValue: data.responseValue,
          reverseFlagAtTime: data.reverseFlagAtTime,
          scoringKeyVersion: data.scoringKeyVersion,
          answeredAt: now,
          createdAt: now,
          updatedAt: now,
        }
        await this.db.assessmentResponses.add(toPlain(response))
      }

      const responseCount = await this.db.assessmentResponses
        .where('attemptId')
        .equals(data.attemptId)
        .count()

      await this.db.assessmentAttempts.update(data.attemptId, {
        responseCount,
        updatedAt: now,
      })

      return response
    } catch (error) {
      console.error('Failed to save assessment response:', error)
      throw new Error('Failed to save assessment response')
    }
  }

  async bulkSaveResponses(data: SaveAssessmentResponsePayload[]): Promise<AssessmentResponse[]> {
    if (data.length === 0) return []

    try {
      const saved: AssessmentResponse[] = []
      await this.db.transaction(
        'rw',
        this.db.assessmentAttempts,
        this.db.assessmentResponses,
        async () => {
          for (const payload of data) {
            const result = await this.saveResponse(payload)
            saved.push(result)
          }
        },
      )
      return saved
    } catch (error) {
      console.error('Failed to bulk save assessment responses:', error)
      throw new Error('Failed to bulk save assessment responses')
    }
  }

  async getResponsesByAttempt(attemptId: string): Promise<AssessmentResponse[]> {
    try {
      return await this.db.assessmentResponses.where('attemptId').equals(attemptId).toArray()
    } catch (error) {
      console.error(`Failed to load responses for attempt ${attemptId}:`, error)
      throw new Error(`Failed to load responses for attempt ${attemptId}`)
    }
  }

  async completeAttempt(
    id: string,
    data: CompleteAssessmentAttemptPayload,
  ): Promise<AssessmentAttempt> {
    try {
      const existing = await this.db.assessmentAttempts.get(id)
      if (!existing) {
        throw new Error(`Assessment attempt ${id} not found`)
      }

      const now = new Date().toISOString()
      const updated: AssessmentAttempt = {
        ...existing,
        status: 'completed',
        completedAt: now,
        computedScales: data.computedScales,
        overallSummary: data.overallSummary,
        scoringComputationMetadata: data.scoringComputationMetadata,
        retakeEligibleAt: data.retakeEligibleAt,
        updatedAt: now,
      }

      await this.db.assessmentAttempts.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to complete assessment attempt ${id}:`, error)
      throw new Error(`Failed to complete assessment attempt ${id}`)
    }
  }

  async abandonAttempt(id: string): Promise<AssessmentAttempt> {
    try {
      const existing = await this.db.assessmentAttempts.get(id)
      if (!existing) {
        throw new Error(`Assessment attempt ${id} not found`)
      }

      const updated: AssessmentAttempt = {
        ...existing,
        status: 'abandoned',
        updatedAt: new Date().toISOString(),
      }

      await this.db.assessmentAttempts.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to abandon assessment attempt ${id}:`, error)
      throw new Error(`Failed to abandon assessment attempt ${id}`)
    }
  }
}

export const assessmentsDexieRepository = new AssessmentsDexieRepository()
