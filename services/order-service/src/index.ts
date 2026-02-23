import 'dotenv/config';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './presentation/swagger.js';
import { createOrderRoutes } from './presentation/routes.js';
import { OrderController } from './presentation/controllers/OrderController.js';
import { OrderRepository } from './infrastructure/repositories/OrderRepository.js';
import { CreateOrderUseCase } from './application/use-cases/CreateOrderUseCase.js';
import { GetOrderByIdUseCase } from './application/use-cases/GetOrderByIdUseCase.js';

const PORT = process.env.PORT ?? 3002;

const orderRepository = new OrderRepository();
const createOrderUseCase = new CreateOrderUseCase(orderRepository);
const getOrderByIdUseCase = new GetOrderByIdUseCase(orderRepository);
const orderController = new OrderController(createOrderUseCase, getOrderByIdUseCase);

const app = express();
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(createOrderRoutes(orderController));

app.listen(PORT, () => {
  console.log(`Order service listening on port ${PORT}`);
});
