import { Component, input, output } from '@angular/core';
import type { Ticket } from '../shared/types';
import { AddTicket } from './add-ticket';
import { TicketCard } from './ticket-card';

/** One list of tickets: a day column or the backlog. */
@Component({
  selector: 'app-ticket-list',
  imports: [TicketCard, AddTicket],
  template: `
    <section class="list" [class.is-today]="isToday()" [class.is-past]="isPast()">
      <header class="list-heading">{{ heading() }}</header>
      <div class="cards">
        @for (t of tickets(); track t.id) {
          <app-ticket-card [ticket]="t" (open)="open.emit(t.id)" />
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
}
