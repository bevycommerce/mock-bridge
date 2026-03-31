import type { ResourcePickerBridgeOpenPayload } from '../resource-picker-bridge';
import { openMockResourcePickerFromBridge } from '../resource-picker-bridge';

export function resourcePicker(): NonNullable<typeof window.shopify>['resourcePicker'] {
  return async (options) => {
    const payload: ResourcePickerBridgeOpenPayload = {
      type:
        options?.type === 'variant'
          ? 'variant'
          : options?.type === 'collection'
            ? 'collection'
            : 'product',
      multiple: options?.multiple === true,
      selectionIds: options?.selectionIds as string[] | undefined,
    };

    const result = await openMockResourcePickerFromBridge(payload);
    if (result.cancelled) {
      return [] as any;
    }
    return result.selection as any;
  };
}
