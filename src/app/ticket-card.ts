import { Component, computed, input, output } from '@angular/core';
import { STATUS_LABEL, type Ticket } from '../shared/types';

@Component({
    selector: 'app-ticket-card',
    template: `
        <button type="button" class="card" (click)="open.emit()">
            <span class="card-priority">{{ ticket().position + 1 }}</span>
            <span class="card-title" [title]="ticket().title">{{ ticket().title }}</span>
            <span class="card-status" [class]="'status-' + ticket().status"> <span class="status-dot"></span>{{ statusLabel() }} </span>
        </button>
    `,
})
export class TicketCard {
    readonly ticket = input.required<Ticket>();
    readonly open = output<void>();
    protected readonly statusLabel = computed(() => STATUS_LABEL[this.ticket().status]);
}
