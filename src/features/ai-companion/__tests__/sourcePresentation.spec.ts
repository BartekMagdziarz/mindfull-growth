import { expect, it } from 'vitest'
import { readableSourceBlocks } from '../sourcePresentation'
it('shows named fields and ratings without database IDs or empty arrays', () => {
  const blocks = readableSourceBlocks([
    { author: 'recorded', label: 'note', text: 'Dużo nowych decyzji w pracy.' },
    { author: 'recorded', label: 'emotionIds', text: '["e5m12-challenged-005"]' },
    {
      author: 'recorded',
      label: 'contextTagIds',
      text: '["f402a8c7-80c7-408d-97d2-71afaec27f01"]',
    },
    { author: 'recorded', label: 'peopleTagIds', text: '[]' },
    { author: 'recorded', label: 'balanceRating', text: '3' },
  ])
  expect(blocks).toEqual([
    { label: 'Notatka', text: 'Dużo nowych decyzji w pracy.' },
    { label: 'Balans', text: '3 / 5' },
  ])
})
