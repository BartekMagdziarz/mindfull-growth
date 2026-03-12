export interface PlanningObjectRepository<TObject, TCreatePayload, TUpdatePayload> {
  getById(id: string): Promise<TObject | undefined>
  listAll(): Promise<TObject[]>
  create(data: TCreatePayload): Promise<TObject>
  update(id: string, data: TUpdatePayload): Promise<TObject>
  delete(id: string): Promise<void>
}
