import { CdkDragDrop, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { addDays, formatDayHeader, formatWeekHeading, nextViewedWeek, startOfWeek, weekDates } from '../domain/dates';
import { canDropInto } from '../domain/drop';
import { listOf, moveTicket } from '../domain/tickets';
import { FocusView } from './focus-view';
import { TasksStore } from './tasks.store';
import { TicketList } from './ticket-list';
import { WeekHeader } from './week-header';
import { WindowControls } from './window-controls';

@Component({
  selector: 'app-root',
  imports: [WeekHeader, WindowControls, TicketList, FocusView, CdkDropListGroup],
  template: `
    @if (store.loadError(); as error) {
      <div class="title-bar title-strip"><app-window-controls /></div>
      <div class="banner banner-error">{{ error }}</div>
    } @else if (!store.loaded()) {
      <div class="title-bar title-strip"><app-window-controls /></div>
      <p class="loading">Loading…</p>
    } @else {
      <app-week-header
        [heading]="weekHeading()"
        (prev)="viewedWeekStart.set(addDays(viewedWeekStart(), -7))"
        (next)="viewedWeekStart.set(addDays(viewedWeekStart(), 7))"
        (today)="viewedWeekStart.set(startOfWeek(store.today()))"
      />
      @if (store.notice(); as notice) {
        <div class="banner">
          <span>{{ notice }}</span>
          <button type="button" class="icon-button" (click)="store.dismissNotice()" aria-label="Dismiss"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
      }
      @if (store.saveError()) {
        <div class="banner banner-error">Couldn't save — your latest changes are not on disk</div>
      }
      <main class="board" cdkDropListGroup>
        <div class="week">
          @for (day of days(); track day.date) {
            <app-ticket-list
              [heading]="day.heading"
              [date]="day.date"
              [tickets]="day.tickets"
              [isToday]="day.isToday"
              [isPast]="day.isPast"
              (open)="openTicket($event)"
              (dropped)="onDrop($event)"
            />
          }
        </div>
        <app-ticket-list class="backlog" heading="Backlog" [date]="null" [tickets]="backlog()"
          (open)="openTicket($event)"
          (dropped)="onDrop($event)"
        />
      </main>
      @if (openedTicket(); as ticket) {
        <app-focus-view [ticket]="ticket" (closed)="openTicketId.set(null)" />
      }
    }
  `,
})
export class App {
  protected readonly store = inject(TasksStore);
  protected readonly addDays = addDays;
  protected readonly startOfWeek = startOfWeek;

  protected readonly viewedWeekStart = signal(startOfWeek(this.store.today()));
  protected readonly openTicketId = signal<string | null>(null);

  protected readonly weekHeading = computed(() => formatWeekHeading(this.viewedWeekStart()));
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
  protected readonly openedTicket = computed(() => {
    const id = this.openTicketId();
    return id ? (this.store.tickets().find((t) => t.id === id) ?? null) : null;
  });
  private readonly focusView = viewChild(FocusView);

  constructor() {
    void this.store.init();
    // Before the window closes, save whatever is still being typed in the focus view.
    window.api.onFlushRequest(() => this.focusView()?.flush() ?? Promise.resolve());

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

  /** CDK's currentIndex is the final index in the target list, which is exactly moveTicket's toIndex. */
  protected onDrop(e: CdkDragDrop<string | null>): void {
    const to = e.container.data;
    // Released outside any list that accepts it (e.g. over a past day): cancel, keep the old place.
    if (!e.isPointerOverContainer) return;
    if (!canDropInto(to, this.store.today())) return;
    if (e.container === e.previousContainer && e.currentIndex === e.previousIndex) return;
    const id = e.item.data as string;
    void this.store.change((t) => moveTicket(t, id, to, e.currentIndex, new Date().toISOString()));
  }
}
