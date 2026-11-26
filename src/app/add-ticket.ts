import { Component, ElementRef, effect, inject, input, signal, viewChild } from '@angular/core';
import { createTicket } from '../domain/tickets';
import { TasksStore } from './tasks.store';

@Component({
  selector: 'app-add-ticket',
  template: `
    @if (editing()) {
      <input
        #titleInput
        class="add-input"
        type="text"
        placeholder="Ticket title, then Enter"
        (keydown.enter)="submit(titleInput.value)"
        (keydown.escape)="editing.set(false)"
        (blur)="onBlur(titleInput.value)"
      />
    } @else {
      <button type="button" class="add-button" (click)="editing.set(true)">+ add</button>
    }
  `,
})
export class AddTicket {
  /** Target list: a 'YYYY-MM-DD' date, or null for the backlog. */
  readonly date = input.required<string | null>();

  private readonly store = inject(TasksStore);
  protected readonly editing = signal(false);
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  constructor() {
    effect(() => this.titleInput()?.nativeElement.focus());
  }

  protected submit(title: string): void {
    const date = this.date();
    void this.store.change((t) =>
      createTicket(t, { id: crypto.randomUUID(), title, date, now: new Date().toISOString() }),
    );
    this.editing.set(false);
  }

  protected onBlur(title: string): void {
    if (!title.trim()) this.editing.set(false);
  }
}
