import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { formatLongDate } from '../domain/dates';
import { deleteTicket, updateTicket } from '../domain/tickets';
import { STATUS_LABEL, STATUSES, type Status, type Ticket } from '../shared/types';
import { ConfirmDialog } from './confirm-dialog';
import { TasksStore } from './tasks.store';

/** Modal editor for one ticket. Edits are drafts until Save; closing without saving discards them. */
@Component({
    selector: 'app-focus-view',
    imports: [ConfirmDialog],
    host: { '(document:keydown.escape)': 'onEscape()' },
    template: `
        <div class="dialog-backdrop" (click)="$event.target === $event.currentTarget && close()">
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
                    <select [value]="status()" (change)="status.set($any($event.target).value)">
                        @for (s of statuses; track s) {
                            <option [value]="s" [selected]="s === status()">{{ statusLabel[s] }}</option>
                        }
                    </select>
                </label>

                <label class="field field-grow">
                    <span>Description</span>
                    <textarea [value]="description()" (input)="description.set($any($event.target).value)"></textarea>
                </label>

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
    protected readonly confirming = signal(false);
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
            });
        });
    }

    protected save(): void {
        if (this.titleInvalid()) return;
        const id = this.ticket().id;
        const patch = { title: this.title(), description: this.description(), status: this.status() };
        void this.store.change(t => updateTicket(t, id, patch, new Date().toISOString()));
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
