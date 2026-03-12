import { Module } from '@nestjs/common';
import { ProductsController } from '../controllers/products.controller';
import { ProductRepository, ProductDetailRepository } from '../../infrastructure/repositories/product.repository';

@Module({
  controllers: [ProductsController],
  providers: [ProductRepository, ProductDetailRepository],
})
export class ProductsModule {}
