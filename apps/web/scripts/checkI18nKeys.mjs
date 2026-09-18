// Fails when the Hindi and English dictionaries don't have the same shape
// (same keys, same value kinds, same array lengths). Run: pnpm --filter @lexbridge/web check:i18n
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const copyDirectory = path.resolve(scriptDirectory, '../src/brand/copy');
const LOCALES = ['en', 'hi'];

// Dictionary files use `export`, but the web package isn't "type": "module", so load ESM copies
function copyAsModules(locale) {
  const sourceDirectory = path.join(copyDirectory, locale);
  const targetDirectory = fs.mkdtempSync(path.join(os.tmpdir(), `lexbridge-i18n-${locale}-`));
  for (const fileName of fs.readdirSync(sourceDirectory)) {
    if (!fileName.endsWith('.js')) continue;
    const source = fs.readFileSync(path.join(sourceDirectory, fileName), 'utf8').replace(/from '(\.\/[^']+)\.js'/g, "from '$1.mjs'");
    if (/from '@\//.test(source)) {
      throw new Error(`${locale}/${fileName} imports an app alias; dictionaries must be plain data`);
    }
    fs.writeFileSync(path.join(targetDirectory, fileName.replace(/\.js$/, '.mjs')), source);
  }
  return targetDirectory;
}

function describeKind(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function compareShapes(reference, candidate, trail, problems) {
  const referenceKind = describeKind(reference);
  const candidateKind = describeKind(candidate);
  if (referenceKind !== candidateKind) {
    problems.push(`${trail}: en is ${referenceKind}, hi is ${candidateKind}`);
    return;
  }
  if (referenceKind === 'array') {
    if (reference.length !== candidate.length) {
      problems.push(`${trail}: en has ${reference.length} items, hi has ${candidate.length}`);
    }
    reference.forEach((item, index) => {
      if (index < candidate.length) compareShapes(item, candidate[index], `${trail}[${index}]`, problems);
    });
    return;
  }
  if (referenceKind === 'object') {
    const referenceKeys = Object.keys(reference);
    const candidateKeys = Object.keys(candidate);
    for (const key of referenceKeys) {
      if (!(key in candidate)) problems.push(`${trail}.${key}: missing in hi`);
      else compareShapes(reference[key], candidate[key], `${trail}.${key}`, problems);
    }
    for (const key of candidateKeys) {
      if (!(key in reference)) problems.push(`${trail}.${key}: only in hi`);
    }
    return;
  }
  if (referenceKind === 'function' && reference.length !== candidate.length) {
    problems.push(`${trail}: en function takes ${reference.length} arguments, hi takes ${candidate.length}`);
  }
  // Identifiers (ids, icon keys, feature flags) must stay identical across languages
  if (referenceKind === 'string' && /\.(id|icon|feature|href)$|\.ids\[\d+\]$/.test(trail) && reference !== candidate) {
    problems.push(`${trail}: identifier differs (en "${reference}", hi "${candidate}")`);
  }
}

const dictionaries = {};
for (const locale of LOCALES) {
  const moduleDirectory = copyAsModules(locale);
  const dictionaryModule = await import(pathToFileURL(path.join(moduleDirectory, 'index.mjs')).href);
  dictionaries[locale] = Object.values(dictionaryModule)[0];
}

const problems = [];
compareShapes(dictionaries.en, dictionaries.hi, 'dictionary', problems);

if (problems.length > 0) {
  console.error(`i18n check failed: ${problems.length} difference(s) between en and hi\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(`i18n check passed: en and hi dictionaries match (${Object.keys(dictionaries.en).length} areas)`);
