import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseSlotNumberPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const num = Number.parseInt(value, 10);
    if (Number.isNaN(num) || num < 1) {
      throw new BadRequestException(`Invalid slot number: "${value}"`);
    }
    return num;
  }
}
