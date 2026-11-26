import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-week-header',
  template: `
    <header class="week-header">
      <button type="button" (click)="prev.emit()" aria-label="Previous week">◀</button>
      <h1 class="week-label">{{ label() }}</h1>
      <button type="button" (click)="next.emit()" aria-label="Next week">▶</button>
      <button type="button" class="today-button" (click)="today.emit()">Today</button>
    </header>
  `,
})
export class WeekHeader {
  readonly label = input.required<string>();
  readonly prev = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();
}
