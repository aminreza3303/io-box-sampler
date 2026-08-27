import test from 'node:test';
import assert from 'node:assert/strict';
import { initialJourney, isTrackingCodeValid, journeyReducer } from '../src/demo/journey.js';

test('records the agent fee, finds the user, and exposes secure-code states', () => {
  let state = journeyReducer(initialJourney, { type: 'REPRESENTATIVE_PAYMENT_COMPLETED' });
  assert.equal(state.step, 2);
  assert.equal(state.representativePaid, true);

  state = journeyReducer(state, { type: 'USER_LOCATED' });
  assert.equal(state.step, 3);
  assert.equal(state.userLocated, true);

  state = journeyReducer(state, { type: 'FIDA_PORTAL_COMPLETED' });
  assert.equal(state.step, 5);
  assert.equal(state.smsReady, true);
});

test('requires six characters for a payment tracking code and reset clears progress', () => {
  assert.equal(isTrackingCodeValid('12345'), false);
  assert.equal(isTrackingCodeValid('123456'), true);

  const reset = journeyReducer(
    { ...initialJourney, step: 10, paymentReady: true, passportCaptured: true },
    { type: 'RESET' },
  );

  assert.equal(reset.step, 1);
  assert.equal(reset.paymentReady, false);
  assert.equal(reset.passportCaptured, false);
});
