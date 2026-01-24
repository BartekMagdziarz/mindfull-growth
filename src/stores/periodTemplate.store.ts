import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  PeriodTemplate,
  TemplateSection,
  CreatePeriodTemplatePayload,
} from '@/domain/lifeSeasons'
import type { PeriodicEntryType } from '@/domain/periodicEntry'
import { periodTemplateDexieRepository } from '@/repositories/periodTemplateDexieRepository'

// Default templates for each period type
const DEFAULT_YEARLY_REFLECTION_SECTIONS: Omit<TemplateSection, 'id'>[] = [
  {
    type: 'text',
    title: 'Year in Review',
    placeholder: 'Looking back at this year as a whole...',
    isRequired: false,
    order: 1,
  },
  {
    type: 'list',
    title: 'What Went Well',
    placeholder: 'What accomplishments are you proud of?',
    maxItems: 10,
    isRequired: false,
    order: 2,
  },
  {
    type: 'list',
    title: 'Challenges Faced',
    placeholder: 'What was particularly difficult?',
    maxItems: 10,
    isRequired: false,
    order: 3,
  },
  {
    type: 'list',
    title: 'Lessons Learned',
    placeholder: 'What key insights will you carry forward?',
    maxItems: 10,
    isRequired: false,
    order: 4,
  },
  {
    type: 'list',
    title: 'Sources of Joy',
    placeholder: 'What brought you the most happiness?',
    maxItems: 10,
    isRequired: false,
    order: 5,
  },
  {
    type: 'list',
    title: 'Gratitude',
    placeholder: 'What are you most grateful for this year?',
    maxItems: 5,
    isRequired: false,
    order: 6,
  },
]

const DEFAULT_YEARLY_PLANNING_SECTIONS: Omit<TemplateSection, 'id'>[] = [
  {
    type: 'text',
    title: 'Theme / Word for the Year',
    placeholder: 'One word or phrase to guide the year',
    isRequired: false,
    order: 1,
  },
  {
    type: 'text',
    title: 'Vision of Self',
    placeholder: 'Who do you want to become? How do you want to feel?',
    isRequired: false,
    order: 2,
  },
  {
    type: 'list',
    title: 'High-Level Goals',
    placeholder: '3-5 major goals for the year',
    maxItems: 5,
    isRequired: false,
    order: 3,
  },
  {
    type: 'list',
    title: 'Areas of Focus',
    placeholder: 'What life areas need attention? (health, relationships, career...)',
    maxItems: 6,
    isRequired: false,
    order: 4,
  },
  {
    type: 'text',
    title: 'Flexible Intentions',
    placeholder: "Plans you're open to adjusting as life unfolds",
    isRequired: false,
    order: 5,
  },
]

const DEFAULT_QUARTERLY_SECTIONS: Omit<TemplateSection, 'id'>[] = [
  {
    type: 'text',
    title: 'Quarter Reflection',
    placeholder: 'How did this quarter go overall?',
    isRequired: false,
    order: 1,
  },
  {
    type: 'list',
    title: 'Priority Goals',
    placeholder: 'Which yearly goals to focus on this quarter?',
    maxItems: 3,
    isRequired: false,
    order: 2,
  },
  {
    type: 'list',
    title: 'Specific Outcomes',
    placeholder: "What do you want to have accomplished by quarter's end?",
    maxItems: 5,
    isRequired: false,
    order: 3,
  },
  {
    type: 'text',
    title: 'Course Corrections',
    placeholder: "What needs to change based on what you've learned?",
    isRequired: false,
    order: 4,
  },
]

const DEFAULT_WEEKLY_SECTIONS: Omit<TemplateSection, 'id'>[] = [
  {
    type: 'list',
    title: 'Wins',
    placeholder: 'What went well this week?',
    maxItems: 5,
    isRequired: false,
    order: 1,
  },
  {
    type: 'list',
    title: 'Challenges',
    placeholder: 'What was challenging?',
    maxItems: 5,
    isRequired: false,
    order: 2,
  },
  {
    type: 'list',
    title: 'Learnings',
    placeholder: 'What did you learn?',
    maxItems: 5,
    isRequired: false,
    order: 3,
  },
  {
    type: 'list',
    title: 'Gratitude',
    placeholder: 'What are you grateful for?',
    maxItems: 3,
    isRequired: false,
    order: 4,
  },
  {
    type: 'text',
    title: 'Intention for Next Week',
    placeholder: "What's your focus for the coming week?",
    isRequired: false,
    order: 5,
  },
]

const DEFAULT_DAILY_SECTIONS: Omit<TemplateSection, 'id'>[] = [
  {
    type: 'text',
    title: 'Morning Intention',
    placeholder: "What's your focus for today?",
    isRequired: false,
    order: 1,
  },
  {
    type: 'text',
    title: 'Evening Reflection',
    placeholder: 'How did the day go?',
    isRequired: false,
    order: 2,
  },
  {
    type: 'text',
    title: 'Quick Win',
    placeholder: 'One thing that went well',
    isRequired: false,
    order: 3,
  },
]

export const usePeriodTemplateStore = defineStore('periodTemplate', () => {
  // State
  const templates = ref<PeriodTemplate[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const sortedTemplates = computed(() => {
    return [...templates.value].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  // Get templates by period type
  function getTemplatesByPeriodType(periodType: PeriodicEntryType): PeriodTemplate[] {
    return sortedTemplates.value.filter((t) => t.periodType === periodType)
  }

  // Get default template for a period type (uses built-in defaults if none exists)
  function getDefaultTemplate(periodType: PeriodicEntryType): PeriodTemplate {
    const customDefault = templates.value.find(
      (t) => t.periodType === periodType && t.isDefault
    )

    if (customDefault) {
      return customDefault
    }

    // Return built-in default
    return createBuiltInTemplate(periodType)
  }

  // Create built-in template with IDs
  function createBuiltInTemplate(periodType: PeriodicEntryType): PeriodTemplate {
    let sections: Omit<TemplateSection, 'id'>[]
    let name: string

    switch (periodType) {
      case 'yearly':
        sections = [...DEFAULT_YEARLY_REFLECTION_SECTIONS, ...DEFAULT_YEARLY_PLANNING_SECTIONS]
        name = 'Default Yearly Template'
        break
      case 'quarterly':
        sections = DEFAULT_QUARTERLY_SECTIONS
        name = 'Default Quarterly Template'
        break
      case 'weekly':
        sections = DEFAULT_WEEKLY_SECTIONS
        name = 'Default Weekly Template'
        break
      case 'daily':
        sections = DEFAULT_DAILY_SECTIONS
        name = 'Default Daily Template'
        break
      default:
        sections = []
        name = 'Empty Template'
    }

    const now = new Date().toISOString()
    return {
      id: `builtin-${periodType}`,
      periodType,
      name,
      sections: sections.map((s) => ({ ...s, id: crypto.randomUUID() })),
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    }
  }

  // Get yearly reflection sections
  function getYearlyReflectionSections(): TemplateSection[] {
    return DEFAULT_YEARLY_REFLECTION_SECTIONS.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
    }))
  }

  // Get yearly planning sections
  function getYearlyPlanningSections(): TemplateSection[] {
    return DEFAULT_YEARLY_PLANNING_SECTIONS.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
    }))
  }

  // Actions
  async function loadTemplates() {
    isLoading.value = true
    error.value = null
    try {
      templates.value = await periodTemplateDexieRepository.getAll()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load period templates'
      error.value = errorMessage
      console.error('Error loading period templates:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createTemplate(payload: CreatePeriodTemplatePayload): Promise<PeriodTemplate> {
    error.value = null
    try {
      const newTemplate = await periodTemplateDexieRepository.create(payload)
      templates.value.push(newTemplate)
      return newTemplate
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create period template'
      error.value = errorMessage
      console.error('Error creating period template:', err)
      throw err
    }
  }

  async function updateTemplate(
    id: string,
    updates: Partial<PeriodTemplate>
  ): Promise<PeriodTemplate> {
    error.value = null
    try {
      const existingTemplate = templates.value.find((t) => t.id === id)
      if (!existingTemplate) {
        throw new Error(`Template with id ${id} not found`)
      }

      const updatedTemplate: PeriodTemplate = {
        ...existingTemplate,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      const savedTemplate = await periodTemplateDexieRepository.update(updatedTemplate)

      const index = templates.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        templates.value[index] = savedTemplate
      }

      return savedTemplate
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update period template'
      error.value = errorMessage
      console.error('Error updating period template:', err)
      throw err
    }
  }

  async function setAsDefault(id: string, periodType: PeriodicEntryType): Promise<void> {
    error.value = null
    try {
      // Remove default from other templates of same type
      const sameTypeTemplates = templates.value.filter(
        (t) => t.periodType === periodType && t.isDefault
      )
      for (const t of sameTypeTemplates) {
        await updateTemplate(t.id, { isDefault: false })
      }

      // Set this one as default
      await updateTemplate(id, { isDefault: true })
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to set template as default'
      error.value = errorMessage
      console.error('Error setting template as default:', err)
      throw err
    }
  }

  async function deleteTemplate(id: string): Promise<void> {
    error.value = null
    try {
      await periodTemplateDexieRepository.delete(id)
      templates.value = templates.value.filter((t) => t.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete period template'
      error.value = errorMessage
      console.error('Error deleting period template:', err)
      throw err
    }
  }

  return {
    // State
    templates,
    isLoading,
    error,
    // Getters
    sortedTemplates,
    getTemplatesByPeriodType,
    getDefaultTemplate,
    getYearlyReflectionSections,
    getYearlyPlanningSections,
    // Actions
    loadTemplates,
    createTemplate,
    updateTemplate,
    setAsDefault,
    deleteTemplate,
  }
})
