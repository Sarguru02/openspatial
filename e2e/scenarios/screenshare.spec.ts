/**
 * Screen Share Scenarios
 * 
 * NOTE: "leaving removes screen shares" is skipped due to WebRTC timing issues.
 */
import { expect, test } from '@playwright/test';
import { scenario, expectRect } from '../dsl';

scenario('leaving removes screen shares', 'ss-leave', async ({ createUser }) => {
  const alice = await createUser('Alice').join();
  const bob = await createUser('Bob').join();
  await bob.waitForUser('Alice');

  await alice.startScreenShare({ color: 'blue' });
  await bob.wait(1000); // Wait for screen share to propagate via WebRTC
  
  // Bob should see exactly Alice's screen share
  const sharesBefore = await bob.screenShares();
  expect(sharesBefore.length).toBe(1);
  expect(sharesBefore[0].owner).toBe('Alice');

  await alice.leave();
  await bob.wait(1000); // Wait for cleanup to propagate
  
  // Bob should see no users and no screen shares
  expect(await bob.visibleUsers()).toEqual([]);
  expect(await bob.screenShares()).toEqual([]);
});

scenario('screen share resize syncs', 'ss-resize', async ({ createUser }) => {
  const alice = await createUser('Alice').join();
  const bob = await createUser('Bob').join();
  await bob.waitForUser('Alice');

  await alice.startScreenShare({ color: 'green' });
  const initialRect = await bob.screenShareOf('Alice').rect();

  const expectedRect = {
    position: initialRect.position,
    size: { width: 800, height: 600 },
  };
  await alice.resizeScreenShare(expectedRect);
  const newRect = await bob.screenShareOf('Alice').rect();

  expectRect(newRect, expectedRect);
});
