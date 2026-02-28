import { OrderWithTabs, OrderValidationResult, ValidationIssue } from './types';

export class ValidationService {
  validateOrder(order: OrderWithTabs): OrderValidationResult {
    const issues: ValidationIssue[] = [];
    let completeTabs = 0;

    for (const tab of order.tabs) {
      const tabIssues: ValidationIssue[] = [];

      if (!tab.pdfFile) {
        tabIssues.push({
          type: 'missing_file',
          tabNumber: tab.tabNumber,
          tabLabel: tab.label,
          message: `PDF file not uploaded`
        });
      }

      const isInsideCard = tab.isCard && tab.label === 'Inside';
      if (!isInsideCard && !tab.orderNumberPlaced) {
        tabIssues.push({
          type: 'missing_order_number',
          tabNumber: tab.tabNumber,
          tabLabel: tab.label,
          message: `Order number not placed`
        });
      }

      if (!tab.selectedFolder) {
        tabIssues.push({
          type: 'missing_folder',
          tabNumber: tab.tabNumber,
          tabLabel: tab.label,
          message: `Folder not selected`
        });
      }

      if (tabIssues.length === 0) {
        completeTabs++;
      } else {
        issues.push(...tabIssues);
      }
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      veeqoId: order.veeqo_id,
      isComplete: issues.length === 0,
      issues,
      totalTabs: order.tabs.length,
      completeTabs
    };
  }

  validateAllOrders(orders: OrderWithTabs[]): OrderValidationResult[] {
    return orders.map(order => this.validateOrder(order));
  }

  getIncompleteOrders(orders: OrderWithTabs[]): OrderValidationResult[] {
    const validations = this.validateAllOrders(orders);
    return validations.filter(v => !v.isComplete);
  }

  getCompleteOrders(orders: OrderWithTabs[]): OrderValidationResult[] {
    const validations = this.validateAllOrders(orders);
    return validations.filter(v => v.isComplete);
  }

  getValidationSummary(orders: OrderWithTabs[]): {
    total: number;
    complete: number;
    incomplete: number;
    missingFiles: number;
    missingOrderNumbers: number;
    missingFolders: number;
  } {
    const validations = this.validateAllOrders(orders);

    let missingFiles = 0;
    let missingOrderNumbers = 0;
    let missingFolders = 0;

    validations.forEach(v => {
      v.issues.forEach(issue => {
        if (issue.type === 'missing_file') missingFiles++;
        if (issue.type === 'missing_order_number') missingOrderNumbers++;
        if (issue.type === 'missing_folder') missingFolders++;
      });
    });

    return {
      total: validations.length,
      complete: validations.filter(v => v.isComplete).length,
      incomplete: validations.filter(v => !v.isComplete).length,
      missingFiles,
      missingOrderNumbers,
      missingFolders
    };
  }
}

export const validationService = new ValidationService();
