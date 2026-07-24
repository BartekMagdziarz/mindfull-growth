import type {
  CreatePriorityLinkPayload,
  PriorityLink,
  PriorityLinkSubjectRef,
  UpdatePriorityLinkPayload,
} from '@/domain/planning'

export interface PriorityLinkRepository {
  getById(id: string): Promise<PriorityLink | undefined>
  listAll(): Promise<PriorityLink[]>
  listByPriority(priorityId: string): Promise<PriorityLink[]>
  listBySubject(subjectRef: PriorityLinkSubjectRef): Promise<PriorityLink[]>
  create(data: CreatePriorityLinkPayload): Promise<PriorityLink>
  update(id: string, data: UpdatePriorityLinkPayload): Promise<PriorityLink>
  delete(id: string): Promise<void>
}
