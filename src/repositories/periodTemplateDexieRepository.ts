import type {
  PeriodTemplate,
  TemplateSection,
  CreatePeriodTemplatePayload,
} from '@/domain/lifeSeasons'
import type { PeriodicEntryType } from '@/domain/periodicEntry'
import { getUserDatabase } from '@/services/userDatabase.service'

export interface PeriodTemplateRepository {
  getAll(): Promise<PeriodTemplate[]>
  getById(id: string): Promise<PeriodTemplate | undefined>
  getByPeriodType(periodType: PeriodicEntryType): Promise<PeriodTemplate[]>
  getDefaultTemplate(periodType: PeriodicEntryType): Promise<PeriodTemplate | undefined>
  create(data: CreatePeriodTemplatePayload): Promise<PeriodTemplate>
  update(template: PeriodTemplate): Promise<PeriodTemplate>
  delete(id: string): Promise<void>
}

class PeriodTemplateDexieRepository implements PeriodTemplateRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<PeriodTemplate[]> {
    try {
      return await this.db.periodTemplates.toArray()
    } catch (error) {
      console.error('Failed to get all period templates:', error)
      throw new Error('Failed to retrieve period templates from database')
    }
  }

  async getById(id: string): Promise<PeriodTemplate | undefined> {
    try {
      return await this.db.periodTemplates.get(id)
    } catch (error) {
      console.error(`Failed to get period template with id ${id}:`, error)
      throw new Error(`Failed to retrieve period template with id ${id}`)
    }
  }

  async getByPeriodType(periodType: PeriodicEntryType): Promise<PeriodTemplate[]> {
    try {
      return await this.db.periodTemplates
        .where('periodType')
        .equals(periodType)
        .toArray()
    } catch (error) {
      console.error(`Failed to get templates for period type ${periodType}:`, error)
      throw new Error(`Failed to retrieve templates for period type ${periodType}`)
    }
  }

  async getDefaultTemplate(periodType: PeriodicEntryType): Promise<PeriodTemplate | undefined> {
    try {
      const templates = await this.getByPeriodType(periodType)
      return templates.find((t) => t.isDefault)
    } catch (error) {
      console.error(`Failed to get default template for ${periodType}:`, error)
      throw new Error(`Failed to retrieve default template for ${periodType}`)
    }
  }

  async create(data: CreatePeriodTemplatePayload): Promise<PeriodTemplate> {
    try {
      const now = new Date().toISOString()

      // Convert payload sections to full TemplateSection objects with IDs
      const sections: TemplateSection[] = data.sections.map((section) => ({
        ...section,
        id: crypto.randomUUID(),
      }))

      const template: PeriodTemplate = {
        id: crypto.randomUUID(),
        periodType: data.periodType,
        name: data.name,
        sections,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      }
      await this.db.periodTemplates.add(template)
      return template
    } catch (error) {
      console.error('Failed to create period template:', error)
      throw new Error('Failed to create period template in database')
    }
  }

  async update(template: PeriodTemplate): Promise<PeriodTemplate> {
    try {
      const updatedTemplate: PeriodTemplate = {
        ...template,
        updatedAt: new Date().toISOString(),
      }
      await this.db.periodTemplates.put(updatedTemplate)
      return updatedTemplate
    } catch (error) {
      console.error(`Failed to update period template with id ${template.id}:`, error)
      throw new Error(`Failed to update period template with id ${template.id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.periodTemplates.delete(id)
    } catch (error) {
      console.error(`Failed to delete period template with id ${id}:`, error)
      throw new Error(`Failed to delete period template with id ${id}`)
    }
  }
}

export const periodTemplateDexieRepository = new PeriodTemplateDexieRepository()
