import { Module } from '@nestjs/common';
import { SubscriptionsController } from '../controllers/subscriptions.controller';
import { SubscriptionRepository } from '../../infrastructure/repositories/subscription.repository';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionRepository],
})
export class SubscriptionsModule {}
