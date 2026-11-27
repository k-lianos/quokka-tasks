import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { Component, computed, inject, input } from '@angular/core';
import { nowTicket, upNextToIndex } from '../domain/day';
import { canDropInto } from '../domain/drop';
import { listOf, updateTicket } from '../domain/tickets';
import { AddTicket } from './add-ticket';
import { Board } from './board';
import { DayRow } from './day-row';
import { NowBlock } from './now-block';
import { TasksStore } from './tasks.store';

/** Ignore a click that arrives this soon after a drag ends (the drop itself can produce one). */
const CLICK_AFTER_DRAG_MS = 150;

/** One day: on today, the Now ticket, then Up next and Done. Other days: Planned and Done. Past days are read-only. */
@Component({
    selector: 'app-day-page',
    imports: [NowBlock, DayRow, AddTicket, CdkDropList, CdkDrag, CdkDragPlaceholder, CdkScrollable],
    template: `
        <!-- cdkScrollable: the page (not the drop list) scrolls, and drag and drop must know to keep drops accurate. -->
        <div class="day-page" cdkScrollable>
            @if (isToday()) {
                <app-now-block [ticket]="now()" [emptyMessage]="tickets().length ? 'All done for today' : 'Nothing planned for today'" />
            }

            @if (!isPast()) {
                <section class="day-section">
                    <h2 class="day-section-heading">{{ isToday() ? 'Up next' : 'Planned' }}</h2>
                    <!-- Now is shown above, not in this list, so drop indexes are mapped with upNextToIndex. -->
                    <div
                        class="day-cards"
                        cdkDropList
                        [cdkDropListData]="listKey()"
                        [cdkDropListEnterPredicate]="acceptsDrop"
                        (cdkDropListDropped)="onDrop($event)"
                    >
                        @for (t of upNext(); track t.id) {
                            <app-day-row
                                cdkDrag
                                [cdkDragData]="t.id"
                                [ticket]="t"
                                [showStart]="t.status === 'pending'"
                                (cdkDragEnded)="lastDragEnd = nowMs()"
                                (open)="onOpen(t.id)"
                                (start)="start(t.id)"
                            >
                                <div *cdkDragPlaceholder class="card-placeholder"></div>
                            </app-day-row>
                        } @empty {
                            <p class="drop-hint">Drag tickets here from the backlog</p>
                        }
                    </div>
                    <app-add-ticket [date]="date()" />
                </section>
            }

            @if (done().length) {
                <section class="day-section">
                    <h2 class="day-section-heading">Done</h2>
                    @for (t of done(); track t.id) {
                        <app-day-row class="is-locked" [ticket]="t" (open)="board.open(t.id)" />
                    }
                </section>
            } @else if (isPast()) {
                <p class="day-empty">Nothing was planned for this day.</p>
            }
        </div>
    `,
})
export class DayPage {
    readonly date = input.required<string>();

    protected readonly board = inject(Board);
    private readonly store = inject(TasksStore);

    /** Drop-list data shares the backlog's type (null = backlog), so Board.drop can take drops from either. */
    protected readonly listKey = computed<string | null>(() => this.date());
    protected readonly isToday = computed(() => this.date() === this.store.today());
    protected readonly isPast = computed(() => this.date() < this.store.today());
    protected readonly tickets = computed(() => listOf(this.store.tickets(), this.date()));
    private readonly open = computed(() => this.tickets().filter(t => t.status !== 'completed'));
    protected readonly now = computed(() => (this.isToday() ? nowTicket(this.store.tickets(), this.date()) : null));
    protected readonly upNext = computed(() => this.open().filter(t => t.id !== this.now()?.id));
    protected readonly done = computed(() => this.tickets().filter(t => t.status === 'completed'));

    protected lastDragEnd = 0;
    protected readonly nowMs = Date.now;

    protected readonly acceptsDrop = (): boolean => canDropInto(this.date(), this.store.today());

    protected onDrop(e: CdkDragDrop<string | null>): void {
        const others = this.open()
            .map(t => t.id)
            .filter(id => id !== e.item.data);
        this.board.drop(e, upNextToIndex(others, this.now()?.id ?? null, e.currentIndex));
    }

    protected onOpen(id: string): void {
        if (Date.now() - this.lastDragEnd < CLICK_AFTER_DRAG_MS) return;
        this.board.open(id);
    }

    protected start(id: string): void {
        void this.store.change(t => updateTicket(t, id, { status: 'in_progress' }, new Date().toISOString()));
    }
}
