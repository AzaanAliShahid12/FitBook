import { prisma } from '../config/db';

export async function audit(
  userId: string | null,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.auditLog.create({
      data: { userId: userId ?? undefined, action, entity, entityId, metadata: metadata as object },
    });
  } catch {
    // Audit logging must never break the main flow.
  }
}
