import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { createSuccessResponse, MessageCode } from '@cargoez/api';
import { RequirePermission } from '@cargoez/infrastructure';
import { GetScreensByModuleUseCase } from '../../application/use-cases/screens/get-screens-by-module.use-case';
import { CreateScreenUseCase } from '../../application/use-cases/screens/create-screen.use-case';
import { UpdateScreenUseCase } from '../../application/use-cases/screens/update-screen.use-case';
import { DeleteScreenUseCase } from '../../application/use-cases/screens/delete-screen.use-case';
import { CreateScreenDto } from '../dto/create-screen.dto';
import { UpdateScreenDto } from '../dto/update-screen.dto';

@ApiTags('Screens')
@ApiBearerAuth()
@Controller('screens')
export class ScreensController {
  constructor(
    private readonly getScreensByModule: GetScreensByModuleUseCase,
    private readonly createScreen: CreateScreenUseCase,
    private readonly updateScreen: UpdateScreenUseCase,
    private readonly deleteScreen: DeleteScreenUseCase,
  ) {}

  @Get()
  @ApiQuery({ name: 'moduleId', required: true, type: String })
  async findByModule(@Query('moduleId') moduleId: string) {
    const screens = await this.getScreensByModule.execute(moduleId);
    return createSuccessResponse(MessageCode.LIST_FETCHED, screens);
  }

  @Post()
  @RequirePermission('user-management.permissions.create')
  async create(@Body() dto: CreateScreenDto) {
    const screen = await this.createScreen.execute(dto);
    return createSuccessResponse(MessageCode.CREATED, screen);
  }

  @Put(':id')
  @RequirePermission('user-management.permissions.update')
  async update(@Param('id') id: string, @Body() dto: UpdateScreenDto) {
    const screen = await this.updateScreen.execute(id, dto);
    return createSuccessResponse(MessageCode.UPDATED, screen);
  }

  @Delete(':id')
  @RequirePermission('user-management.permissions.delete')
  async remove(@Param('id') id: string) {
    await this.deleteScreen.execute(id);
    return createSuccessResponse(MessageCode.DELETED, null);
  }
}
