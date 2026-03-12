import { connectTestDatabase } from '@/test/testDatabase'

export async function resetPlanningTestData() {
  const db = await connectTestDatabase()
  await db.periodObjectReflections.clear()
  await db.periodReflections.clear()
  await db.dailyMeasurementEntries.clear()
  await db.initiativePlanStates.clear()
  await db.measurementDayAssignments.clear()
  await db.measurementWeekStates.clear()
  await db.measurementMonthStates.clear()
  await db.goalMonthStates.clear()
  await db.weekPlans.clear()
  await db.monthPlans.clear()
  await db.keyResults.clear()
  await db.goals.clear()
  await db.habits.clear()
  await db.trackers.clear()
  await db.initiatives.clear()
  await db.priorities.clear()
  await db.lifeAreas.clear()
  return db
}
