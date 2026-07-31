import {
  Component,
  input,
  contentChild,
} from '@angular/core';
import type { ColumnDef, CellOverflowConfig } from '@zengrid/core';
import { ZenCellTemplateDirective } from '../directives/zen-cell-template.directive';
import { ZenEditorTemplateDirective } from '../directives/zen-editor-template.directive';
import { ZenHeaderTemplateDirective } from '../directives/zen-header-template.directive';
import type { TemplateBridgeService } from '../services/template-bridge.service';
import type { RendererInput, EditorInput } from '../types';

@Component({
  selector: 'zen-column',
  standalone: true,
  template: `<ng-content></ng-content>`,
})
export class ZenColumnComponent {
  readonly field = input.required<string>();
  readonly header = input.required<string>();
  readonly width = input<number | undefined>(undefined);
  readonly align = input<'left' | 'center' | 'right' | undefined>(undefined);
  readonly renderer = input<RendererInput | undefined>(undefined);
  readonly sortable = input<boolean | undefined>(undefined);
  readonly editable = input<boolean | undefined>(undefined);
  readonly editor = input<EditorInput | undefined>(undefined);
  readonly editorOptions = input<any>(undefined);
  readonly filterable = input<boolean | undefined>(undefined);
  readonly resizable = input<boolean | undefined>(undefined);
  readonly reorderable = input<boolean | undefined>(undefined);
  readonly minWidth = input<number | undefined>(undefined);
  readonly maxWidth = input<number | undefined>(undefined);
  readonly overflow = input<CellOverflowConfig | undefined>(undefined);
  readonly autoHeight = input<boolean | undefined>(undefined);
  readonly id = input<string | undefined>(undefined);

  readonly cellTemplate = contentChild(ZenCellTemplateDirective);
  readonly editorTemplate = contentChild(ZenEditorTemplateDirective);
  readonly headerTemplate = contentChild(ZenHeaderTemplateDirective);

  toColumnDef(bridge: TemplateBridgeService): ColumnDef {
    const def: ColumnDef = {
      field: this.field(),
      header: this.header(),
    };

    const colId = this.id();
    const w = this.width();
    const alignment = this.align();
    const sort = this.sortable();
    const edit = this.editable();
    const edOpts = this.editorOptions();
    const filter = this.filterable();
    const resize = this.resizable();
    const reorder = this.reorderable();
    const minW = this.minWidth();
    const maxW = this.maxWidth();
    const ov = this.overflow();
    const autoH = this.autoHeight();

    if (colId !== undefined) def.id = colId;
    if (w !== undefined) def.width = w;
    if (alignment !== undefined) def.align = alignment;
    if (sort !== undefined) def.sortable = sort;
    if (edit !== undefined) def.editable = edit;
    if (edOpts !== undefined) def.editorOptions = edOpts;
    if (filter !== undefined) def.filterable = filter;
    if (resize !== undefined) def.resizable = resize;
    if (reorder !== undefined) def.reorderable = reorder;
    if (minW !== undefined) def.minWidth = minW;
    if (maxW !== undefined) def.maxWidth = maxW;
    if (ov !== undefined) def.overflow = ov;
    if (autoH !== undefined) def.autoHeight = autoH;

    // Resolve renderer: template > component/renderer input > none
    const cellTpl = this.cellTemplate();
    const rendererInput = this.renderer();
    if (cellTpl) {
      def.renderer = bridge.createTemplateRenderer(cellTpl.templateRef);
    } else if (rendererInput !== undefined) {
      if (typeof rendererInput === 'string') {
        def.renderer = rendererInput;
      } else if ('render' in rendererInput && typeof rendererInput.render === 'function') {
        def.renderer = rendererInput as any;
      } else {
        // It's a Component type
        def.renderer = bridge.createComponentRenderer(rendererInput as any);
      }
    }

    // Resolve editor: template > component/editor input > none
    const edTpl = this.editorTemplate();
    const editorInput = this.editor();
    if (edTpl) {
      def.editor = bridge.createTemplateEditor(edTpl.templateRef);
    } else if (editorInput !== undefined) {
      if (typeof editorInput === 'string') {
        def.editor = editorInput;
      } else if ('init' in editorInput && typeof editorInput.init === 'function') {
        def.editor = editorInput as any;
      } else {
        def.editor = bridge.createComponentEditor(editorInput as any);
      }
    }

    return def;
  }
}
