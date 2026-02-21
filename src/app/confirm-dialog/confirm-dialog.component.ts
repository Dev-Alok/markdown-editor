import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confirm-dialog.component.html',
    styleUrl: './confirm-dialog.component.css'
})
export class ConfirmDialogComponent {
    @Input() public isVisible = false;
    @Input() public title = 'Confirm Action';
    @Input() public message = 'Are you sure you want to proceed?';
    @Input() public confirmText = 'Confirm';
    @Input() public cancelText = 'Cancel';
    @Input() public showCancel = true;
    @Input() public type: 'info' | 'warning' | 'danger' = 'info';

    @Output() public confirm = new EventEmitter<void>();
    @Output() public cancel = new EventEmitter<void>();

    protected onConfirm(): void {
        this.confirm.emit();
    }

    protected onCancel(): void {
        this.cancel.emit();
    }
}
