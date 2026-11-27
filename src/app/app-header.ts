import { Component, computed, input, output } from '@angular/core';
import { WindowControls } from './window-controls';

/** Title bar: brand, the view's heading (+ day progress), ‹ Today › and Day | Week, window controls. */
@Component({
    selector: 'app-header',
    imports: [WindowControls],
    template: `
        <header class="app-header title-bar">
            <div class="app-header-lead">
                <div class="brand">
                    <svg class="brand-mark" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 3a13 13 0 1 0 6.9 24l3.6 3.6 4.2-4.2-3.4-3.4A13 13 0 0 0 16 3zm0 7a6 6 0 1 1 0 12 6 6 0 0 1 0-12z" />
                    </svg>
                    <span class="brand-word">Quokka</span>
                </div>
                <div class="view-title">
                    <span class="view-eyebrow">{{ eyebrow() }}</span>
                    <h1 class="view-heading">{{ title() }}</h1>
                </div>
                @if (progress(); as p) {
                    <div class="progress" role="img" [attr.aria-label]="p.done + ' of ' + p.total + ' done'">
                        <div class="progress-track"><div class="progress-fill" [style.width.%]="(p.done / p.total) * 100"></div></div>
                        <span>{{ p.done }} of {{ p.total }} done</span>
                    </div>
                }
            </div>
            <div class="app-header-nav">
                <div class="pill" role="group" [attr.aria-label]="unit() + ' navigation'">
                    <button type="button" class="pill-button" (click)="prev.emit()" [attr.aria-label]="'Previous ' + unit()">
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
                            <path d="M15 6l-6 6 6 6" />
                        </svg>
                    </button>
                    <button type="button" class="pill-button is-primary" (click)="today.emit()">Today</button>
                    <button type="button" class="pill-button" (click)="next.emit()" [attr.aria-label]="'Next ' + unit()">
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
                            <path d="M9 6l6 6-6 6" />
                        </svg>
                    </button>
                </div>
                <div class="pill" role="group" aria-label="View">
                    <button
                        type="button"
                        class="pill-button segmented-button"
                        [class.is-active]="kind() === 'day'"
                        [attr.aria-pressed]="kind() === 'day'"
                        (click)="kind() !== 'day' && switchKind.emit()"
                    >
                        Day
                    </button>
                    <button
                        type="button"
                        class="pill-button segmented-button"
                        [class.is-active]="kind() === 'week'"
                        [attr.aria-pressed]="kind() === 'week'"
                        (click)="kind() !== 'week' && switchKind.emit()"
                    >
                        Week
                    </button>
                </div>
            </div>
            <app-window-controls />
        </header>
    `,
})
export class AppHeader {
    readonly eyebrow = input.required<string>();
    readonly title = input.required<string>();
    readonly kind = input.required<'day' | 'week'>();
    readonly progress = input<{ done: number; total: number } | null>(null);
    readonly prev = output<void>();
    readonly next = output<void>();
    readonly today = output<void>();
    readonly switchKind = output<void>();

    protected readonly unit = computed(() => this.kind());
}
