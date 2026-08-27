export const initialJourney = {
  step: 1,
  representativePaid: false,
  userLocated: false,
  smsReady: false,
  identityComplete: false,
  paymentReady: false,
  otpUsed: false,
  passportCaptured: false,
};

export function isTrackingCodeValid(code) {
  return code.trim().length >= 6;
}

export function journeyReducer(state, event) {
  switch (event.type) {
    case 'NEXT':
      return { ...state, step: Math.min(state.step + 1, 10) };
    case 'BACK':
      return { ...state, step: Math.max(state.step - 1, 1) };
    case 'GO_TO_STEP':
      return { ...state, step: Math.max(1, Math.min(event.step, 10)) };
    case 'REPRESENTATIVE_PAYMENT_COMPLETED':
      return { ...state, step: 2, representativePaid: true };
    case 'USER_LOCATED':
      return { ...state, step: 3, userLocated: true };
    case 'FIDA_PORTAL_COMPLETED':
      return { ...state, step: 5, smsReady: true };
    case 'IDENTITY_COMPLETED':
      return { ...state, step: 7, identityComplete: true };
    case 'PAYMENT_GATEWAY_COMPLETED':
      return { ...state, step: 8, paymentReady: true };
    case 'OTP_USED':
      return { ...state, step: 9, otpUsed: true };
    case 'PASSPORT_CAPTURED':
      return { ...state, step: 10, passportCaptured: true };
    case 'RESET':
      return initialJourney;
    default:
      return state;
  }
}
