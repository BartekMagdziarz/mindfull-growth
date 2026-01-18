/**
 * Mock data seeder for journal entries and emotion logs.
 * Creates sample data for Jan 12-18, 2026.
 *
 * Usage: Import and call seedMockData() in browser console or mount it temporarily.
 */

import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'
import { peopleTagDexieRepository, contextTagDexieRepository } from '@/repositories/tagDexieRepository'

// Emotion IDs from emotions.json (selected for variety)
const EMOTIONS = {
  // High energy, high pleasantness
  happy: '1ccbaa61-4fb4-4796-a0fb-1b8eebdca683',
  excited: '05cc216c-3955-45f7-9725-94c07bfbfa8b',
  motivated: 'd9e2dced-1c4f-40d5-b9df-ca5854f2ec81',
  inspired: 'bea43562-7d37-492f-b47c-7eabe34500cf',
  proud: '94d41ebb-803e-49ac-8a6d-f878cb858313',
  cheerful: '77302c04-1d79-4c9e-b06c-32d137e84f0b',
  hopeful: 'b8d481ce-a4a6-48e7-96cf-43fba4ac0e09',
  enthusiastic: '0f340067-3f21-4656-8fb6-d3301969a530',

  // Low energy, high pleasantness
  calm: 'c0becc7b-c6d6-4821-948f-0f87d47b93fa',
  content: 'c4434366-2a40-462a-b011-0d27eb1db2cc',
  peaceful: 'e542a8b5-1c01-4d0c-a58a-b3fd47dc5677',
  grateful: 'd03da266-0aac-48cc-b441-4f5dc5a90c15',
  relaxed: 'c149fa9c-1ddd-49d7-8d3f-45fd7fb62918',
  satisfied: '16cfa1f6-4b31-416d-a6b7-8b6b1973baf8',

  // High energy, low pleasantness
  stressed: '3b36a8ec-d2f3-4958-9055-b345fface3db',
  anxious: '4936b2f6-b340-480e-9260-510abf9af9f1',
  frustrated: '44b7d631-e945-4ff3-9b11-a5fe9837d47b',
  nervous: '0781b282-3624-4101-9470-4aeb87c9396c',
  worried: '75ab24d3-c9fa-4ea3-8f7d-bde4db406f44',

  // Low energy, low pleasantness
  tired: 'e0e862c8-8407-4d31-94cd-1a4852625c0d',
  sad: 'b4bf2b93-9f56-494f-a2ca-ce47e830442f',
  bored: '03d0a7d4-a669-4fc1-8acb-aca73a49f00c',
  disappointed: '71f5407c-2490-4cb0-9bac-bbd0cd083b60',
}

// Journal entry templates
const journalEntries = [
  {
    date: '2026-01-12',
    title: 'New year reflections',
    body: `The second week of January is starting and I'm feeling pretty optimistic about the year ahead. I spent the morning reviewing my goals for the year and breaking them down into quarterly objectives.

I'm particularly excited about the health goals I've set. I want to be more consistent with my morning routine and exercise. Today I managed to wake up at 6:30 AM and did a 20-minute yoga session before breakfast.

Work has been busy but manageable. We're starting a new project next week and I'm looking forward to the challenges it will bring.`,
    emotionIds: [EMOTIONS.hopeful, EMOTIONS.motivated, EMOTIONS.calm],
  },
  {
    date: '2026-01-13',
    title: 'Monday blues conquered',
    body: `Despite it being Monday, I had a surprisingly productive day. The morning meeting went well and I got positive feedback on my proposal.

I noticed I was feeling a bit anxious before the presentation, but once I started speaking, the nerves melted away. This is a pattern I've observed before - the anticipation is always worse than the actual event.

Had a nice lunch with a colleague. We talked about our weekend plans and it was refreshing to have a non-work conversation.`,
    emotionIds: [EMOTIONS.proud, EMOTIONS.relieved || EMOTIONS.calm, EMOTIONS.happy],
  },
  {
    date: '2026-01-14',
    title: 'Creative flow',
    body: `Today was one of those rare days where everything just clicked. I spent most of the day working on the new feature design and the ideas kept flowing.

I tried a new technique - setting a 25-minute timer and fully focusing without any distractions. It worked surprisingly well. I managed to complete the wireframes that I thought would take me all week.

The weather was beautiful today. I took a short walk during lunch and it really helped clear my mind.`,
    emotionIds: [EMOTIONS.inspired, EMOTIONS.enthusiastic, EMOTIONS.satisfied],
  },
  {
    date: '2026-01-15',
    title: 'Midweek slump',
    body: `Today was tougher. I woke up tired and couldn't shake the fatigue all day. The coffee helped a bit but I know I need better sleep.

Had a difficult conversation with a team member about project delays. It wasn't confrontational but it was draining. I'm trying to be understanding but also clear about expectations.

I skipped my evening workout because I was too exhausted. I know I shouldn't feel guilty about listening to my body, but part of me does.`,
    emotionIds: [EMOTIONS.tired, EMOTIONS.stressed, EMOTIONS.disappointed],
  },
  {
    date: '2026-01-16',
    title: 'Finding balance',
    body: `Made a conscious effort to take it easier today. I went to bed early last night and woke up feeling more refreshed.

I had a good call with my mentor. We talked about work-life balance and she gave me some practical advice about setting boundaries. One thing she said really stuck with me: "You can't pour from an empty cup."

Tonight I'm going to cook a nice dinner and watch a movie. Sometimes the best productivity hack is rest.`,
    emotionIds: [EMOTIONS.calm, EMOTIONS.grateful, EMOTIONS.hopeful],
  },
  {
    date: '2026-01-17',
    title: 'Friday wins',
    body: `Great end to the work week! We shipped the feature we've been working on and the initial feedback is positive. The team worked really hard and it feels good to see the results.

Had a fun team lunch to celebrate. We went to that new Thai place downtown and the food was amazing. It's nice to see everyone relaxed and happy.

Looking forward to the weekend. Planning to catch up with some friends and maybe do some hiking if the weather holds.`,
    emotionIds: [EMOTIONS.happy, EMOTIONS.proud, EMOTIONS.excited],
  },
  {
    date: '2026-01-18',
    title: 'Weekend morning thoughts',
    body: `Lazy Saturday morning. Woke up without an alarm and just lay in bed reading for a while. There's something luxurious about not having anywhere to be.

I've been thinking about my goals again. I realize I've been pretty focused on work, which is fine, but I want to make sure I'm also nurturing my relationships and personal interests.

Going to meet some friends for coffee this afternoon. Then maybe I'll work on that side project I've been putting off.`,
    emotionIds: [EMOTIONS.relaxed, EMOTIONS.content, EMOTIONS.peaceful],
  },
]

// Emotion log templates (multiple per day with varying times)
const emotionLogs = [
  // Jan 12
  {
    date: '2026-01-12T07:30:00',
    emotionIds: [EMOTIONS.calm, EMOTIONS.hopeful],
    note: 'Morning meditation session. Feeling centered.',
  },
  {
    date: '2026-01-12T14:00:00',
    emotionIds: [EMOTIONS.motivated, EMOTIONS.enthusiastic],
    note: 'After planning session - excited about the year ahead.',
  },
  {
    date: '2026-01-12T21:00:00',
    emotionIds: [EMOTIONS.satisfied, EMOTIONS.peaceful],
    note: 'Good day overall. Ready for bed.',
  },
  // Jan 13
  {
    date: '2026-01-13T08:45:00',
    emotionIds: [EMOTIONS.nervous, EMOTIONS.anxious],
    note: 'Pre-presentation jitters.',
  },
  {
    date: '2026-01-13T11:00:00',
    emotionIds: [EMOTIONS.proud, EMOTIONS.happy],
    note: 'Presentation went well! Positive feedback received.',
  },
  {
    date: '2026-01-13T19:30:00',
    emotionIds: [EMOTIONS.content, EMOTIONS.grateful],
    note: 'Evening reflection. Grateful for good colleagues.',
  },
  // Jan 14
  {
    date: '2026-01-14T09:00:00',
    emotionIds: [EMOTIONS.inspired, EMOTIONS.excited],
    note: 'Ideas flowing this morning!',
  },
  {
    date: '2026-01-14T15:30:00',
    emotionIds: [EMOTIONS.enthusiastic, EMOTIONS.satisfied],
    note: 'Finished wireframes early. Flow state achieved.',
  },
  // Jan 15
  {
    date: '2026-01-15T07:00:00',
    emotionIds: [EMOTIONS.tired, EMOTIONS.bored],
    note: 'Rough morning. Need more sleep.',
  },
  {
    date: '2026-01-15T16:00:00',
    emotionIds: [EMOTIONS.stressed, EMOTIONS.frustrated],
    note: 'Difficult meeting. Feeling drained.',
  },
  {
    date: '2026-01-15T20:30:00',
    emotionIds: [EMOTIONS.tired, EMOTIONS.disappointed],
    note: 'Skipped workout. Need rest.',
  },
  // Jan 16
  {
    date: '2026-01-16T08:00:00',
    emotionIds: [EMOTIONS.calm, EMOTIONS.hopeful],
    note: 'Better sleep = better mood.',
  },
  {
    date: '2026-01-16T13:00:00',
    emotionIds: [EMOTIONS.grateful, EMOTIONS.inspired],
    note: 'Great call with mentor. Feeling supported.',
  },
  {
    date: '2026-01-16T19:00:00',
    emotionIds: [EMOTIONS.relaxed, EMOTIONS.content],
    note: 'Cooking dinner. Simple pleasures.',
  },
  // Jan 17
  {
    date: '2026-01-17T10:00:00',
    emotionIds: [EMOTIONS.excited, EMOTIONS.proud],
    note: 'Feature shipped! Team celebration.',
  },
  {
    date: '2026-01-17T13:30:00',
    emotionIds: [EMOTIONS.happy, EMOTIONS.cheerful],
    note: 'Fun team lunch. Good vibes.',
  },
  {
    date: '2026-01-17T18:00:00',
    emotionIds: [EMOTIONS.satisfied, EMOTIONS.hopeful],
    note: 'TGIF! Looking forward to weekend.',
  },
  // Jan 18
  {
    date: '2026-01-18T10:30:00',
    emotionIds: [EMOTIONS.relaxed, EMOTIONS.peaceful],
    note: 'Lazy Saturday morning. Reading in bed.',
  },
  {
    date: '2026-01-18T15:00:00',
    emotionIds: [EMOTIONS.happy, EMOTIONS.grateful],
    note: 'Coffee with friends. Good conversations.',
  },
]

// Create tags if they don't exist
async function ensureTags(): Promise<{ people: Record<string, string>; context: Record<string, string> }> {
  const peopleTagNames = ['Sarah', 'Work Team', 'Mentor', 'Friends']
  const contextTagNames = ['Work', 'Home', 'Morning Routine', 'Social', 'Exercise']

  const peopleTags: Record<string, string> = {}
  const contextTags: Record<string, string> = {}

  // Create people tags
  for (const name of peopleTagNames) {
    const existingTags = await peopleTagDexieRepository.getAll()
    const existing = existingTags.find((t) => t.name === name)
    if (existing) {
      peopleTags[name] = existing.id
    } else {
      const created = await peopleTagDexieRepository.create({ name })
      peopleTags[name] = created.id
    }
  }

  // Create context tags
  for (const name of contextTagNames) {
    const existingTags = await contextTagDexieRepository.getAll()
    const existing = existingTags.find((t) => t.name === name)
    if (existing) {
      contextTags[name] = existing.id
    } else {
      const created = await contextTagDexieRepository.create({ name })
      contextTags[name] = created.id
    }
  }

  return { people: peopleTags, context: contextTags }
}

// Map journal entries to tags
function getJournalTags(
  index: number,
  tags: { people: Record<string, string>; context: Record<string, string> }
): { peopleTagIds: string[]; contextTagIds: string[] } {
  const tagMappings = [
    { people: [], context: ['Home', 'Morning Routine'] }, // Jan 12
    { people: ['Work Team'], context: ['Work', 'Social'] }, // Jan 13
    { people: [], context: ['Work'] }, // Jan 14
    { people: ['Work Team'], context: ['Work'] }, // Jan 15
    { people: ['Mentor'], context: ['Work', 'Home'] }, // Jan 16
    { people: ['Work Team'], context: ['Work', 'Social'] }, // Jan 17
    { people: ['Friends'], context: ['Home', 'Social'] }, // Jan 18
  ]

  const mapping = tagMappings[index] || { people: [], context: [] }
  return {
    peopleTagIds: mapping.people.map((name) => tags.people[name]).filter(Boolean),
    contextTagIds: mapping.context.map((name) => tags.context[name]).filter(Boolean),
  }
}

// Map emotion logs to tags
function getEmotionLogTags(
  index: number,
  tags: { people: Record<string, string>; context: Record<string, string> }
): { peopleTagIds: string[]; contextTagIds: string[] } {
  const tagMappings = [
    { people: [], context: ['Morning Routine', 'Home'] }, // Jan 12 morning
    { people: [], context: ['Home'] }, // Jan 12 afternoon
    { people: [], context: ['Home'] }, // Jan 12 evening
    { people: ['Work Team'], context: ['Work'] }, // Jan 13 morning
    { people: ['Work Team'], context: ['Work'] }, // Jan 13 mid
    { people: [], context: ['Home'] }, // Jan 13 evening
    { people: [], context: ['Work'] }, // Jan 14 morning
    { people: [], context: ['Work'] }, // Jan 14 afternoon
    { people: [], context: ['Home', 'Morning Routine'] }, // Jan 15 morning
    { people: ['Work Team'], context: ['Work'] }, // Jan 15 afternoon
    { people: [], context: ['Home'] }, // Jan 15 evening
    { people: [], context: ['Home', 'Morning Routine'] }, // Jan 16 morning
    { people: ['Mentor'], context: ['Work'] }, // Jan 16 afternoon
    { people: [], context: ['Home'] }, // Jan 16 evening
    { people: ['Work Team'], context: ['Work'] }, // Jan 17 morning
    { people: ['Work Team'], context: ['Work', 'Social'] }, // Jan 17 lunch
    { people: [], context: ['Home'] }, // Jan 17 evening
    { people: [], context: ['Home'] }, // Jan 18 morning
    { people: ['Friends'], context: ['Social'] }, // Jan 18 afternoon
  ]

  const mapping = tagMappings[index] || { people: [], context: [] }
  return {
    peopleTagIds: mapping.people.map((name) => tags.people[name]).filter(Boolean),
    contextTagIds: mapping.context.map((name) => tags.context[name]).filter(Boolean),
  }
}

export async function seedMockData(): Promise<void> {
  console.log('Starting mock data seed...')

  // Ensure tags exist
  const tags = await ensureTags()
  console.log('Tags created/verified:', tags)

  // Create journal entries
  console.log('Creating journal entries...')
  for (let i = 0; i < journalEntries.length; i++) {
    const entry = journalEntries[i]
    const entryTags = getJournalTags(i, tags)
    const createdAt = new Date(`${entry.date}T10:00:00`).toISOString()

    await journalDexieRepository.create({
      title: entry.title,
      body: entry.body,
      emotionIds: entry.emotionIds,
      peopleTagIds: entryTags.peopleTagIds,
      contextTagIds: entryTags.contextTagIds,
      createdAt,
    })
    console.log(`  Created: ${entry.title}`)
  }

  // Create emotion logs
  console.log('Creating emotion logs...')
  for (let i = 0; i < emotionLogs.length; i++) {
    const log = emotionLogs[i]
    const logTags = getEmotionLogTags(i, tags)
    const createdAt = new Date(log.date).toISOString()

    await emotionLogDexieRepository.create({
      emotionIds: log.emotionIds,
      note: log.note,
      peopleTagIds: logTags.peopleTagIds,
      contextTagIds: logTags.contextTagIds,
      createdAt,
    })
    console.log(`  Created log: ${log.note?.substring(0, 30)}...`)
  }

  console.log('Mock data seed complete!')
  console.log(`  Journal entries: ${journalEntries.length}`)
  console.log(`  Emotion logs: ${emotionLogs.length}`)
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).seedMockData = seedMockData
}
