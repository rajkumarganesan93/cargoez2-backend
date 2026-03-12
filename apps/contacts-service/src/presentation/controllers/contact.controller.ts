import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { RequirePermission } from '@cargoez/infrastructure';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { CreateContactDto, UpdateContactDto } from '../dto/contact.dto';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactController {
  constructor(private readonly contactRepo: ContactRepository) {}

  @Get()
  @RequirePermission('contacts.read')
  @ApiOperation({ summary: 'List contacts with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const result = await this.contactRepo.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
      search,
      searchFields: ['company_name', 'first_name', 'last_name', 'email'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get(':uid')
  @RequirePermission('contacts.read')
  @ApiOperation({ summary: 'Get contact by UID' })
  async findOne(@Param('uid') uid: string) {
    const entity = await this.contactRepo.findByUid(uid);
    if (!entity) throw new NotFoundException('Contact not found');
    return createSuccessResponse(MessageCode.FETCHED, entity);
  }

  @Post()
  @RequirePermission('contacts.create')
  @ApiOperation({ summary: 'Create contact' })
  async create(@Body() dto: CreateContactDto) {
    const entity = await this.contactRepo.save(dto);
    return createSuccessResponse(MessageCode.CREATED, entity);
  }

  @Put(':uid')
  @RequirePermission('contacts.update')
  @ApiOperation({ summary: 'Update contact' })
  async update(@Param('uid') uid: string, @Body() dto: UpdateContactDto) {
    const entity = await this.contactRepo.update(uid, dto);
    return createSuccessResponse(MessageCode.UPDATED, entity);
  }

  @Delete(':uid')
  @RequirePermission('contacts.delete')
  @ApiOperation({ summary: 'Delete contact' })
  async remove(@Param('uid') uid: string) {
    await this.contactRepo.delete(uid);
    return createSuccessResponse(MessageCode.DELETED);
  }
}
