import { v4 as uuidv4 } from 'uuid';

export function invokeFeature(feature: string, action: string, payload: unknown) {
  return new Promise((resolve, reject) => {
    const actionId = uuidv4();

    const request = {
      feature,
      action,
      payload,
    };

    const timeoutMs =
      feature === 'resourcePicker' && action === 'open' ? 300_000 : 1_000;

    window.parent.postMessage(
      {
        type: 'FEATURE_ACTION_REQUEST',
        action_id: actionId,
        ...request,
      },
      '*',
    );

    const rejectTimeout = setTimeout(() => {
      reject(new Error(`Feature action timed out after ${timeoutMs} ms`));
    }, timeoutMs);

    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === 'FEATURE_ACTION_RESPONSE') {
        if (event.data.action_id !== actionId) return;

        resolve(event.data.payload);

        window.removeEventListener('message', handler);
        clearTimeout(rejectTimeout);
      }
    };

    window.addEventListener('message', handler);
  });
}
