#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function usage(msg) {
  if (msg) console.error('Error:', msg);
  console.error('Usage: node scripts/update-version.js x.y.z');
  process.exit(1);
}

const newVersion = process.argv[2];
if (!newVersion) {
  usage('no version provided');
}

const semverMatch = newVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!semverMatch) {
  usage(`version '${newVersion}' is not in the form x.y.z`);
}

const major = parseInt(semverMatch[1], 10);
const minor = parseInt(semverMatch[2], 10);
const patch = parseInt(semverMatch[3], 10);

// Map semver to a monotonically increasing integer for Android/iOS build numbers
// Common pattern: major*10000 + minor*100 + patch
const versionCodeInt = major * 10000 + minor * 100 + patch;

const projectRoot = path.resolve(__dirname, '..');

const jsonFiles = [
  path.join(projectRoot, 'package.json'),
  path.join(projectRoot, 'app.json'),
  path.join(projectRoot, 'package-lock.json'),
];

async function readJson(filePath) {
  try {
    const text = await fs.promises.readFile(filePath, 'utf8');
    return { text, json: JSON.parse(text) };
  } catch (err) {
    throw new Error(`Failed to read or parse ${filePath}: ${err.message}`);
  }
}

async function writeFileAtomic(filePath, text) {
  const tmpPath = filePath + '.tmp';
  await fs.promises.writeFile(tmpPath, text, 'utf8');
  await fs.promises.rename(tmpPath, filePath);
}

async function writeJsonAtomic(filePath, jsonObj) {
  const text = JSON.stringify(jsonObj, null, 2) + '\n';
  await writeFileAtomic(filePath, text);
}

async function updateJsonFiles() {
  for (const f of jsonFiles) {
    if (!fs.existsSync(f)) {
      console.warn(`Warning: ${path.relative(projectRoot, f)} not found, skipping.`);
      continue;
    }
    try {
      const { json } = await readJson(f);
      let changed = false;

      if (typeof json.version === 'string' && json.version !== newVersion) {
        json.version = newVersion;
        changed = true;
      }

      if (json.expo && typeof json.expo === 'object') {
        if (typeof json.expo.version === 'string' && json.expo.version !== newVersion) {
          json.expo.version = newVersion;
          changed = true;
        }
        // Some expo app.json uses expo.ios.buildNumber and expo.android.versionCode
        if (typeof json.expo.ios === 'object') {
          if (json.expo.ios.buildNumber !== String(versionCodeInt)) {
            json.expo.ios.buildNumber = String(versionCodeInt);
            changed = true;
          }
        }
        if (typeof json.expo.android === 'object') {
          if (json.expo.android.versionCode !== versionCodeInt) {
            json.expo.android.versionCode = versionCodeInt;
            changed = true;
          }
        }
      }

      if (changed) {
        await writeJsonAtomic(f, json);
        console.log(`Updated ${path.relative(projectRoot, f)} -> ${newVersion}`);
      } else {
        console.log(`No change needed for ${path.relative(projectRoot, f)}`);
      }
    } catch (err) {
      console.error(err.message);
      process.exitCode = 2;
    }
  }
}

// Update Android build.gradle (versionCode and versionName)
async function updateAndroidBuildGradle() {
  const gradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(gradlePath)) {
    console.warn('Warning: android/app/build.gradle not found, skipping Android native updates.');
    return;
  }
  let text = await fs.promises.readFile(gradlePath, 'utf8');

  let changed = false;

  const versionCodeRegex = /(versionCode)\s+\d+/;
  if (versionCodeRegex.test(text)) {
    text = text.replace(versionCodeRegex, `$1 ${versionCodeInt}`);
    changed = true;
  }

  const versionNameRegex = /(versionName)\s+"[^"]*"/;
  if (versionNameRegex.test(text)) {
    text = text.replace(versionNameRegex, `$1 "${newVersion}"`);
    changed = true;
  }

  if (changed) {
    await writeFileAtomic(gradlePath, text);
    console.log(`Updated android/app/build.gradle -> versionCode ${versionCodeInt}, versionName ${newVersion}`);
  } else {
    console.log('No versionCode/versionName patterns found in android/app/build.gradle, skipping.');
  }
}

// Update any AndroidManifest.xml files that may contain android:versionCode/android:versionName
async function updateAndroidManifests() {
  // search under android/** for AndroidManifest.xml
  const walk = (dir, list = []) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, list);
      else if (e.isFile() && e.name.toLowerCase() === 'androidmanifest.xml') list.push(full);
    }
    return list;
  };

  const androidDir = path.join(projectRoot, 'android');
  if (!fs.existsSync(androidDir)) return;

  const manifests = walk(androidDir, []);
  for (const m of manifests) {
    let text = await fs.promises.readFile(m, 'utf8');
    let changed = false;

    // android:versionCode="123"
    const vcRegex = /(android:versionCode=\")\d+(\")/;
    if (vcRegex.test(text)) {
      text = text.replace(vcRegex, `$1${versionCodeInt}$2`);
      changed = true;
    }

    const vnRegex = /(android:versionName=\")([^\"]*)(\")/;
    if (vnRegex.test(text)) {
      text = text.replace(vnRegex, `$1${newVersion}$3`);
      changed = true;
    }

    if (changed) {
      await writeFileAtomic(m, text);
      console.log(`Updated ${path.relative(projectRoot, m)} -> versionCode ${versionCodeInt}, versionName ${newVersion}`);
    }
  }
}

// Update iOS Info.plist files if present
async function updateIosInfoPlists() {
  const iosDir = path.join(projectRoot, 'ios');
  if (!fs.existsSync(iosDir)) {
    console.warn('Warning: ios directory not found, skipping iOS native updates.');
    return;
  }

  const walk = (dir, list = []) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, list);
      else if (e.isFile() && e.name === 'Info.plist') list.push(full);
    }
    return list;
  };

  const plists = walk(iosDir, []);
  for (const p of plists) {
    let text = await fs.promises.readFile(p, 'utf8');
    let changed = false;

    // Replace CFBundleShortVersionString (user-facing) and CFBundleVersion (build number)
    const shortRegex = /(\<key\>CFBundleShortVersionString\<\/key\>\s*\<string\>)([^<]*)(\<\/string\>)/;
    if (shortRegex.test(text)) {
      text = text.replace(shortRegex, `$1${newVersion}$3`);
      changed = true;
    }

    const buildRegex = /(\<key\>CFBundleVersion\<\/key\>\s*\<string\>)([^<]*)(\<\/string\>)/;
    if (buildRegex.test(text)) {
      text = text.replace(buildRegex, `$1${versionCodeInt}$3`);
      changed = true;
    }

    if (changed) {
      await writeFileAtomic(p, text);
      console.log(`Updated ${path.relative(projectRoot, p)} -> CFBundleShortVersionString ${newVersion}, CFBundleVersion ${versionCodeInt}`);
    }
  }
}

(async function main() {
  await updateJsonFiles();
  await updateAndroidBuildGradle();
  await updateAndroidManifests();
  await updateIosInfoPlists();
  console.log('Done.');
})();
