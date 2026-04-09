import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';

@Injectable()
export class ParseDayOfWeekPipe implements PipeTransform<string, DayOfWeek> {
  transform(value: string): DayOfWeek {
    const upper = value.toUpperCase();
    const valid = Object.values(DayOfWeek);
    if (!valid.includes(upper as DayOfWeek)) {
      throw new BadRequestException(
        `Invalid day: "${value}". Must be one of: ${valid.join(', ')}`,
      );
    }
    return upper as DayOfWeek;
  }
}
