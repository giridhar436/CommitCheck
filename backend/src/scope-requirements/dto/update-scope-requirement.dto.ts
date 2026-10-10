import { PartialType } from '@nestjs/mapped-types';
import { CreateScopeRequirementDto } from './create-scope-requirement.dto';

/** All fields optional; duplicate-title check runs against the merged record. */
export class UpdateScopeRequirementDto extends PartialType(
  CreateScopeRequirementDto,
) {}
