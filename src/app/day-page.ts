import { Component, computed, inject, input } from '@angular/core';
import { formatDayHeader } from '../domain/dates';
import { listOf } from '../domain/tickets';
import { Board } from './board';
import { TasksStore } from './tasks.store';
import { TicketList } from './ticket-list';

/** One day. Interim version: the day's list as in the week view. */
@Component({
  selector: 'app-day-page',
  imports: [TicketList],
  template: `
    <app-ticket-list
      [heading]="heading()"
      [date]="date()"
      [tickets]="tickets()"
      [isToday]="date() === store.today()"
      [isPast]="date() < store.today()"
      (open)="board.open($event)"
      (dropped)="board.drop($event)"
    />
  `,
})
export class DayPage {
  readonly date = input.required<string>();

  protected readonly board = inject(Board);
  protected readonly store = inject(TasksStore);
  protected readonly heading = computed(() => formatDayHeader(this.date()));
  protected readonly tickets = computed(() => listOf(this.store.tickets(), this.date()));
}
