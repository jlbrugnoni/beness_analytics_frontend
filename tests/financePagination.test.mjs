import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// Load the app's ES modules without changing the Next project's CommonJS setup.
const require = createRequire(import.meta.url);
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const pagination = moduleUrl(readFileSync(new URL('../src/utils/apiPagination.js', import.meta.url), 'utf8'));
const source = readFileSync(new URL('../src/utils/fetchApiRows.js', import.meta.url), 'utf8')
    .replace('"axios"', JSON.stringify(pathToFileURL(require.resolve('axios')).href))
    .replace('"./apiPagination.js"', JSON.stringify(pagination));
const { fetchApiRows } = await import(moduleUrl(source));

// Reproduce a TLS-terminating deployment returning HTTP/internal-host next links.
test('a 55-category catalog loads all four pages over the configured HTTPS backend', async () => {
    const backend = 'https://finance.example.test';
    const requested = [];
    const rows = await fetchApiRows(`${backend}/api/finance/categories/?company=7`, {
        adapter: async (config) => {
            const url = new URL(config.url);
            requested.push(url);
            assert.equal(url.origin, backend);
            assert.equal(url.searchParams.get('company'), '7');
            const page = Number(url.searchParams.get('page') || 1);
            return { status: 200, headers: {}, config, data: {
                results: Array.from({ length: page === 4 ? 10 : 15 }, (_, index) => ({ id: (page - 1) * 15 + index + 1 })),
                next: page < 4 ? `http://internal-api:8000/api/finance/categories/?company=7&page=${page + 1}` : null,
            } };
        },
    }, backend);
    assert.equal(requested.length, 4);
    assert.equal(rows.length, 55);
    assert.deepEqual(rows.map((row) => row.id), Array.from({ length: 55 }, (_, index) => index + 1));
});

test('paginated API errors are surfaced instead of returning a partial catalog', async () => {
    let count = 0;
    await assert.rejects(fetchApiRows('https://finance.example.test/api/finance/categories/', {
        adapter: async (config) => {
            if (++count === 2) throw new Error('Second page unavailable');
            return { status: 200, headers: {}, config, data: { results: [{ id: 1 }], next: '?page=2' } };
        },
    }, 'https://finance.example.test'), /Second page unavailable/);
});
