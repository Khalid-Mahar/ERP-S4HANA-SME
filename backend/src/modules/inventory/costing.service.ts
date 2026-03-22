import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class CostingService {
  private readonly logger = new Logger(CostingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Calculates the cost of goods sold (COGS) for a given quantity of an item using FIFO.
   * This logic assumes that stock movements with 'IN' type and 'unitCost' populated 
   * represent the available inventory layers.
   */
  async calculateFIFOCost(tx: any, companyId: string, itemId: string, quantityToDeduct: number): Promise<number> {
    // Find all positive stock movements (IN, ADJUSTMENT with positive diff, etc.) 
    // that still have "remaining" quantity.
    // NOTE: In a real SAP-like system, we would have an 'InventoryLayer' table.
    // For this refactor, we'll use StockMovements with movementType IN as layers.
    
    const availableLayers = await tx.stockMovement.findMany({
      where: {
        companyId,
        itemId,
        movementType: 'IN',
        quantity: { gt: 0 },
      },
      orderBy: { createdAt: 'asc' }, // FIFO: Oldest first
    });

    let totalCost = 0;
    let remainingToDeduct = quantityToDeduct;

    for (const layer of availableLayers) {
      if (remainingToDeduct <= 0) break;

      // We need to track how much of this layer has already been consumed.
      // In a production system, we'd have a 'consumedQuantity' field on the movement.
      // For now, let's assume we're calculating based on available stock.
      
      const layerQty = Number(layer.quantity);
      const layerUnitCost = Number(layer.unitCost || 0);

      if (layerQty <= remainingToDeduct) {
        totalCost += layerQty * layerUnitCost;
        remainingToDeduct -= layerQty;
      } else {
        totalCost += remainingToDeduct * layerUnitCost;
        remainingToDeduct = 0;
      }
    }

    if (remainingToDeduct > 0) {
      this.logger.warn(`FIFO Costing: Not enough inventory layers to cover deduction of ${quantityToDeduct} for item ${itemId}. Using last known cost for remainder.`);
      // Fallback to item's current costPrice if layers are insufficient
      const item = await tx.item.findUnique({ where: { id: itemId } });
      totalCost += remainingToDeduct * Number(item?.costPrice || 0);
    }

    return totalCost;
  }

  /**
   * Generates a valuation report for all items in the company.
   */
  async getInventoryValuation(companyId: string) {
    const items = await this.prisma.item.findMany({
      where: { companyId, isActive: true },
      include: {
        stockLevels: true,
      },
    });

    const report = await Promise.all(items.map(async (item) => {
      const totalQty = item.stockLevels.reduce((sum, sl) => sum + Number(sl.quantity), 0);
      
      // Calculate FIFO Value
      const valuation = await this.prisma.$transaction(async (tx) => {
        const layers = await tx.stockMovement.findMany({
          where: { companyId, itemId: item.id, movementType: 'IN', quantity: { gt: 0 } },
          orderBy: { createdAt: 'desc' }, // Latest layers
          take: 10 // Optimization
        });

        let remainingQty = totalQty;
        let fifoValue = 0;

        for (const layer of layers) {
          if (remainingQty <= 0) break;
          const qtyInLayer = Math.min(remainingQty, Number(layer.quantity));
          fifoValue += qtyInLayer * Number(layer.unitCost || item.costPrice);
          remainingQty -= qtyInLayer;
        }

        // Fallback for any remaining qty without specific layers
        if (remainingQty > 0) {
          fifoValue += remainingQty * Number(item.costPrice);
        }

        return fifoValue;
      });

      return {
        id: item.id,
        sku: item.sku,
        name: item.name,
        totalQty,
        valuation,
        avgUnitCost: totalQty > 0 ? valuation / totalQty : 0
      };
    }));

    return {
      totalValuation: report.reduce((sum, r) => sum + r.valuation, 0),
      items: report
    };
  }
}
