import { Component, input, output } from '@angular/core';
import type { WeekHeading } from '../domain/dates';
import { WindowControls } from './window-controls';

@Component({
  selector: 'app-week-header',
  imports: [WindowControls],
  template: `
    <header class="week-header title-bar">
      <div class="brand">
        <svg class="brand-mark" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M16 3a13 13 0 1 0 6.9 24l3.6 3.6 4.2-4.2-3.4-3.4A13 13 0 0 0 16 3zm0 7a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" />
        </svg>
        <span class="brand-word">Quokka</span>
      </div>
      <div class="week-title">
        <span class="week-eyebrow">{{ heading().eyebrow }}</span>
        <h1 class="week-range">{{ heading().range }}</h1>
      </div>
      <div class="pill" role="group" aria-label="Week navigation">
        <button type="button" class="pill-button" (click)="prev.emit()" aria-label="Previous week">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button type="button" class="pill-button is-primary" (click)="today.emit()">Today</button>
        <button type="button" class="pill-button" (click)="next.emit()" aria-label="Next week">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      <app-window-controls />
    </header>
  `,
})
export class WeekHeader {
  readonly heading = input.required<WeekHeading>();
  readonly prev = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();
}
