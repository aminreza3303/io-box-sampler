import test from 'node:test';
import assert from 'node:assert/strict';
import { initialJourney, isTrackingCodeValid, journeyReducer } from '../src/demo/journey.js';

test('advances the registration journey and exposes secure-code states', () => {
  let state = journeyReducer(initialJourney, { type: 'NEXT' });
  assert.equal(state.step, 2);

  state = journeyReducer(state, { type: 'FIDA_PORTAL_COMPLETED' });
  assert.equal(state.step, 3);
  assert.equal(state.smsReady, true);
});

test('requires six characters for a payment tracking code and reset clears progress', () => {
  assert.equal(isTrackingCodeValid('12345'), false);
  assert.equal(isTrackingCodeValid('123456'), true);

  const reset = journeyReducer(
    { ...initialJourney, step: 7, paymentReady: true },
    { type: 'RESET' },
  );

  assert.equal(reset.step, 1);
  assert.equal(reset.paymentReady, false);
});
