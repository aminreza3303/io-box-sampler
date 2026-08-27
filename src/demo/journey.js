export const initialJourney = {
  step: 1,
  smsReady: false,
  identityComplete: false,
  paymentReady: false,
};

export function isTrackingCodeValid(code) {
  return code.trim().length >= 6;
}

export function journeyReducer(state, event) {
  switch (event.type) {
    case 'NEXT':
      return { ...state, step: Math.min(state.step + 1, 7) };
    case 'BACK':
      return { ...state, step: Math.max(state.step - 1, 1) };
    case 'GO_TO_STEP':
      return { ...state, step: Math.max(1, Math.min(event.step, 7)) };
    case 'FIDA_PORTAL_COMPLETED':
      return { ...state, step: 3, smsReady: true };
    case 'IDENTITY_COMPLETED':
      return { ...state, step: 5, identityComplete: true };
    case 'PAYMENT_GATEWAY_COMPLETED':
      return { ...state, step: 6, paymentReady: true };
    case 'RESET':
      return initialJourney;
    default:
      return state;
  }
}
