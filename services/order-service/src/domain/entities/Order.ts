export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
}
