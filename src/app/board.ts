import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Injectable, inject, signal } from '@angular/core';
import { canDropInto } from '../domain/drop';
import { moveTicket } from '../domain/tickets';
import { TasksStore } from './tasks.store';

/** Shared by the shell and the routed pages: which ticket the editor shows, and drag-and-drop moves. */
@Injectable({ providedIn: 'root' })
export class Board {
  private readonly store = inject(TasksStore);
  readonly openTicketId = signal<string | null>(null);

  open(id: string): void {
    this.openTicketId.set(id);
  }

  close(): void {
    this.openTicketId.set(null);
  }

  /** `toIndex` defaults to CDK's currentIndex, the final index in the target list, which is what moveTicket expects.
   *  Lists that hide a ticket (the Day view's Now) pass a mapped index instead. */
  drop(e: CdkDragDrop<string | null>, toIndex: number = e.currentIndex): void {
    const to = e.container.data;
    // Released outside any list that accepts it (e.g. over a past day): cancel, keep the old place.
    if (!e.isPointerOverContainer) return;
    if (!canDropInto(to, this.store.today())) return;
    if (e.container === e.previousContainer && e.currentIndex === e.previousIndex) return;
    const id = e.item.data as string;
    void this.store.change((t) => moveTicket(t, id, to, toIndex, new Date().toISOString()));
  }
}
