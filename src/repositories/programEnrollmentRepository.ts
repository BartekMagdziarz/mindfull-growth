import type {
  CreateProgramEnrollmentPayload,
  ProgramEnrollment,
  UpdateProgramEnrollmentPayload,
} from '@/domain/program'

export interface ProgramEnrollmentRepository {
  getById(id: string): Promise<ProgramEnrollment | undefined>
  listAll(): Promise<ProgramEnrollment[]>
  create(payload: CreateProgramEnrollmentPayload): Promise<ProgramEnrollment>
  update(id: string, patch: UpdateProgramEnrollmentPayload): Promise<ProgramEnrollment>
}
