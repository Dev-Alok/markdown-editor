import { Injectable, signal } from '@angular/core';

export interface DialogConfig {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'danger';
    confirmText: string;
    onConfirm: () => void;
}

@Injectable({
    providedIn: 'root'
})
export class DialogService {
    public readonly dialog = signal<DialogConfig | null>(null);

    public open(options: {
        title: string;
        message: string;
        type?: 'info' | 'warning' | 'danger';
        confirmText?: string;
        onConfirm: () => void;
    }): void {
        this.dialog.set({
            title: options.title,
            message: options.message,
            type: options.type ?? 'info',
            confirmText: options.confirmText ?? 'Confirm',
            onConfirm: options.onConfirm
        });
    }

    public confirm(): void {
        this.dialog()?.onConfirm();
        this.close();
    }

    public close(): void {
        this.dialog.set(null);
    }
}
