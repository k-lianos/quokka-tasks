import { Component, computed, inject, input } from '@angular/core';
import { formatDayHeader, weekDates } from '../domain/dates';
import { listOf } from '../domain/tickets';
import { viewUrl } from '../domain/views';
import { Board } from './board';
import { TasksStore } from './tasks.store';
import { TicketList } from './ticket-list';

/** Seven day columns, Monday to Sunday. The route param is the week's Monday. */
@Component({
  selector: 'app-week-page',
  imports: [TicketList],
  host: { class: 'week' },
  template: `
    @for (day of days(); track day.date) {
      <app-ticket-list
        [heading]="day.heading"
        [headingLink]="day.link"
        [date]="day.date"
        [tickets]="day.tickets"
        [isToday]="day.isToday"
        [isPast]="day.isPast"
        (open)="board.open($event)"
        (dropped)="board.drop($event)"
      />
    }
  `,
})
export class WeekPage {
  readonly weekStart = input.required<string>();

  protected readonly board = inject(Board);
  private readonly store = inject(TasksStore);

  protected readonly days = computed(() => {
    const today = this.store.today();
    const tickets = this.store.tickets();
    return weekDates(this.weekStart()).map((date) => ({
      date,
      heading: formatDayHeader(date),
      link: viewUrl({ kind: 'day', date }),
      tickets: listOf(tickets, date),
      isToday: date === today,
      isPast: date < today,
    }));
  });
}
