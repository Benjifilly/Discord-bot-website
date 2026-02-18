const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

// ==========================================
// 1. Mock Browser Environment
// ==========================================

const mockWindow = {
    document: {
        addEventListener: (event, callback) => {
            // No-op for testing
        },
        getElementById: (id) => {
            return {
                style: {},
                value: '',
                addEventListener: () => {},
                closest: () => null,
                cloneNode: () => ({ querySelector: () => null, textContent: '' }),
                querySelector: () => null,
                classList: { add: () => {}, remove: () => {} },
                innerHTML: ''
            };
        },
        createElement: (tag) => {
            return {
                style: {},
                className: '',
                textContent: '',
                appendChild: () => {},
                innerHTML: '',
                onclick: null
            };
        },
    },
    navigator: {
        clipboard: {
            writeText: async (text) => { return Promise.resolve(); }
        }
    },
    console: console,
    setTimeout: setTimeout,
    MutationObserver: class {
        constructor(callback) {}
        observe() {}
        disconnect() {}
    },
    currentUser: { id: '123', username: 'TestUser', avatar: 'avatar_hash' },
    currentGuildData: { name: 'TestServer' }
};

// Add global scope variables
mockWindow.window = mockWindow;
mockWindow.document = mockWindow.document;
mockWindow.navigator = mockWindow.navigator;
mockWindow.MutationObserver = mockWindow.MutationObserver;

// ==========================================
// 2. Load and Execute Source File
// ==========================================

const sourcePath = path.join(__dirname, '../js/dashboard.js');
const code = fs.readFileSync(sourcePath, 'utf8');

// Create a context
vm.createContext(mockWindow);

// Execute the code
try {
    vm.runInContext(code, mockWindow);
} catch (e) {
    console.error("Error executing dashboard.js in sandbox:", e);
    process.exit(1);
}

// Extract the function to test
const parseDiscordMarkdown = mockWindow.parseDiscordMarkdown;

if (typeof parseDiscordMarkdown !== 'function') {
    console.error("Could not find parseDiscordMarkdown function in context.");
    process.exit(1);
}

// ==========================================
// 3. Test Runner
// ==========================================

let testsPassed = 0;
let testsFailed = 0;

function test(description, input, expected) {
    try {
        const actual = parseDiscordMarkdown(input);

        if (typeof expected === 'function') {
            expected(actual);
        } else if (expected instanceof RegExp) {
            assert.match(actual, expected);
        } else {
            assert.strictEqual(actual, expected);
        }

        console.log(`✅ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`❌ ${description}`);
        console.error(`   Input:    ${JSON.stringify(input)}`);
        if (error.expected) console.error(`   Expected: ${error.expected}`);
        if (error.actual) console.error(`   Actual:   ${error.actual}`);
        if (error.message) console.error(`   Error:    ${error.message}`);
        testsFailed++;
    }
}

console.log("🧪 Running Tests for parseDiscordMarkdown...\n");

// ==========================================
// 4. Test Cases
// ==========================================

// Basic Text
test('Plain text should remain unchanged',
    'Hello World',
    'Hello World'
);

// Bold
test('Bold text (**text**)',
    '**Hello**',
    '<strong>Hello</strong>'
);

// Italic
test('Italic text (*text*)',
    '*Hello*',
    '<em>Hello</em>'
);

test('Italic text (_text_)',
    '_Hello_',
    '<em>Hello</em>'
);

test('Bold Italic (***text***)',
    '***Hello***',
    '<strong><em>Hello</em></strong>'
);

// Underline
test('Underline (__text__)',
    '__Hello__',
    '<u>Hello</u>'
);

// Strikethrough
test('Strikethrough (~~text~~)',
    '~~Hello~~',
    '<del>Hello</del>'
);

// Headers
test('Header 1 (# text)',
    '# Header One',
    '<span class="md-header md-h1">Header One</span>'
);

test('Header 2 (## text)',
    '## Header Two',
    '<span class="md-header md-h2">Header Two</span>'
);

test('Header 3 (### text)',
    '### Header Three',
    '<span class="md-header md-h3">Header Three</span>'
);

// Blockquote
test('Blockquote (&gt; text)',
    '&gt; This is a quote',
    '<div class="md-blockquote">This is a quote</div>'
);

// Inline Code
test('Inline code (`code`)',
    '`const a = 1;`',
    '<code class="md-code">const a = 1;</code>'
);

// Code Blocks
test('Code block matches structure',
    "```\ncode\n```",
    (actual) => {
         const expectedPart = '<pre class="md-codeblock"><button class="codeblock-copy-btn"';
         assert.ok(actual.includes(expectedPart), 'Output should contain codeblock structure');
         assert.ok(actual.includes('\ncode\n'), 'Output should contain the code');
    }
);

// Newlines
test('Single newline to <br>',
    'Line 1\nLine 2',
    'Line 1<br>Line 2'
);

test('Double newline to paragraph spacing',
    'Para 1\n\nPara 2',
    'Para 1<br><div style="margin-top:8px"></div>Para 2'
);

// Integration: HTML Entities + Markdown
test('Escaped HTML preserved, Markdown parsed',
    '&lt;b&gt;Text&lt;/b&gt; **Bold**',
    '&lt;b&gt;Text&lt;/b&gt; <strong>Bold</strong>'
);

// Integration: Variable Spans + Markdown
test('Variable spans preserved, Markdown parsed',
    'Hello <span class="preview-var">@User</span>, **welcome**!',
    'Hello <span class="preview-var">@User</span>, <strong>welcome</strong>!'
);

// Summary
console.log(`\nTests Completed: ${testsPassed} passed, ${testsFailed} failed.`);

if (testsFailed > 0) {
    process.exit(1);
}
