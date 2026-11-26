import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject, input, output } from '@angular/core';
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
        [cdkDropListSortPredicate]="sortAbovePile"
        (cdkDropListDropped)="dropped.emit($event)"
      >
        @for (t of tickets(); track t.id) {
          <app-ticket-card
            cdkDrag
            [cdkDragData]="t.id"
            [cdkDragDisabled]="t.status === 'completed'"
            [ticket]="t"
            (cdkDragEnded)="lastDragEnd = now()"
            (open)="onOpen(t.id)"
          >
            <div *cdkDragPlaceholder class="card-placeholder"></div>
          </app-ticket-card>
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

  private readonly store = inject(TasksStore);
  protected lastDragEnd = 0;
  protected readonly now = Date.now;

  /** Refuses both the empty area and the cards of a past day. */
  protected readonly acceptsDrop = (): boolean => canDropInto(this.date(), this.store.today());

  /** The drag placeholder may not go below the last open ticket. */
  protected readonly sortAbovePile = (index: number, drag: CdkDrag): boolean => {
    const list = this.tickets();
    const openCount = list.filter((t) => t.status !== 'completed').length;
    const fromHere = list.some((t) => t.id === drag.data);
    return index <= openCount - (fromHere ? 1 : 0);
  };

  protected onOpen(id: string): void {
    if (Date.now() - this.lastDragEnd < CLICK_AFTER_DRAG_MS) return;
    this.open.emit(id);
  }
}
