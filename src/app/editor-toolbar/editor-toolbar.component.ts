import { Component, inject } from '@angular/core';
import { EditorService, FormatType } from '../editor.service';

@Component({
    selector: 'app-editor-toolbar',
    standalone: true,
    templateUrl: './editor-toolbar.component.html',
    styleUrl: './editor-toolbar.component.css'
})
export class EditorToolbarComponent {
    private readonly editorService = inject(EditorService);

    applyFormat(type: FormatType): void {
        this.editorService.applyFormat(type);
    }
}
