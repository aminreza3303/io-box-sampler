export const initialJourney = {
  step: 1,
  representativePaid: false,
  needsSim: true,
  needsCard: true,
  userLocated: false,
  smsReady: false,
  identityComplete: false,
  paymentReady: false,
  otpUsed: false,
  passportCaptured: false,
};

export const journeySteps = [
  { key: 'fee', title: 'پرداخت هزینه نماینده', short: 'هزینه', caption: 'فعال‌سازی فرایند برای نماینده' },
  { key: 'search', title: 'جست‌وجوی کاربر', short: 'جست‌وجو', caption: 'ورود شماره همراه کاربر نیوکش' },
  { key: 'request', title: 'شروع درخواست', short: 'درخواست', caption: 'انتخاب کاربر و ایجاد پرونده' },
  { key: 'sim', title: 'تخصیص شماره موقت', short: 'شماره', caption: 'شماره قانونی و یک‌بارمصرف', resource: 'sim' },
  { key: 'sms', title: 'تأیید پیامک فیدا', short: 'پیامک', caption: 'دریافت کد از پنل نیوکاش', resource: 'sim' },
  { key: 'identity', title: 'تکمیل هویت کاربر', short: 'هویت', caption: 'همراه با کاربر در پرتال فیدا' },
  { key: 'card', title: 'تخصیص کارت پرداخت', short: 'کارت', caption: 'ابزار پرداخت موقت نیوکاش', resource: 'card' },
  { key: 'payment', title: 'رمز پویا و پرداخت', short: 'پرداخت', caption: 'تأیید پرداخت در درگاه بانک', resource: 'card' },
  { key: 'passport', title: 'تأیید اطلاعات کاربر', short: 'پاسپورت', caption: 'شماره نیوکش و شماره پاسپورت' },
  { key: 'final', title: 'ثبت کد پیگیری', short: 'ثبت نهایی', caption: 'تحویل رسید پرداخت به نیوکاش' },
];

export function getJourneySteps(journey) {
  return journeySteps.filter((item) => !item.resource || journey[`needs${item.resource === 'sim' ? 'Sim' : 'Card'}`]);
}

function stepForKey(state, key) {
  const index = getJourneySteps(state).findIndex((item) => item.key === key);
  return index === -1 ? state.step : index + 1;
}

function advanceTo(state, key) {
  return { ...state, step: stepForKey(state, key) };
}

export function isTrackingCodeValid(code) {
  return code.trim().length >= 6;
}

export function journeyReducer(state, event) {
  switch (event.type) {
    case 'NEXT':
      return { ...state, step: Math.min(state.step + 1, getJourneySteps(state).length) };
    case 'BACK':
      return { ...state, step: Math.max(state.step - 1, 1) };
    case 'GO_TO_STEP':
      return { ...state, step: Math.max(1, Math.min(event.step, getJourneySteps(state).length)) };
    case 'REPRESENTATIVE_PAYMENT_COMPLETED':
      return {
        ...state,
        step: 2,
        representativePaid: true,
        needsSim: event.needsSim ?? state.needsSim,
        needsCard: event.needsCard ?? state.needsCard,
      };
    case 'SET_RESOURCES':
      return { ...state, needsSim: event.needsSim, needsCard: event.needsCard };
    case 'USER_LOCATED':
      return advanceTo({ ...state, userLocated: true }, 'request');
    case 'FIDA_PORTAL_COMPLETED':
      return advanceTo({ ...state, smsReady: true }, 'sms');
    case 'IDENTITY_COMPLETED':
      return advanceTo({ ...state, identityComplete: true }, state.needsCard ? 'card' : 'passport');
    case 'PAYMENT_GATEWAY_COMPLETED':
      return advanceTo({ ...state, paymentReady: true }, 'payment');
    case 'OTP_USED':
      return advanceTo({ ...state, otpUsed: true }, 'passport');
    case 'PASSPORT_CAPTURED':
      return advanceTo({ ...state, passportCaptured: true }, 'final');
    case 'RESET':
      return initialJourney;
    default:
      return state;
  }
}
