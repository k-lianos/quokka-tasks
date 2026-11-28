import { Component, input, output } from '@angular/core';

@Component({
    selector: 'app-confirm-dialog',
    template: `
        <div class="dialog-backdrop" (click)="onBackdropClick($event)">
            <div class="dialog confirm-dialog" role="alertdialog" aria-modal="true">
                <p>{{ message() }}</p>
                <div class="dialog-actions">
                    <button type="button" class="button button-danger" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
                    <button type="button" class="button" (click)="cancelled.emit()">Cancel</button>
                </div>
            </div>
        </div>
    `,
})
export class ConfirmDialog {
    readonly message = input.required<string>();
    readonly confirmLabel = input.required<string>();
    readonly confirmed = output<void>();
    readonly cancelled = output<void>();

    /** Clicking outside the dialog cancels. Returns nothing on purpose: a handler that returns false
     *  makes Angular call preventDefault() on every click inside the dialog. */
    protected onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) this.cancelled.emit();
    }
}
