import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { formatLongDate, formatTimestamp } from '../domain/dates';
import { deleteTicket, isDateAllowed, saveTicketEdits } from '../domain/tickets';
import { STATUS_LABEL, STATUSES, type Status, type Ticket } from '../shared/types';
import { ConfirmDialog } from './confirm-dialog';
import { TasksStore } from './tasks.store';

/** Modal editor for one ticket. Edits are drafts until Save; closing without saving discards them. */
@Component({
    selector: 'app-focus-view',
    imports: [ConfirmDialog],
    host: { '(document:keydown.escape)': 'onEscape()' },
    template: `
        <div class="dialog-backdrop" (click)="onBackdropClick($event)">
            <div class="dialog focus-view" role="dialog" aria-modal="true" aria-label="Ticket">
                <div class="focus-header">
                    <span class="focus-date">{{ dateLabel() }}</span>
                    <button type="button" class="icon-button" (click)="close()" aria-label="Close">
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

                <label class="field">
                    <span>Title</span>
                    <input type="text" [value]="title()" (input)="title.set($any($event.target).value)" />
                </label>
                @if (titleInvalid()) {
                    <p class="field-error">Title is required</p>
                }

                <label class="field">
                    <span>Status</span>
                    <select [value]="status()" (change)="setStatus($any($event.target).value)">
                        @for (s of statuses; track s) {
                            <option [value]="s" [selected]="s === status()">{{ statusLabel[s] }}</option>
                        }
                    </select>
                </label>

                <div class="field">
                    <span id="focus-date-label">Date</span>
                    <div class="field-date">
                        <input
                            #dateInput
                            type="date"
                            aria-labelledby="focus-date-label"
                            [value]="date() ?? ''"
                            [attr.min]="minDate()"
                            [disabled]="date() === null"
                            (change)="onDateInput(dateInput)"
                        />
                        <label class="checkbox">
                            <input type="checkbox" [checked]="date() === null" (change)="setBacklog($any($event.target).checked)" />
                            No date (backlog)
                        </label>
                    </div>
                </div>
                @if (dateNote()) {
                    <p class="field-note">Past dates are only for completed tickets</p>
                }

                <label class="field field-grow">
                    <span>Description</span>
                    <textarea [value]="description()" (input)="description.set($any($event.target).value)"></textarea>
                </label>

                <p class="focus-meta">Created {{ created() }} · Updated {{ updated() }}</p>

                <div class="dialog-actions">
                    <button type="button" class="button button-danger" (click)="confirming.set(true)">Delete</button>
                    <button type="button" class="button button-primary" [disabled]="titleInvalid()" (click)="save()">Save</button>
                </div>
            </div>
        </div>
        @if (confirming()) {
            <app-confirm-dialog
                message="Delete this ticket? This can't be undone."
                confirmLabel="Delete"
                (confirmed)="remove()"
                (cancelled)="confirming.set(false)"
            />
        }
    `,
})
export class FocusView {
    readonly ticket = input.required<Ticket>();
    readonly closed = output<void>();

    private readonly store = inject(TasksStore);
    protected readonly statuses = STATUSES;
    protected readonly statusLabel = STATUS_LABEL;

    protected readonly title = signal('');
    protected readonly description = signal('');
    protected readonly status = signal<Status>('pending');
    protected readonly date = signal<string | null>(null);
    protected readonly dateNote = signal(false);
    protected readonly confirming = signal(false);
    protected readonly minDate = computed(() => (this.status() === 'completed' ? null : this.store.today()));
    protected readonly created = computed(() => formatTimestamp(this.ticket().createdAt));
    protected readonly updated = computed(() => formatTimestamp(this.ticket().updatedAt));
    protected readonly titleInvalid = computed(() => !this.title().trim());
    protected readonly dateLabel = computed(() => {
        const date = this.ticket().date;
        return date ? formatLongDate(date) : 'Backlog';
    });

    constructor() {
        // Load the drafts when a (different) ticket is shown; our own saves don't reset what's being edited.
        effect(() => {
            this.ticket().id;
            untracked(() => {
                this.title.set(this.ticket().title);
                this.description.set(this.ticket().description);
                this.status.set(this.ticket().status);
                this.date.set(this.ticket().date);
                this.dateNote.set(false);
            });
        });
    }

    protected save(): void {
        if (this.titleInvalid()) return;
        const id = this.ticket().id;
        const edits = { title: this.title(), description: this.description(), status: this.status(), date: this.date() };
        void this.store.change(t => saveTicketEdits(t, id, edits, this.store.today(), new Date().toISOString()));
    }

    protected setStatus(status: Status): void {
        this.status.set(status);
        if (!isDateAllowed(this.date(), status, this.store.today())) this.snapToToday();
    }

    /** Clearing the native input emits '' — keep the previous draft; only the checkbox means backlog. */
    protected onDateInput(input: HTMLInputElement): void {
        const value = input.value;
        if (!value) {
            input.value = this.date() ?? '';
            return;
        }
        if (isDateAllowed(value, this.status(), this.store.today())) {
            this.date.set(value);
            this.dateNote.set(false);
        } else {
            this.snapToToday();
            input.value = this.store.today();
        }
    }

    protected setBacklog(backlog: boolean): void {
        this.date.set(backlog ? null : this.store.today());
        this.dateNote.set(false);
    }

    private snapToToday(): void {
        this.date.set(this.store.today());
        this.dateNote.set(true);
    }

    /** Returns nothing on purpose: a handler that returns false makes Angular call preventDefault(),
     *  which would stop the checkbox inside the dialog from toggling. */
    protected onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) this.close();
    }

    protected close(): void {
        this.closed.emit();
    }

    protected onEscape(): void {
        if (this.confirming()) this.confirming.set(false);
        else this.close();
    }

    protected remove(): void {
        const id = this.ticket().id;
        this.confirming.set(false);
        void this.store.change(t => deleteTicket(t, id));
        this.closed.emit();
    }
}
