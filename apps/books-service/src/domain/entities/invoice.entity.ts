import { BaseEntity } from '@cargoez/domain';

export interface InvoiceEntity extends BaseEntity {
  invoiceNumber: string;
  contactUid?: string;
  shipmentUid?: string;
  invoiceDate: string;
  dueDate?: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  notes?: string;
}

export interface InvoiceItemEntity extends BaseEntity {
  invoiceUid: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder: number;
}
