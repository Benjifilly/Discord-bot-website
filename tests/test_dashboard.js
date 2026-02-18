const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Read the source file
const dashboardPath = path.join(__dirname, '../js/dashboard.js');
const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');

// Mock browser environment
const sandbox = {
    document: {
        addEventListener: (event, callback) => {},
        getElementById: () => ({
             style: {},
             addEventListener: () => {},
             classList: { add: () => {}, remove: () => {} },
             value: '',
             checked: false,
             src: ''
        }),
        querySelector: () => ({
             style: {},
             addEventListener: () => {},
             classList: { add: () => {}, remove: () => {} }
        }),
        querySelectorAll: () => [],
        createElement: () => ({
             style: {},
             classList: { add: () => {}, remove: () => {} },
             appendChild: () => {},
             closest: () => null
        }),
        body: { appendChild: () => {} }
    },
    window: {},
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    console: console,
    setTimeout: setTimeout,
    setInterval: setInterval,
    Chart: class MockChart { constructor() {} destroy() {} }
};

// Create a context
vm.createContext(sandbox);

// Execute the code
try {
    vm.runInContext(dashboardCode, sandbox);
} catch (e) {
    console.error('Error loading dashboard.js:', e);
    process.exit(1);
}

// --- Tests for checkDifference ---

console.log('\nRunning tests for checkDifference...\n');

// Test script runs inside the sandbox to access 'originalSettings' and 'checkDifference'
const testScript = `
(function runTests() {
    const results = [];

    function runTest(name, fn) {
        try {
            fn();
            results.push({ name, status: 'PASS' });
        } catch (e) {
            results.push({ name, status: 'FAIL', error: e.message });
        }
    }

    function assert(cond, msg) {
        if (!cond) throw new Error(msg || 'Assertion failed');
    }

    // --- Test Cases ---

    // 1. Basic Value Changes
    runTest('String change detected', () => {
        originalSettings['test_string'] = 'old';
        const diff = checkDifference('test_string', 'new');
        assert(diff === true, 'Should detect string change');
    });

    runTest('String no change', () => {
        originalSettings['test_string'] = 'same';
        const diff = checkDifference('test_string', 'same');
        assert(diff === false, 'Should not detect change for same string');
    });

    runTest('Boolean change detected', () => {
        originalSettings['test_bool'] = false;
        const diff = checkDifference('test_bool', true);
        assert(diff === true, 'Should detect boolean change');
    });

    runTest('Boolean no change', () => {
        originalSettings['test_bool'] = true;
        const diff = checkDifference('test_bool', true);
        assert(diff === false, 'Should not detect change for same boolean');
    });

    // 2. Array Handling
    runTest('Array length change', () => {
        originalSettings['test_arr'] = ['a'];
        const diff = checkDifference('test_arr', ['a', 'b']);
        assert(diff === true, 'Should detect array length change');
    });

    runTest('Array content change (same length)', () => {
        originalSettings['test_arr'] = ['a', 'b'];
        const diff = checkDifference('test_arr', ['a', 'c']);
        assert(diff === true, 'Should detect array content change');
    });

    runTest('Array order change (should be equal)', () => {
        originalSettings['test_arr'] = ['a', 'b'];
        const diff = checkDifference('test_arr', ['b', 'a']);
        assert(diff === false, 'Should ignore array order');
    });

    // 3. Undefined/Null Original Values (Normalization)
    runTest('Undefined original vs False (Boolean)', () => {
        // originalSettings['new_bool'] is undefined
        const diff = checkDifference('new_bool', false);
        // Logic: if orig is undefined -> orig = false. false !== false -> false (no change)
        assert(diff === false, 'Undefined original should be treated as false for boolean input');
    });

    runTest('Undefined original vs True (Boolean)', () => {
        // originalSettings['new_bool_2'] is undefined -> false
        const diff = checkDifference('new_bool_2', true);
        assert(diff === true, 'Undefined original (false) vs true -> change');
    });

    runTest('Undefined original vs Empty Array', () => {
        // originalSettings['new_arr'] is undefined -> []
        const diff = checkDifference('new_arr', []);
        assert(diff === false, 'Undefined original should be treated as [] for array input');
    });

    runTest('Undefined original vs Non-Empty Array', () => {
        // originalSettings['new_arr_2'] is undefined -> []
        const diff = checkDifference('new_arr_2', ['item']);
        assert(diff === true, 'Undefined original ([]) vs [item] -> change');
    });

    runTest('Undefined original vs Empty String', () => {
        // originalSettings['new_str'] is undefined -> ''
        const diff = checkDifference('new_str', '');
        assert(diff === false, 'Undefined original should be treated as  for string input');
    });

    runTest('Null original vs Boolean', () => {
        originalSettings['null_bool'] = null;
        const diff = checkDifference('null_bool', false);
        assert(diff === false, 'Null original should be treated as false');
    });

    // 4. Edge Cases
    runTest('Undefined original vs Number', () => {
         // originalSettings['new_num'] is undefined
         const diff = checkDifference('new_num', 123);
         assert(diff === true, 'Should detect change for new number setting');
    });

    return results;
})();
`

const results = vm.runInContext(testScript, sandbox);

let passed = 0;
let failed = 0;

results.forEach(r => {
    if (r.status === 'PASS') {
        console.log(`✅ PASS: ${r.name}`);
        passed++;
    } else {
        console.error(`❌ FAIL: ${r.name} - ${r.error}`);
        failed++;
    }
});

console.log(`\nTotal: ${passed + failed}, Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) process.exit(1);
