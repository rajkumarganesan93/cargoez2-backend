import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { Roles, getContext } from '@cargoez/infrastructure';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'createdAt' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'], example: 'desc' })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy', new DefaultValuePipe('createdAt')) sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc',
    @Query('search') search?: string,
  ) {
    const result = await this.usersService.findAll({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      searchFields: ['name', 'email'],
    });
    return createSuccessResponse(MessageCode.LIST_FETCHED, result);
  }

  @Get('me')
  getMe() {
    const context = getContext();
    return createSuccessResponse(MessageCode.FETCHED, context);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return createSuccessResponse(MessageCode.FETCHED, user);
  }

  @Post()
  @Roles('admin')
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return createSuccessResponse(MessageCode.CREATED, user);
  }

  @Put(':id')
  @Roles('admin')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(id, dto);
    return createSuccessResponse(MessageCode.UPDATED, user);
  }

  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: string) {
    await this.usersService.delete(id);
    return createSuccessResponse(MessageCode.DELETED, null);
  }
}
