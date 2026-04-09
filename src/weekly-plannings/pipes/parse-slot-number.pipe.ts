import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseSlotNumberPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 3) {
      throw new BadRequestException(
        `Invalid slot number: "${value}". Must be 1, 2, or 3`,
      );
    }
    return num;
  }
}
