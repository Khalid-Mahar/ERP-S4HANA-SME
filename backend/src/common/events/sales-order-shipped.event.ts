export class SalesOrderShippedEvent {
  constructor(
    public readonly companyId: string,
    public readonly orderId: string,
    public readonly warehouseId: string,
    public readonly userId?: string,
  ) {}
}
