/**
 * Bulk-create 1000 unique random 5-digit signup IDs via admin API.
 *
 * Usage:
 *   SIGNUP_ADMIN_TOKEN='your-jwt' node scripts/bulk-create-signup-ids.mjs
 *
 * Optional:
 *   SIGNUP_API_URL=https://aestheticrxnetworkportal-production-f8ab.up.railway.app/api
 *   SIGNUP_COUNT=1000
 *   SIGNUP_OUT=docs/signup-ids-created.txt
 */
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API =
  (process.env.SIGNUP_API_URL ||
    'https://aestheticrxnetworkportal-production-f8ab.up.railway.app/api'
  ).replace(/\/$/, '');
const TOKEN = (process.env.SIGNUP_ADMIN_TOKEN || process.env.ADMIN_TOKEN || '').trim();
const COUNT = Math.min(1000, Math.max(1, parseInt(process.env.SIGNUP_COUNT || '1000', 10) || 1000));
const OUT =
  process.env.SIGNUP_OUT ||
  path.join(__dirname, '..', 'docs', 'signup-ids-created.txt');

function generateUniqueFiveDigitIds(n) {
  const ids = new Set();
  // Exactly 5 digits: 10000–99999 (avoids leading-zero ambiguity)
  while (ids.size < n) {
    const id = String(Math.floor(10000 + Math.random() * 90000));
    ids.add(id);
  }
  return [...ids];
}

async function createOne(signupId) {
  const res = await fetch(`${API}/admin/signup-ids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ signup_id: signupId }),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json?.success === true, status: res.status, json, signupId };
}

async function main() {
  if (!TOKEN) {
    console.error('Missing SIGNUP_ADMIN_TOKEN (or ADMIN_TOKEN).');
    console.error('Copy the Bearer token from DevTools → Network → Authorization header.');
    process.exit(1);
  }

  const candidates = generateUniqueFiveDigitIds(COUNT);
  const created = [];
  const failed = [];
  const skipped = [];

  console.log(`Creating up to ${COUNT} signup IDs at ${API}/admin/signup-ids ...`);

  for (let i = 0; i < candidates.length; i++) {
    const id = candidates[i];
    let attempt = id;
    let result = await createOne(attempt);

    // On duplicate, try a few replacements
    let retries = 0;
    while (!result.ok && result.status === 400 && /already exists|duplicate/i.test(JSON.stringify(result.json)) && retries < 5) {
      attempt = String(Math.floor(10000 + Math.random() * 90000));
      result = await createOne(attempt);
      retries++;
    }

    if (result.ok) {
      created.push(attempt);
    } else if (/already exists|duplicate/i.test(JSON.stringify(result.json))) {
      skipped.push({ id: attempt, message: result.json?.message });
    } else {
      failed.push({ id: attempt, status: result.status, message: result.json?.message || result.json });
      // Stop on auth failure
      if (result.status === 401 || result.status === 403) {
        console.error('Auth failed — stopping.', result.json);
        break;
      }
    }

    if ((i + 1) % 50 === 0) {
      console.log(`Progress: ${i + 1}/${COUNT} (created=${created.length}, failed=${failed.length})`);
    }

    // Light throttle to avoid hammering Railway
    await new Promise((r) => setTimeout(r, 40));
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  const lines = [
    `# Signup IDs created ${new Date().toISOString()}`,
    `# count=${created.length}`,
    ...created,
  ];
  await writeFile(OUT, lines.join('\n') + '\n', 'utf8');
  await writeFile(
    OUT.replace(/\.txt$/, '.json'),
    JSON.stringify({ created_at: new Date().toISOString(), created, failed, skipped }, null, 2),
    'utf8'
  );

  console.log(`Done. Created: ${created.length}. Failed: ${failed.length}. Skipped dupes: ${skipped.length}.`);
  console.log(`List: ${OUT}`);
  if (failed.length) console.log('First failures:', failed.slice(0, 5));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
