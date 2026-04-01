import { create } from 'zustand';
import { combine } from 'zustand/middleware';
import type {
  MockResourcePickerProduct,
  MockResourcePickerVariant,
  MockResourcePickerCollection,
  ResourcePickerCatalogApiResponse,
  ResourcePickerOpenOptions,
  ResourcePickerResultPayload,
  ResourcePickerSelectionRow,
  ResourcePickerType,
} from '../../types/resource-picker';

type ResourcePickerState = {
  isOpen: boolean;
  actionId: string | null;
  iframeWindow: Window | null;
  options: ResourcePickerOpenOptions | null;
  query: string;
  loading: boolean;
  error: string | null;
  catalog: ResourcePickerCatalogApiResponse | null;
  selectedIds: Set<string>;
};

const emptyCatalog: ResourcePickerCatalogApiResponse = {
  products: [],
  variants: [],
  collections: [],
};

function closedPickerState(): Pick<
  ResourcePickerState,
  | 'isOpen'
  | 'actionId'
  | 'iframeWindow'
  | 'options'
  | 'query'
  | 'loading'
  | 'catalog'
  | 'selectedIds'
  | 'error'
> {
  return {
    isOpen: false,
    actionId: null,
    iframeWindow: null,
    options: null,
    query: '',
    loading: false,
    catalog: null,
    selectedIds: new Set<string>(),
    error: null,
  };
}

function fetchCatalog(
  q: string,
  set: (partial: Partial<ResourcePickerState>) => void,
) {
  fetch(`/api/resource-picker-catalog?q=${encodeURIComponent(q)}`)
    .then((r) => {
      if (!r.ok) throw new Error(`Catalog ${r.status}`);
      return r.json() as Promise<ResourcePickerCatalogApiResponse>;
    })
    .then((catalog) => {
      set({ catalog, loading: false, error: null });
    })
    .catch((e: Error) => {
      set({
        loading: false,
        error: e.message || 'Failed to load catalog',
        catalog: emptyCatalog,
      });
    });
}

function selectionRowsForProduct(p: MockResourcePickerProduct): ResourcePickerSelectionRow {
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    variants: p.variants,
  };
}

function selectionRowForVariant(v: MockResourcePickerVariant): ResourcePickerSelectionRow {
  return {
    id: v.id,
    title: v.productTitle,
    displayName: v.displayName,
    price: v.price,
    product: {
      id: v.productId,
      title: v.productTitle,
      handle: v.productHandle,
    },
  };
}

function selectionRowForCollection(c: MockResourcePickerCollection): ResourcePickerSelectionRow {
  return {
    id: c.id,
    title: c.title,
    handle: c.handle,
  };
}

export const useResourcePickerFeatureStore = create(
  combine(
    closedPickerState() as ResourcePickerState,
    (set, get) => ({
      /** Called from mock admin host when iframe requests the picker (see useMockBridge). */
      openFromBridge: (payload: {
        actionId: string;
        iframeWindow: Window | null;
        options: ResourcePickerOpenOptions;
      }) => {
        const preset = new Set(payload.options.selectionIds ?? []);
        set({
          isOpen: true,
          actionId: payload.actionId,
          iframeWindow: payload.iframeWindow,
          options: payload.options,
          query: '',
          loading: true,
          error: null,
          catalog: null,
          selectedIds: preset,
        });

        fetchCatalog('', set);
      },

      setQuery: (query: string) => {
        set({ query, loading: true, error: null });
        fetchCatalog(query, set);
      },

      toggleId: (id: string) =>
        set((state) => {
          const next = new Set(state.selectedIds);
          const allowMulti = state.options?.multiple === true;
          if (next.has(id)) {
            next.delete(id);
          } else {
            if (!allowMulti) {
              next.clear();
            }
            next.add(id);
          }
          return { selectedIds: next };
        }),

      close: () => set(closedPickerState()),

      cancel: () => {
        const { actionId, iframeWindow } = get();
        const payload: ResourcePickerResultPayload = { cancelled: true, selection: [] };
        if (actionId && iframeWindow) {
          iframeWindow.postMessage(
            {
              type: 'FEATURE_ACTION_RESPONSE',
              action_id: actionId,
              payload,
            },
            '*',
          );
        }
        set(closedPickerState());
      },

      confirm: () => {
        const state = get();
        const { actionId, iframeWindow, options, catalog, selectedIds } = state;
        if (!actionId || !iframeWindow || !options || !catalog) {
          set(closedPickerState());
          return;
        }

        const type: ResourcePickerType = options.type ?? 'product';
        const selection: ResourcePickerSelectionRow[] = [];

        if (type === 'product') {
          for (const p of catalog.products) {
            if (selectedIds.has(p.id)) {
              selection.push(selectionRowsForProduct(p));
            }
          }
        } else if (type === 'variant') {
          for (const v of catalog.variants) {
            if (selectedIds.has(v.id)) {
              selection.push(selectionRowForVariant(v));
            }
          }
        } else {
          for (const c of catalog.collections) {
            if (selectedIds.has(c.id)) {
              selection.push(selectionRowForCollection(c));
            }
          }
        }

        const payload: ResourcePickerResultPayload = { cancelled: false, selection };
        iframeWindow.postMessage(
          {
            type: 'FEATURE_ACTION_RESPONSE',
            action_id: actionId,
            payload,
          },
          '*',
        );
        set(closedPickerState());
      },
    }),
  ),
);
