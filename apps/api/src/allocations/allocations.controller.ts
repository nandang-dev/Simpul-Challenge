import { Body, Controller, Inject, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AllocationRequest, AllocationResponse } from '@simpul/shared';
import { AllocationRequestDto } from './dto/allocation-request.dto';
import { AllocationResponseDto } from './dto/allocation-response.dto';

interface AllocationServiceContract {
  create(request: AllocationRequest): AllocationResponse;
}

@ApiTags('Allocations')
@Controller('allocations')
export class AllocationsController {
  constructor(
    @Inject('ALLOCATION_SERVICE')
    private readonly allocationService: AllocationServiceContract,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Allocate requested products across eligible warehouses',
    description:
      'Returns a deterministic shipment plan, fulfillment summary, and warehouses excluded by the eligibility rules.',
  })
  @ApiOkResponse({
    description: 'The allocation decision, including FULL, PARTIAL, or UNFULFILLABLE status.',
    type: AllocationResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'The request is invalid: items must be non-empty, products unique and known, quantities positive integers, and distance limits valid.',
  })
  create(@Body() request: AllocationRequestDto): AllocationResponse {
    return this.allocationService.create(request);
  }
}