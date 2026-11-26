import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="dialog-backdrop">
      <div class="dialog confirm-dialog" role="alertdialog" aria-modal="true">
        <p>{{ message() }}</p>
        <div class="dialog-actions">
          <button type="button" class="danger" (click)="confirmed.emit()">{{ confirmLabel() }}</button>
          <button type="button" (click)="cancelled.emit()">Cancel</button>
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
}
