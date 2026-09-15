import type { OplActionReceipt } from '../bridge/oplBridge';

export type ActionReceiptView = { actionId: string; status: string; receiptId?: string; owner?: string; summary?: string; affectedFiles?: { name: string; bytes: number }[]; affectedCategories: string[]; nextStep?: string };
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const safeText = (value: unknown): string | undefined => typeof value === 'string' && !/(?:sk-[\w-]+|bearer\s|password|api[_ -]?key|token\s*[:=]|secret\s*[:=])/i.test(value) ? value.slice(0, 2000) : undefined;
// Never render raw command args, payload, stdout or stderr in a receipt/diagnostic summary.
export function actionReceiptView(receipt: OplActionReceipt): ActionReceiptView {
  const root = record(receipt.stdoutJson);
  const execution = record(root.app_action_execution);
  const result = record(execution.result ?? root.result);
  return { actionId: receipt.actionId, status: receipt.status, receiptId: safeText(receipt.receiptId),
    owner: safeText(result.owner ?? execution.owner), summary: safeText(result.summary), nextStep: safeText(result.next_visible_step),
    affectedFiles: Array.isArray(result.files) ? result.files.slice(0, 2000).flatMap(value => { const row = record(value); const name = safeText(row.name); return name && typeof row.bytes === 'number' ? [{ name, bytes: row.bytes }] : []; }) : undefined,
    affectedCategories: Array.isArray(result.affected_categories) ? result.affected_categories.flatMap(value => safeText(value) ?? []) : [],
  };
}
