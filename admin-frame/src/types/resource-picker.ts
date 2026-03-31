export type ResourcePickerType = 'product' | 'variant' | 'collection';

/** Payload sent from embedded app (App Bridge) when opening the picker */
export type ResourcePickerOpenOptions = {
  type?: ResourcePickerType;
  multiple?: boolean;
  selectionIds?: string[];
};

export type MockResourcePickerCollection = {
  id: string;
  title: string;
  handle: string;
};

export type MockResourcePickerVariant = {
  id: string;
  title: string;
  displayName: string;
  price: string;
  sku?: string;
  inventoryQuantity?: number;
  productId: string;
  productTitle: string;
  productHandle: string;
};

export type MockResourcePickerProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  variants: MockResourcePickerVariant[];
};

export type ResourcePickerCatalogApiResponse = {
  products: MockResourcePickerProduct[];
  variants: MockResourcePickerVariant[];
  collections: MockResourcePickerCollection[];
};

/** Selection rows returned to the iframe (product / variant / collection) */
export type ResourcePickerSelectionRow =
  | {
      id: string;
      title: string;
      handle: string;
      variants?: MockResourcePickerVariant[];
    }
  | {
      id: string;
      title: string;
      displayName: string;
      price?: string;
      product?: { id: string; title: string; handle?: string };
    }
  | {
      id: string;
      title: string;
      handle: string;
    };

export type ResourcePickerResultPayload = {
  cancelled: boolean;
  selection: ResourcePickerSelectionRow[];
};
