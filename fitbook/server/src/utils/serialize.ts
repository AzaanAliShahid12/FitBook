import { FitnessClass } from '@prisma/client';

export interface ClassCounts {
  confirmedCount: number;
  waitlistCount: number;
}

export function serializeClass<T extends FitnessClass>(cls: T, counts?: ClassCounts) {
  const confirmedCount = counts?.confirmedCount ?? 0;
  const waitlistCount = counts?.waitlistCount ?? 0;
  return {
    ...cls,
    price: Number(cls.price),
    confirmedCount,
    waitlistCount,
    availableSeats: Math.max(0, cls.capacity - confirmedCount),
    isFull: confirmedCount >= cls.capacity,
  };
}
