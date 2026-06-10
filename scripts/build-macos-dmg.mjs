#!/usr/bin/env node
// charset: utf-8
/* global URL, console, process */
import { copyFileSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const appName = 'workdaddy';
const version = '1.0.1';
const desktopDir = join(root, 'desktop', 'macos');
const webDistDir = join(root, 'web', 'dist');
const releaseDir = join(root, 'release', 'mac');
const buildDir = join(root, 'build', 'macos');
const appBundle = join(releaseDir, `${appName}.app`);
const contentsDir = join(appBundle, 'Contents');
const macOSDir = join(contentsDir, 'MacOS');
const resourcesDir = join(contentsDir, 'Resources');
const dmgPath = join(releaseDir, `${appName}-${version}.dmg`);
const dmgSourceDir = join(buildDir, 'dmg-root');
const temporaryDmgPath = join(buildDir, `${appName}-${version}.tmp.dmg`);

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function resetDirectory(path) {
  rmSync(path, { recursive: true, force: true });
  mkdirSync(path, { recursive: true });
}

async function main() {
  if (!existsSync(webDistDir)) {
    throw new Error('Missing web/dist. Run npm run build first.');
  }

  resetDirectory(buildDir);
  resetDirectory(releaseDir);
  mkdirSync(macOSDir, { recursive: true });
  mkdirSync(resourcesDir, { recursive: true });

  run('clang', [
    '-fobjc-arc',
    join(desktopDir, 'Workdaddy.m'),
    '-framework',
    'Cocoa',
    '-framework',
    'UniformTypeIdentifiers',
    '-framework',
    'WebKit',
    '-O2',
    '-o',
    join(macOSDir, appName),
  ]);

  copyFileSync(join(desktopDir, 'Info.plist'), join(contentsDir, 'Info.plist'));
  copyFileSync(join(desktopDir, 'AppIcon.icns'), join(resourcesDir, 'AppIcon.icns'));
  copyFileSync(
    join(desktopDir, 'file-system-polyfill.js'),
    join(resourcesDir, 'file-system-polyfill.js')
  );
  await cp(webDistDir, join(resourcesDir, 'web'), { recursive: true });

  run('codesign', ['--force', '--deep', '--sign', '-', appBundle]);

  resetDirectory(dmgSourceDir);
  await cp(appBundle, join(dmgSourceDir, `${appName}.app`), { recursive: true });
  symlinkSync('/Applications', join(dmgSourceDir, 'Applications'));

  run('hdiutil', [
    'create',
    '-volname',
    appName,
    '-srcfolder',
    dmgSourceDir,
    '-ov',
    '-format',
    'UDRW',
    temporaryDmgPath,
  ]);
  run('hdiutil', ['convert', temporaryDmgPath, '-format', 'UDZO', '-o', dmgPath]);
  rmSync(temporaryDmgPath, { force: true });

  console.log(`Created ${dmgPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
