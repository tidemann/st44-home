import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

/** The parent's view of the newest invitation for a child (ST-1678) */
export interface ChildInvitation {
  id: string;
  email: string;
  token: string;
  status: 'pending' | 'expired' | 'cancelled' | 'accepted';
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

/** What the child's page reads from the link */
export interface ChildInvitationInfo {
  state: 'valid' | 'expired' | 'cancelled' | 'used';
  inviterName: string;
  expiresAt: string;
  email?: string;
  childName?: string;
  householdName?: string;
  points?: number;
}

/**
 * Child invitations: a parent makes a 7-day link for an existing child profile, and the child
 * sets their own password on it. No e-mail is sent yet (ST-1362); the parent copies the link.
 */
@Injectable({ providedIn: 'root' })
export class ChildInvitationService {
  private readonly api = inject(ApiService);

  async get(householdId: string, childId: string): Promise<ChildInvitation | null> {
    const res = await this.api.get<{ invitation: ChildInvitation | null }>(
      `/households/${householdId}/children/${childId}/invitation`,
    );
    return res.invitation;
  }

  /** Makes a new link; an older pending link for the child stops working */
  async create(householdId: string, childId: string, email: string): Promise<ChildInvitation> {
    const res = await this.api.post<{ invitation: ChildInvitation }>(
      `/households/${householdId}/children/${childId}/invitation`,
      { email },
    );
    return res.invitation;
  }

  async cancel(householdId: string, childId: string): Promise<void> {
    await this.api.delete<void>(`/households/${householdId}/children/${childId}/invitation`);
  }

  async info(token: string): Promise<ChildInvitationInfo> {
    return this.api.get<ChildInvitationInfo>(`/child-invitations/${token}`);
  }

  async accept(token: string, password: string): Promise<{ email: string }> {
    return this.api.post<{ email: string }>(`/child-invitations/${token}/accept`, { password });
  }

  /** The link the child opens, under the app's own locale prefix (/no/) */
  linkFor(token: string): string {
    return new URL(`invitasjon/${token}`, document.baseURI).href;
  }

  /** The link as the field shows it: without the scheme, as drawn */
  displayLink(token: string): string {
    return this.linkFor(token).replace(/^https?:\/\//, '');
  }

  async copyLink(token: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(this.linkFor(token));
      return true;
    } catch {
      return false;
    }
  }
}

/** «tirsdag 27. oktober» */
export function formatWeekdayDate(iso: string): string {
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

/** «18. oktober» */
export function formatDayMonth(iso: string): string {
  return new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long' }).format(
    new Date(iso),
  );
}
