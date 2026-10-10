import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';

/** All fields optional; the service validates date ordering across the merge. */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
