#!/usr/bin/env node
// Every test file in this repository has to be reachable from an npm test
// script, otherwise it silently stops gating anything. Nine workbench suites had
// drifted out of `test:source` this way; this check keeps that from recurring.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const scripts = packageJson.scripts ?? {};
// Only this repository's own test roots. Walking the whole checkout would also
// pick up the pinned App product checkout that CI places beside it.
const scanRoots = ['desktop', 'scripts', 'tests'];
const testFilePattern = /\.(?:test|spec)\.(?:mjs|mts|cjs|cts|js|jsx|ts|tsx)$/;

function collectTestFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      files.push(...collectTestFiles(entryPath));
      continue;
    }
    if (testFilePattern.test(entry.name)) {
      files.push(path.relative(root, entryPath).split(path.sep).join('/'));
    }
  }
  return files;
}

function collectRepositoryTestFiles() {
  const files = fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && testFilePattern.test(entry.name))
    .map((entry) => entry.name);
  for (const scanRoot of scanRoots) {
    const directory = path.join(root, scanRoot);
    if (fs.existsSync(directory)) {
      files.push(...collectTestFiles(directory));
    }
  }
  return files;
}

function expandScript(name, seen) {
  if (seen.has(name)) {
    return [];
  }
  seen.add(name);
  const command = scripts[name];
  if (!command) {
    return [];
  }
  const expanded = [];
  for (const part of command.split(/&&|\|\|/)) {
    const segment = part.trim();
    const delegated = segment.match(/^(?:npm|bun) run ([@\w:.-]+)$/);
    if (delegated) {
      expanded.push(...expandScript(delegated[1], seen));
      continue;
    }
    expanded.push(segment);
  }
  return expanded;
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const body = escaped
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '(?:.*/)?');
  return new RegExp(`^${body}$`);
}

function ownedPatterns() {
  const patterns = new Set();
  const testScripts = Object.keys(scripts).filter((name) => name === 'test' || name.startsWith('test:'));
  for (const name of testScripts) {
    for (const segment of expandScript(name, new Set())) {
      for (const match of segment.matchAll(/([\w@./-]*(?:\*[\w@./-]*)+|[\w@./-]+\.(?:test|spec)\.\w+)/g)) {
        const token = match[1];
        if (testFilePattern.test(token) || token.includes('*')) {
          patterns.add(token.replace(/^\//, ''));
        }
      }
      // A directory passed to a test runner owns every suite below it.
      for (const match of segment.matchAll(/(?:bun test|node --test)\s+([^&|]+)/g)) {
        for (const token of match[1].trim().split(/\s+/)) {
          if (testFilePattern.test(token) || token.includes('*') || token.startsWith('-')) {
            continue;
          }
          const target = token.replace(/\/$/, '');
          if (fs.existsSync(path.join(root, target)) && fs.statSync(path.join(root, target)).isDirectory()) {
            patterns.add(`${target}/**/*.test.*`);
            patterns.add(`${target}/**/*.spec.*`);
          }
        }
      }
    }
  }
  return [...patterns];
}

const patterns = ownedPatterns();
const matchers = patterns.map((pattern) => globToRegExp(pattern));
const testFiles = collectRepositoryTestFiles().sort();
const unowned = testFiles.filter((file) => !matchers.some((matcher) => matcher.test(file)));

if (unowned.length > 0) {
  process.stderr.write('Test files are not reachable from any npm test script:\n');
  process.stderr.write(unowned.map((file) => `- ${file}\n`).join(''));
  process.stderr.write('\nAdd them to a lane (for example test:node-suite or test:bun-suite).\n');
  process.exit(1);
}

process.stdout.write(`All ${testFiles.length} Studio test files are reachable from a test script.\n`);
