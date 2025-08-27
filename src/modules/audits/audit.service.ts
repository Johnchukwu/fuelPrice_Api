

import { AuditLog } from "./audit.model"
export async function writeAudit(e: { action: string, entity: string, entity_id: string, before?: any, after?: any, actor_id?: string, actor_role?: string, ip?: string, user_agent?: string }) {
  await AuditLog.create(e)
}
