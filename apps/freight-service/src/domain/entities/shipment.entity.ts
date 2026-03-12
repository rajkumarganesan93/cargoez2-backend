import { BaseEntity } from '@cargoez/domain';

export interface ShipmentEntity extends BaseEntity {
  shipmentNumber: string;
  origin: string;
  destination: string;
  mode: string;
  status: string;
  shipperName?: string;
  consigneeName?: string;
  weight?: number;
  weightUnit?: string;
  pieces?: number;
  etd?: string;
  eta?: string;
  remarks?: string;
}
