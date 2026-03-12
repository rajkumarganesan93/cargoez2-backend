import { Module } from '@nestjs/common';
import { MetadataController } from '../controllers/metadata.controller';
import { MetaDataRepository, MetaDataDetailRepository } from '../../infrastructure/repositories/meta-data.repository';

@Module({
  controllers: [MetadataController],
  providers: [MetaDataRepository, MetaDataDetailRepository],
})
export class MetadataModule {}
