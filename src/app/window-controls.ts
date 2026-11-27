import { Component, DestroyRef, inject, signal } from '@angular/core';

/** Minimise / maximise-restore / close buttons for the frameless window. */
@Component({
    selector: 'app-window-controls',
    template: `
        <div class="window-controls" role="group" aria-label="Window">
            <button type="button" class="icon-button window-control" (click)="api.minimize()" aria-label="Minimise">
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
                    <path d="M6 12h12" />
                </svg>
            </button>
            <button
                type="button"
                class="icon-button window-control"
                (click)="api.toggleMaximize()"
                [attr.aria-label]="maximized() ? 'Restore' : 'Maximise'"
            >
                @if (maximized()) {
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
                        <rect x="5" y="9" width="10" height="10" rx="1.5" />
                        <path d="M9 9V6.5A1.5 1.5 0 0 1 10.5 5h7A1.5 1.5 0 0 1 19 6.5v7a1.5 1.5 0 0 1-1.5 1.5H15" />
                    </svg>
                } @else {
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
                        <rect x="6" y="6" width="12" height="12" rx="1.5" />
                    </svg>
                }
            </button>
            <button type="button" class="icon-button window-control window-control-close" (click)="api.close()" aria-label="Close">
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
    `,
})
export class WindowControls {
    protected readonly api = window.api.window;
    protected readonly maximized = signal(false);

    constructor() {
        void this.api.isMaximized().then(m => this.maximized.set(m));
        const unsubscribe = this.api.onMaximizedChange(m => this.maximized.set(m));
        inject(DestroyRef).onDestroy(unsubscribe);
    }
}
