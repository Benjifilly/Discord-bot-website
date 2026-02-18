const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// Path to the script file
const scriptPath = path.join(__dirname, '../js/scripts.js');
const code = fs.readFileSync(scriptPath, 'utf8');

// Mock browser environment
const sandbox = {
    document: {
        addEventListener: () => {}, // Mock addEventListener since it's called at top level
        querySelector: () => ({}), // Mock querySelector
        getElementById: () => ({}), // Mock getElementById
    },
    window: {},
    console: console, // Allow logging
    fetch: () => {}, // Mock fetch
    setInterval: () => {}, // Mock setInterval
    // If there are other globals, they will be defined in the sandbox context
};

// Create a context for the script execution
const context = vm.createContext(sandbox);

try {
    vm.runInContext(code, context);
} catch (e) {
    console.error("Error loading script:", e);
    process.exit(1);
}

// Get the function from the sandbox
const parseUptime = sandbox.parseUptime;

if (typeof parseUptime !== 'function') {
    console.error("parseUptime function not found in script context.");
    process.exit(1);
}

console.log("Running tests for parseUptime...");

// Test cases
const testCases = [
    { input: "0:0:0", expected: 0 },
    { input: "0:0:1", expected: 1 },
    { input: "0:1:0", expected: 60 },
    { input: "1:0:0", expected: 3600 },
    { input: "1:1:1", expected: 3661 },
    { input: "10:30:15", expected: 37815 },
    { input: "24:0:0", expected: 86400 },

    // Edge cases
    { input: "0:0", expected: 0 }, // Length check fails
    { input: "1:2:3:4", expected: 0 }, // Length check fails
    { input: "", expected: 0 }, // Length check fails (split returns [""])
];

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }, index) => {
    try {
        const result = parseUptime(input);
        assert.strictEqual(result, expected, `Expected ${expected} for input "${input}", got ${result}`);
        console.log(`✅ Test ${index + 1} passed: "${input}" -> ${result}`);
        passed++;
    } catch (error) {
        console.error(`❌ Test ${index + 1} failed: ${error.message}`);
        failed++;
    }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
    process.exit(1);
}
