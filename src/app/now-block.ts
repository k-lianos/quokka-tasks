import { Component, computed, inject, input } from '@angular/core';
import { updateTicket } from '../domain/tickets';
import { STATUS_LABEL, type Status, type Ticket } from '../shared/types';
import { Board } from './board';
import { TasksStore } from './tasks.store';

/** Today's "Now" ticket (picked by nowTicket) with its full description and one-click actions. */
@Component({
    selector: 'app-now-block',
    template: `
        <section class="now-block" aria-label="Now">
            @if (ticket(); as t) {
                <div class="now-head">
                    <span class="now-eyebrow">Now</span>
                    <span class="card-status" [class]="'status-' + t.status"><span class="status-dot"></span>{{ statusLabel() }}</span>
                </div>
                <button type="button" class="now-title" (click)="board.open(t.id)">
                    <span class="now-priority">{{ t.position + 1 }}</span>
                    <span>{{ t.title }}</span>
                </button>
                @if (t.description.trim()) {
                    <p class="now-description">{{ t.description }}</p>
                }
                <div class="now-actions">
                    @if (t.status === 'pending') {
                        <button type="button" class="button button-primary" (click)="setStatus(t.id, 'in_progress')">Start</button>
                    }
                    <button
                        type="button"
                        class="button"
                        [class.button-primary]="t.status !== 'pending'"
                        (click)="setStatus(t.id, 'completed')"
                    >
                        Done → next
                    </button>
                    <button type="button" class="button" (click)="board.open(t.id)">Open</button>
                </div>
            } @else {
                <p class="now-empty">{{ emptyMessage() }}</p>
            }
        </section>
    `,
})
export class NowBlock {
    readonly ticket = input.required<Ticket | null>();
    readonly emptyMessage = input.required<string>();

    protected readonly board = inject(Board);
    private readonly store = inject(TasksStore);
    protected readonly statusLabel = computed(() => {
        const t = this.ticket();
        return t ? STATUS_LABEL[t.status] : '';
    });

    protected setStatus(id: string, status: Status): void {
        void this.store.change(t => updateTicket(t, id, { status }, new Date().toISOString()));
    }
}
