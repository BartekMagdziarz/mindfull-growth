import { beforeEach, describe, expect, it } from 'vitest'
import { assessmentsDexieRepository } from '@/repositories/assessmentsDexieRepository'
import { connectTestDatabase, getTestUserId } from '@/test/testDatabase'
import { connectUserDatabase, getUserDatabase } from '@/services/userDatabase.service'

describe('assessmentsDexieRepository', () => {
  beforeEach(async () => {
    const db = await connectTestDatabase()
    await db.assessmentAttempts.clear()
    await db.assessmentResponses.clear()
  })

  it('starts attempts and upserts responses while keeping response count in sync', async () => {
    const attempt = await assessmentsDexieRepository.startAttempt({
      assessmentId: 'ipip-bfm-50',
      instrumentVersion: '1.0.0',
      language: 'en',
      scoringKeyVersion: '1.0.0',
      missingDataPolicyVersion: 'bfm50-80pct-impute',
      totalItems: 50,
    })

    expect(attempt.status).toBe('in-progress')
    expect(attempt.responseCount).toBe(0)

    await assessmentsDexieRepository.saveResponse({
      attemptId: attempt.id,
      assessmentId: 'ipip-bfm-50',
      itemId: 'bfm50_001',
      responseValue: 2,
      reverseFlagAtTime: false,
      scoringKeyVersion: '1.0.0',
    })

    await assessmentsDexieRepository.saveResponse({
      attemptId: attempt.id,
      assessmentId: 'ipip-bfm-50',
      itemId: 'bfm50_001',
      responseValue: 4,
      reverseFlagAtTime: false,
      scoringKeyVersion: '1.0.0',
    })

    const responses = await assessmentsDexieRepository.getResponsesByAttempt(attempt.id)
    const refreshedAttempt = await assessmentsDexieRepository.getAttemptById(attempt.id)

    expect(responses).toHaveLength(1)
    expect(responses[0].responseValue).toBe(4)
    expect(refreshedAttempt?.responseCount).toBe(1)
  })

  it('supports bulk save and completed attempt history lookup', async () => {
    const first = await assessmentsDexieRepository.startAttempt({
      assessmentId: 'hexaco-60',
      instrumentVersion: '1.0.0',
      language: 'en',
      scoringKeyVersion: '1.0.0',
      missingDataPolicyVersion: 'hexaco60-80pct-impute',
      totalItems: 60,
    })

    await assessmentsDexieRepository.bulkSaveResponses([
      {
        attemptId: first.id,
        assessmentId: 'hexaco-60',
        itemId: 'hexaco60_001',
        responseValue: 3,
        reverseFlagAtTime: false,
        scoringKeyVersion: '1.0.0',
      },
      {
        attemptId: first.id,
        assessmentId: 'hexaco-60',
        itemId: 'hexaco60_002',
        responseValue: 4,
        reverseFlagAtTime: false,
        scoringKeyVersion: '1.0.0',
      },
    ])

    const firstCompleted = await assessmentsDexieRepository.completeAttempt(first.id, {
      computedScales: [
        {
          scaleId: 'honestyHumility',
          labelKey: 'assessments.hexaco60.scales.honestyHumility',
          answeredCount: 10,
          itemCount: 10,
          rawMean: 3.4,
          normalizedMean: 3.4,
          band: 'medium',
        },
      ],
      overallSummary: {
        completedScaleCount: 1,
        totalScaleCount: 1,
        meanOfMeans: 3.4,
      },
      scoringComputationMetadata: {
        centeredScoringEnabled: false,
        completedWithMissingData: false,
        missingItemCount: 0,
        scoringTimestamp: new Date().toISOString(),
      },
      retakeEligibleAt: new Date('2026-03-01T00:00:00.000Z').toISOString(),
    })

    const second = await assessmentsDexieRepository.startAttempt({
      assessmentId: 'hexaco-60',
      instrumentVersion: '1.0.0',
      language: 'en',
      scoringKeyVersion: '1.0.0',
      missingDataPolicyVersion: 'hexaco60-80pct-impute',
      totalItems: 60,
    })

    const secondCompleted = await assessmentsDexieRepository.completeAttempt(second.id, {
      computedScales: [
        {
          scaleId: 'honestyHumility',
          labelKey: 'assessments.hexaco60.scales.honestyHumility',
          answeredCount: 10,
          itemCount: 10,
          rawMean: 3.8,
          normalizedMean: 3.8,
          band: 'high',
        },
      ],
      overallSummary: {
        completedScaleCount: 1,
        totalScaleCount: 1,
        meanOfMeans: 3.8,
      },
      scoringComputationMetadata: {
        centeredScoringEnabled: false,
        completedWithMissingData: false,
        missingItemCount: 0,
        scoringTimestamp: new Date().toISOString(),
      },
      retakeEligibleAt: new Date('2026-03-15T00:00:00.000Z').toISOString(),
    })

    const latest = await assessmentsDexieRepository.getLatestCompletedAttempt('hexaco-60')
    const previous = await assessmentsDexieRepository.getPreviousCompletedAttempt(
      'hexaco-60',
      secondCompleted.completedAt,
    )

    expect(latest?.id).toBe(secondCompleted.id)
    expect(previous?.id).toBe(firstCompleted.id)
    expect(latest?.retakeEligibleAt).toBeDefined()
  })

  it('keeps existing user data readable when reopening with v24 assessment tables', async () => {
    const userId = getTestUserId()
    await connectUserDatabase(userId)

    const db = getUserDatabase()
    await db.journalEntries.put({
      id: 'legacy-journal-entry',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      body: 'Existing entry before reopening',
    })

    await connectUserDatabase(`${userId}-reopen-cycle`)
    await connectUserDatabase(userId)

    const reopened = getUserDatabase()
    const entry = await reopened.journalEntries.get('legacy-journal-entry')
    const attemptsCount = await reopened.assessmentAttempts.count()
    const responsesCount = await reopened.assessmentResponses.count()

    expect(entry?.body).toBe('Existing entry before reopening')
    expect(attemptsCount).toBeGreaterThanOrEqual(0)
    expect(responsesCount).toBeGreaterThanOrEqual(0)
  })
})
