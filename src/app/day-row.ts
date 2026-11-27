import { Component, computed, input, output } from '@angular/core';
import { STATUS_LABEL, type Ticket } from '../shared/types';

/** One ticket in the Day view: priority, title, first line of the description, status, and Start. */
@Component({
    selector: 'app-day-row',
    template: `
        <div class="day-row">
            <button type="button" class="day-row-main" (click)="open.emit()">
                <span class="card-priority">{{ ticket().position + 1 }}</span>
                <span class="day-row-text">
                    <span class="day-row-title" [title]="ticket().title">{{ ticket().title }}</span>
                    @if (firstLine()) {
                        <span class="day-row-desc">{{ firstLine() }}</span>
                    }
                </span>
            </button>
            <span class="card-status" [class]="'status-' + ticket().status"> <span class="status-dot"></span>{{ statusLabel() }} </span>
            @if (showStart()) {
                <button type="button" class="button day-row-start" (click)="start.emit()">Start</button>
            }
        </div>
    `,
})
export class DayRow {
    readonly ticket = input.required<Ticket>();
    readonly showStart = input(false);
    readonly open = output<void>();
    readonly start = output<void>();

    protected readonly statusLabel = computed(() => STATUS_LABEL[this.ticket().status]);
    protected readonly firstLine = computed(
        () =>
            this.ticket()
                .description.split('\n')
                .find(l => l.trim()) ?? '',
    );
}
