import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, effect, inject, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { formatDayHeading, formatWeekHeading } from '../domain/dates';
import { dayProgress } from '../domain/day';
import { listOf } from '../domain/tickets';
import { followToday, parseViewUrl, stepView, switchView, todayView, viewUrl, type View } from '../domain/views';
import { AppHeader } from './app-header';
import { Board } from './board';
import { FocusView } from './focus-view';
import { TasksStore } from './tasks.store';
import { TicketList } from './ticket-list';
import { WindowControls } from './window-controls';

/** The shell: title bar, banners, the routed page (day or week) beside the backlog, and the ticket editor. */
@Component({
    selector: 'app-root',
    imports: [AppHeader, WindowControls, TicketList, FocusView, CdkDropListGroup, RouterOutlet],
    template: `
        @if (store.loadError(); as error) {
            <div class="title-bar title-strip"><app-window-controls /></div>
            <div class="banner banner-error">{{ error }}</div>
        } @else if (!store.loaded()) {
            <div class="title-bar title-strip"><app-window-controls /></div>
            <p class="loading">Loading…</p>
        } @else {
            <app-header
                [eyebrow]="heading().eyebrow"
                [title]="heading().title"
                [kind]="current().kind"
                [progress]="progress()"
                (prev)="go(stepView(current(), -1))"
                (next)="go(stepView(current(), 1))"
                (today)="go(todayView(current().kind, store.today()))"
                (switchKind)="go(switchView(current(), store.today()))"
            />
            @if (store.notice(); as notice) {
                <div class="banner">
                    <span>{{ notice }}</span>
                    <button type="button" class="icon-button" (click)="store.dismissNotice()" aria-label="Dismiss">
                        <svg
                            class="icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                        >
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>
            }
            @if (store.saveError()) {
                <div class="banner banner-error">Couldn't save — your latest changes are not on disk</div>
            }
            <!-- The drop-list group spans the routed page and the backlog, so lists in both are connected. -->
            <main class="board" cdkDropListGroup>
                <router-outlet />
                <app-ticket-list
                    class="backlog"
                    heading="Backlog"
                    [date]="null"
                    [tickets]="backlog()"
                    (open)="board.open($event)"
                    (dropped)="board.drop($event)"
                />
            </main>
            @if (openedTicket(); as ticket) {
                <app-focus-view [ticket]="ticket" (closed)="board.close()" />
            }
        }
    `,
})
export class App {
    protected readonly store = inject(TasksStore);
    protected readonly board = inject(Board);
    private readonly router = inject(Router);
    protected readonly stepView = stepView;
    protected readonly switchView = switchView;
    protected readonly todayView = todayView;

    /** The view in the URL; null only before the first navigation settles. */
    private readonly view = toSignal(
        this.router.events.pipe(
            filter(e => e instanceof NavigationEnd),
            map(() => parseViewUrl(this.router.url)),
        ),
        { initialValue: parseViewUrl(this.router.url) },
    );
    protected readonly current = computed<View>(() => this.view() ?? todayView('day', this.store.today()));

    protected readonly heading = computed(() => {
        const v = this.current();
        if (v.kind === 'day') return formatDayHeading(v.date, this.store.today());
        const { eyebrow, range } = formatWeekHeading(v.weekStart);
        return { eyebrow, title: range };
    });
    protected readonly progress = computed(() => {
        const v = this.current();
        if (v.kind !== 'day') return null;
        const p = dayProgress(this.store.tickets(), v.date);
        return p.total === 0 ? null : p;
    });
    protected readonly backlog = computed(() => listOf(this.store.tickets(), null));
    protected readonly openedTicket = computed(() => {
        const id = this.board.openTicketId();
        return id ? (this.store.tickets().find(t => t.id === id) ?? null) : null;
    });
    private readonly focusView = viewChild(FocusView);

    constructor() {
        void this.store.init();
        // Before the window closes, save whatever is still being typed in the ticket editor.
        window.api.onFlushRequest(() => this.focusView()?.flush() ?? Promise.resolve());

        // When the date changes while the app is open, follow to the new day/week if the user was on the old one.
        let previousToday = this.store.today();
        effect(() => {
            const today = this.store.today();
            if (today === previousToday) return;
            const oldToday = previousToday;
            previousToday = today;
            const v = untracked(this.view);
            if (!v) return;
            const next = followToday(v, oldToday, today);
            if (next !== v) void this.router.navigateByUrl(viewUrl(next), { replaceUrl: true });
        });
    }

    protected go(v: View): void {
        void this.router.navigateByUrl(viewUrl(v));
    }
}
