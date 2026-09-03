import assert from 'node:assert/strict';
import { isAllowedPath, isContextPath, validatePatchScope } from './policy.mjs';
import { extractResponseText } from './zen.mjs';

assert.equal(isAllowedPath('games/onslaught-fable-5.1/source-reconstruction/src/main.js'), true);
assert.equal(isAllowedPath('games/onslaught-fable-5.1/index.html'), true);
assert.equal(isAllowedPath('games/onslaught-fable-5.1/assets/mobile-controls.js'), false);
assert.equal(isContextPath('games/onslaught-fable-5.1/assets/mobile-controls.js'), true);
assert.equal(isContextPath('games/onslaught-fable-5.1/assets/mobile-fire-look.js'), true);
assert.equal(isContextPath('games/onslaught-fable-5.1/assets/mobile-settings.js'), true);
assert.equal(isContextPath('games/onslaught-fable-5.1/assets/mobile-controls.css'), true);
assert.equal(isAllowedPath('.github/workflows/pages.yml'), false);
assert.equal(isContextPath('.github/workflows/pages.yml'), false);
assert.equal(isAllowedPath('../package.json'), false);
assert.equal(isAllowedPath('games/onslaught-fable-5.1/source-reconstruction/.env'), false);

const safePatch = `diff --git a/games/onslaught-fable-5.1/source-reconstruction/src/main.js b/games/onslaught-fable-5.1/source-reconstruction/src/main.js
--- a/games/onslaught-fable-5.1/source-reconstruction/src/main.js
+++ b/games/onslaught-fable-5.1/source-reconstruction/src/main.js
@@ -1,1 +1,1 @@
-old
+new
`;
const safe = validatePatchScope(safePatch);
assert.equal(safe.ok, true);
assert.deepEqual(safe.paths, ['games/onslaught-fable-5.1/source-reconstruction/src/main.js']);

const contextOnlyPatch = `diff --git a/games/onslaught-fable-5.1/assets/mobile-controls.js b/games/onslaught-fable-5.1/assets/mobile-controls.js
--- a/games/onslaught-fable-5.1/assets/mobile-controls.js
+++ b/games/onslaught-fable-5.1/assets/mobile-controls.js
@@ -1,1 +1,1 @@
-old
+new
`;
const contextOnly = validatePatchScope(contextOnlyPatch);
assert.equal(contextOnly.ok, false);
assert.match(contextOnly.error, /outside the allowlist/i);

const unsafePatch = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
@@ -1,1 +1,1 @@
-old
+new
`;
const unsafe = validatePatchScope(unsafePatch);
assert.equal(unsafe.ok, false);
assert.match(unsafe.error, /outside the allowlist/i);

assert.equal(extractResponseText({ output_text: 'hello' }), 'hello');
assert.equal(extractResponseText({ output: [{ content: [{ type: 'output_text', text: 'hel' }, { type: 'output_text', text: 'lo' }] }] }), 'hello');

console.log('Muse agent policy/client parser tests passed.');
