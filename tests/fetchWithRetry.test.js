const { test, describe, beforeEach, mock } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const dashboardPath = path.join(__dirname, '../js/dashboard.js');
const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');

describe('fetchWithRetry', () => {
    let context;
    let fetchMock;
    let consoleWarnMock;
    let activeTimeouts;

    beforeEach(() => {
        fetchMock = mock.fn();
        consoleWarnMock = mock.fn();
        activeTimeouts = [];

        const manualSetTimeout = (cb, delay) => {
            activeTimeouts.push({ cb, delay });
            return 123; // Dummy timer ID
        };

        const sandbox = {
            fetch: fetchMock,
            console: {
                ...console,
                warn: consoleWarnMock,
                error: () => {}
            },
            CONFIG: { API_BASE: 'https://api.example.com' },
            document: {
                addEventListener: () => {},
                getElementById: () => ({ style: {}, addEventListener: () => {} }),
                querySelector: () => ({ style: {} }),
                querySelectorAll: () => [],
                createElement: () => ({ style: {}, classList: { add:()=>{}, remove:()=>{} }, innerHTML: '' }),
                body: { appendChild: () => {} }
            },
            window: {
                addEventListener: () => {},
                localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
                crypto: { getRandomValues: () => {} },
                location: { protocol: 'http:', host: 'localhost' }
            },
            localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
            Chart: class {},
            setTimeout: manualSetTimeout
        };

        context = vm.createContext(sandbox);

        // Helper to advance time manually
        context.tick = () => {
            if (activeTimeouts.length > 0) {
                const { cb } = activeTimeouts.shift();
                cb();
            }
        };

        // Also helper to check active timeouts
        context.getActiveTimeouts = () => activeTimeouts;

        vm.runInContext(dashboardCode, context);
    });

    test('should return response on success (200 OK)', async () => {
        const mockResponse = { status: 200, ok: true, json: async () => ({ data: 'success' }) };
        fetchMock.mock.mockImplementation(async () => mockResponse);

        const response = await context.fetchWithRetry('https://api.example.com/test');
        assert.strictEqual(response.status, 200);
        assert.strictEqual(fetchMock.mock.callCount(), 1);
    });

    test('should retry on 429 and eventually succeed', async () => {
        const retryAfter = 1;
        const rateLimitResponse = {
            status: 429,
            ok: false,
            json: async () => ({ retry_after: retryAfter })
        };
        const successResponse = { status: 200, ok: true };

        let callCount = 0;
        fetchMock.mock.mockImplementation(async () => {
             callCount++;
             if (callCount === 1) return rateLimitResponse;
             return successResponse;
        });

        const promise = context.fetchWithRetry('https://api.example.com/test');

        // Wait a tick to let fetch run and setTimeout be called
        await new Promise(r => setImmediate(r));

        // Check if timeout was scheduled
        assert.strictEqual(context.getActiveTimeouts().length, 1);
        assert.strictEqual(context.getActiveTimeouts()[0].delay, retryAfter * 1000);

        // Advance time
        context.tick();

        const response = await promise;

        assert.strictEqual(response.status, 200);
        assert.strictEqual(fetchMock.mock.callCount(), 2);
    });

    test('should throw error after max retries', async () => {
        const retryAfter = 0.1;
        const rateLimitResponse = {
            status: 429,
            ok: false,
            json: async () => ({ retry_after: retryAfter })
        };

        fetchMock.mock.mockImplementation(async () => rateLimitResponse);

        const promise = context.fetchWithRetry('https://api.example.com/test', {}, 3);

        // We need to tick 3 times
        for (let i = 0; i < 3; i++) {
            await new Promise(r => setImmediate(r)); // Let loop run
            if (context.getActiveTimeouts().length > 0) {
                context.tick();
            }
        }

        await assert.rejects(promise, {
            message: 'Rate limited after multiple retries'
        });

        assert.strictEqual(fetchMock.mock.callCount(), 3);
    });
});
