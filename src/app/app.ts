import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { addDays, formatDayHeader, formatWeekLabel, nextViewedWeek, startOfWeek, weekDates } from '../domain/dates';
import { listOf } from '../domain/tickets';
import { TasksStore } from './tasks.store';
import { TicketList } from './ticket-list';
import { WeekHeader } from './week-header';

@Component({
  selector: 'app-root',
  imports: [WeekHeader, TicketList],
  template: `
    @if (store.loadError(); as error) {
      <div class="banner banner-error">{{ error }}</div>
    } @else if (!store.loaded()) {
      <p class="loading">Loading…</p>
    } @else {
      @if (store.notice(); as notice) {
        <div class="banner">
          <span>{{ notice }}</span>
          <button type="button" (click)="store.dismissNotice()" aria-label="Dismiss">✕</button>
        </div>
      }
      @if (store.saveError()) {
        <div class="banner banner-error">Couldn't save — your latest changes are not on disk</div>
      }
      <app-week-header
        [label]="weekLabel()"
        (prev)="viewedWeekStart.set(addDays(viewedWeekStart(), -7))"
        (next)="viewedWeekStart.set(addDays(viewedWeekStart(), 7))"
        (today)="viewedWeekStart.set(startOfWeek(store.today()))"
      />
      <main class="board">
        <div class="week">
          @for (day of days(); track day.date) {
            <app-ticket-list
              [heading]="day.heading"
              [date]="day.date"
              [tickets]="day.tickets"
              [isToday]="day.isToday"
              [isPast]="day.isPast"
              (open)="openTicket($event)"
            />
          }
        </div>
        <app-ticket-list class="backlog" heading="Backlog" [date]="null" [tickets]="backlog()" (open)="openTicket($event)" />
      </main>
    }
  `,
})
export class App {
  protected readonly store = inject(TasksStore);
  protected readonly addDays = addDays;
  protected readonly startOfWeek = startOfWeek;

  protected readonly viewedWeekStart = signal(startOfWeek(this.store.today()));
  protected readonly openTicketId = signal<string | null>(null);

  protected readonly weekLabel = computed(() => formatWeekLabel(this.viewedWeekStart()));
  protected readonly days = computed(() => {
    const today = this.store.today();
    const tickets = this.store.tickets();
    return weekDates(this.viewedWeekStart()).map((date) => ({
      date,
      heading: formatDayHeader(date),
      tickets: listOf(tickets, date),
      isToday: date === today,
      isPast: date < today,
    }));
  });
  protected readonly backlog = computed(() => listOf(this.store.tickets(), null));

  constructor() {
    void this.store.init();

    // When the date changes while the app is open, follow to the new week if the user was on "this week".
    let previousToday = this.store.today();
    effect(() => {
      const today = this.store.today();
      if (today !== previousToday) {
        const viewed = untracked(this.viewedWeekStart);
        this.viewedWeekStart.set(nextViewedWeek(viewed, previousToday, today));
        previousToday = today;
      }
    });
  }

  protected openTicket(id: string): void {
    this.openTicketId.set(id);
  }
}
