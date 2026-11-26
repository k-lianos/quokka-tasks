import { Component, OnDestroy, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { formatLongDate } from '../domain/dates';
import { deleteTicket, updateTicket } from '../domain/tickets';
import { STATUS_LABEL, STATUSES, type Status, type Ticket } from '../shared/types';
import { ConfirmDialog } from './confirm-dialog';
import { TasksStore } from './tasks.store';

const DEBOUNCE_MS = 400;

/** Modal editor for one ticket. Text edits save after a short pause; status saves immediately. */
@Component({
  selector: 'app-focus-view',
  imports: [ConfirmDialog],
  host: { '(document:keydown.escape)': 'onEscape()' },
  template: `
    <div class="dialog-backdrop" (click)="$event.target === $event.currentTarget && close()">
      <div class="dialog focus-view" role="dialog" aria-modal="true" aria-label="Ticket">
        <div class="focus-header">
          <span class="focus-date">{{ dateLabel() }}</span>
          <button type="button" class="icon-button" (click)="close()" aria-label="Close"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>

        <label class="field">
          <span>Title</span>
          <input type="text" [value]="title()" (input)="onTitle($any($event.target).value)" />
        </label>
        @if (titleInvalid()) {
          <p class="field-error">Title is required</p>
        }

        <label class="field">
          <span>Status</span>
          <select [value]="ticket().status" (change)="onStatus($any($event.target).value)">
            @for (s of statuses; track s) {
              <option [value]="s" [selected]="s === ticket().status">{{ statusLabel[s] }}</option>
            }
          </select>
        </label>

        <label class="field field-grow">
          <span>Description</span>
          <textarea [value]="description()" (input)="onDescription($any($event.target).value)"></textarea>
        </label>

        <div class="dialog-actions">
          <button type="button" class="button button-danger" (click)="confirming.set(true)">Delete</button>
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
export class FocusView implements OnDestroy {
  readonly ticket = input.required<Ticket>();
  readonly closed = output<void>();

  private readonly store = inject(TasksStore);
  protected readonly statuses = STATUSES;
  protected readonly statusLabel = STATUS_LABEL;

  protected readonly title = signal('');
  protected readonly description = signal('');
  protected readonly confirming = signal(false);
  protected readonly titleInvalid = computed(() => !this.title().trim());
  protected readonly dateLabel = computed(() => {
    const date = this.ticket().date;
    return date ? formatLongDate(date) : 'Backlog';
  });

  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Load the editable text when a (different) ticket is shown; our own saves don't reset what's being typed.
    effect(() => {
      this.ticket().id;
      untracked(() => {
        this.title.set(this.ticket().title);
        this.description.set(this.ticket().description);
      });
    });
  }

  /** Save any pending text edit now. Resolves when the save has settled. */
  flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const id = this.ticket().id;
    const patch = { title: this.title(), description: this.description() };
    return this.store.change((t) => updateTicket(t, id, patch, new Date().toISOString()));
  }

  ngOnDestroy(): void {
    if (this.timer) void this.flush();
  }

  protected onTitle(value: string): void {
    this.title.set(value);
    this.schedule();
  }

  protected onDescription(value: string): void {
    this.description.set(value);
    this.schedule();
  }

  protected onStatus(value: string): void {
    const id = this.ticket().id;
    const status = value as Status;
    void this.flush();
    void this.store.change((t) => updateTicket(t, id, { status }, new Date().toISOString()));
  }

  protected async close(): Promise<void> {
    await this.flush();
    this.closed.emit();
  }

  protected onEscape(): void {
    if (this.confirming()) this.confirming.set(false);
    else void this.close();
  }

  protected remove(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const id = this.ticket().id;
    this.confirming.set(false);
    void this.store.change((t) => deleteTicket(t, id));
    this.closed.emit();
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), DEBOUNCE_MS);
  }
}
