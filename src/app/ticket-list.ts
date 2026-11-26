import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input, output } from '@angular/core';
import { canDropInto } from '../domain/drop';
import type { Ticket } from '../shared/types';
import { AddTicket } from './add-ticket';
import { TasksStore } from './tasks.store';
import { TicketCard } from './ticket-card';

/** Ignore a click that arrives this soon after a drag ends (the drop itself can produce one). */
const CLICK_AFTER_DRAG_MS = 150;

/** One list of tickets: a day column or the backlog. Also a drop target for drag and drop. */
@Component({
  selector: 'app-ticket-list',
  imports: [TicketCard, AddTicket, CdkDropList, CdkDrag, CdkDragPlaceholder],
  template: `
    <section class="list" [class.is-today]="isToday()" [class.is-past]="isPast()">
      <header class="list-heading">{{ heading() }}</header>
      <div
        class="cards"
        cdkDropList
        [cdkDropListData]="date()"
        [cdkDropListEnterPredicate]="acceptsDrop"
        [cdkDropListSortingDisabled]="isPast()"
        (cdkDropListDropped)="dropped.emit($event)"
      >
        <!-- Only open tickets are drag items, so CDK's indexes match the domain's. Completed cards
             are plain children with CSS order: 1, so a placeholder CDK appends at the end of the
             list still shows above the pile. -->
        @for (t of openTickets(); track t.id) {
          <app-ticket-card
            cdkDrag
            [cdkDragData]="t.id"
            [ticket]="t"
            (cdkDragEnded)="lastDragEnd = now()"
            (open)="onOpen(t.id)"
          >
            <div *cdkDragPlaceholder class="card-placeholder"></div>
          </app-ticket-card>
        }
        @for (t of completedTickets(); track t.id) {
          <app-ticket-card class="is-locked" [ticket]="t" (open)="onOpen(t.id)" />
        }
      </div>
      @if (!isPast()) {
        <app-add-ticket [date]="date()" />
      }
    </section>
  `,
})
export class TicketList {
  readonly heading = input.required<string>();
  readonly date = input.required<string | null>();
  readonly tickets = input.required<Ticket[]>();
  readonly isToday = input(false);
  readonly isPast = input(false);
  readonly open = output<string>();
  readonly dropped = output<CdkDragDrop<string | null>>();

  /** The store keeps completed tickets last, so these two are the list split at the pile. */
  protected readonly openTickets = computed(() => this.tickets().filter((t) => t.status !== 'completed'));
  protected readonly completedTickets = computed(() => this.tickets().filter((t) => t.status === 'completed'));

  private readonly store = inject(TasksStore);
  protected lastDragEnd = 0;
  protected readonly now = Date.now;

  /** Refuses both the empty area and the cards of a past day. */
  protected readonly acceptsDrop = (): boolean => canDropInto(this.date(), this.store.today());

  protected onOpen(id: string): void {
    if (Date.now() - this.lastDragEnd < CLICK_AFTER_DRAG_MS) return;
    this.open.emit(id);
  }
}
