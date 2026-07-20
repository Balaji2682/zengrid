import type { GridPlugin, PluginDisposable } from '../../reactive/types';
import { GridFilterUI } from './grid-filter-ui';
import type { ColumnDef, FilterExpression, FilterModel } from '../../types';
import type { ColumnModel } from '../../features/columns/column-model';

export interface FilterUIPluginOptions {
  getColumns: () => ColumnDef[] | undefined;
  getColumnDef: (dataCol: number) => ColumnDef | undefined;
  getColumnModel: () => ColumnModel | null;
  getContainer: () => HTMLElement;
}

export function createFilterUIPlugin(options: FilterUIPluginOptions): GridPlugin {
  return {
    name: 'filter-ui',
    phase: 25,
    dependencies: ['filter'],
    setup(store, api, context): PluginDisposable {
      let filterUI: GridFilterUI | null = null;

      store.action(
        'filterUI:attach',
        (container: HTMLElement, events: any) => {
          if (filterUI) {
            filterUI.destroy();
          }

          filterUI = new GridFilterUI({
            container,
            events,
            columns: options.getColumns(),
            getFilterState: () => store.get('filter.state') as FilterModel[],
            getFilterExpression: () => store.get('filter.expression') as FilterExpression | null,
            setColumnFilter: (column, conditions, logic) => {
              store.exec('filter:setColumn', column, conditions, logic ?? 'AND');
            },
            setFieldState: (state) => {
              store.exec('filter:setFieldState', state);
            },
            clearColumnFilter: (column) => {
              store.exec('filter:clearColumn', column);
            },
            clearQuickFilter: () => {
              store.exec('filter:clearQuickFilter');
            },
            clearAllFilters: () => {
              store.exec('filter:clear');
            },
            getColumnDef: options.getColumnDef,
            mapVisualToDataCol: (visualCol: number) => {
              const columnModel = options.getColumnModel();
              if (columnModel) {
                const orderedColumns = columnModel.getVisibleColumnsInOrder();
                if (orderedColumns[visualCol]) {
                  return orderedColumns[visualCol].dataIndex;
                }
              }
              return visualCol;
            },
          });
        },
        'filter-ui'
      );

      const unsubscribeOptions = context.subscribeOptions((change) => {
        if (!change.changedKeys.includes('columns')) {
          return;
        }

        filterUI?.setColumns(options.getColumns() ?? []);
      });

      api.register('filterUI', {
        destroy: () => {
          if (filterUI) {
            filterUI.destroy();
            filterUI = null;
          }
        },
      });

      return {
        teardown: [
          unsubscribeOptions,
          () => {
            if (filterUI) {
              filterUI.destroy();
              filterUI = null;
            }
          },
        ],
      };
    },
  };
}
