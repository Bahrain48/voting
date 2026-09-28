const test = require('node:test');
const assert = require('node:assert/strict');
const { isVotingAvailable } = require('../src/middlewares/auth.middleware');

test('voting is open when manual switch and optional schedule allow it', () => {
  const now = new Date('2026-09-28T08:00:00.000Z');
  assert.equal(isVotingAvailable({ isVotingOpen: true, startsAt: null, endsAt: null }, now), true);
  assert.equal(isVotingAvailable({ isVotingOpen: true, startsAt: new Date('2026-09-28T08:00:00.000Z'), endsAt: new Date('2026-09-28T09:00:00.000Z') }, now), true);
});

test('voting is closed when manually locked or outside its schedule', () => {
  const now = new Date('2026-09-28T08:00:00.000Z');
  assert.equal(isVotingAvailable({ isVotingOpen: false }, now), false);
  assert.equal(isVotingAvailable({ isVotingOpen: true, startsAt: new Date('2026-09-28T08:01:00.000Z') }, now), false);
  assert.equal(isVotingAvailable({ isVotingOpen: true, endsAt: new Date('2026-09-28T07:59:00.000Z') }, now), false);
});
