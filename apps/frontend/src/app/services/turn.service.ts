import { Injectable, inject } from '@angular/core';
import type {
  MyTurnsResponse,
  ScanCodeInfo,
  ScanResult,
  TaskTurn,
  TaskTurnsResponse,
  TurnHistoryEntry,
  TurnHistoryResponse,
} from '@st44/types';
import { ApiService } from './api.service';

/** Public address of the chore's QR code and NFC sticker (ST-2075) */
export const SCAN_LINK_BASE = 'https://home.st44.no/s/';

export function scanLink(code: string): string {
  return `${SCAN_LINK_BASE}${code}`;
}

/** The child in the order after the one whose turn it is, round the list */
export function nextInTurn(turn: TaskTurn, offset = 1): TaskTurn['order'][number] | null {
  const n = turn.order.length;
  if (n === 0) return null;
  const at = turn.order.findIndex((c) => c.childId === turn.turnChildId);
  return turn.order[((((at < 0 ? -1 : at) + offset) % n) + n) % n] ?? null;
}

export function turnChild(turn: TaskTurn): TaskTurn['order'][number] | null {
  return turn.order.find((c) => c.childId === turn.turnChildId) ?? null;
}

/**
 * «Etter tur» chores (ST-2075): whose turn it is, the scan of the printed code, the
 * parent's history and moving the turn by hand.
 */
@Injectable({ providedIn: 'root' })
export class TurnService {
  private readonly api = inject(ApiService);

  /** The signed-in child's household, and which child they are */
  myTurns(): Promise<MyTurnsResponse> {
    return this.api.get<MyTurnsResponse>('/children/me/turns');
  }

  async turns(householdId: string): Promise<TaskTurn[]> {
    const { turns } = await this.api.get<TaskTurnsResponse>(`/households/${householdId}/turns`);
    return turns;
  }

  async history(householdId: string, taskId: string): Promise<TurnHistoryEntry[]> {
    const { history } = await this.api.get<TurnHistoryResponse>(
      `/households/${householdId}/tasks/${taskId}/turn-history`,
    );
    return history;
  }

  moveTurn(householdId: string, taskId: string, childId: string): Promise<TaskTurn> {
    return this.api.post<TaskTurn>(`/households/${householdId}/tasks/${taskId}/turn`, {
      childId,
    });
  }

  scanInfo(code: string): Promise<ScanCodeInfo> {
    return this.api.get<ScanCodeInfo>(`/scan/${encodeURIComponent(code)}`);
  }

  scan(code: string): Promise<ScanResult> {
    return this.api.post<ScanResult>(`/scan/${encodeURIComponent(code)}`, {});
  }
}
