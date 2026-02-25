#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const os = require('os');
const readline = require('readline');

console.log('\x1b[36m%s\x1b[0m', '\nWelcome to create-ledfx!\n');

const GITHUB_REPO = 'YeonV/create-ledfx';
const API_RELEASES = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const USER_AGENT = 'create-ledfx-installer';

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (response) => {
    if (response.statusCode !== 200) {
      cb(new Error('Failed to download: ' + response.statusCode));
      return;
    }
    response.pipe(file);
    file.on('finish', () => file.close(cb));
  }).on('error', (err) => {
    fs.unlink(dest, () => cb(err));
  });
}

function extractZip(zipPath, outDir, cb) {
  try {
    // Try to use 'unzip' (Linux/macOS) or 'tar' (Windows 10+')
    if (os.platform() === 'win32') {
      execSync(`tar -xf "${zipPath}" -C "${outDir}"`);
    } else {
      execSync(`unzip -o "${zipPath}" -d "${outDir}"`);
    }
    cb();
  } catch (e) {
    cb(e);
  }
}

function renameLedfxDev(targetDir, cb) {
  if (fs.existsSync(targetDir)) {
    cb(new Error(`Directory '${targetDir}' already exists.`));
    return;
  }
  fs.rename('ledfx-dev', targetDir, cb);
}


function main() {
  if (fs.existsSync('ledfx-dev')) {
    console.error("A folder named 'ledfx-dev' already exists in this directory.\nPlease move or remove it before running this command to avoid overwriting your data.\nAborting.");
    process.exit(1);
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Project directory name: ', function (dir) {
    const target = path.resolve(process.cwd(), dir);
    if (fs.existsSync(target)) {
      console.error(`Directory '${dir}' already exists.`);
      rl.close();
      return;
    }
    console.log('Fetching latest ledfx-dev workspace release...');
    https.get(API_RELEASES, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const asset = (release.assets || []).find(a => a.name === 'ledfx-dev.zip');
          if (!asset) throw new Error('No ledfx-dev.zip found in latest release.');
          const zipUrl = asset.browser_download_url;
          const outZip = path.join(process.cwd(), 'ledfx-dev.zip');
          download(zipUrl, outZip, (err) => {
            if (err) {
              console.error('Download failed:', err.message);
              printManualInstructions(dir);
              rl.close();
              return;
            }
            console.log('Extracting ledfx-dev.zip...');
            extractZip(outZip, process.cwd(), (err2) => {
              if (err2) {
                console.error('Extraction failed:', err2.message);
                printManualInstructions(dir);
                rl.close();
                return;
              }
              fs.unlinkSync(outZip);
              renameLedfxDev(dir, (err3) => {
                if (err3) {
                  console.error('Rename failed:', err3.message);
                  printManualInstructions(dir);
                  rl.close();
                  return;
                }
                console.log(`\nSuccess! Open ${dir}/ledfx.code-workspace in VS Code and run the Init Workspace task.`);
                rl.close();
              });
            });
          });
        } catch (e) {
          console.error('Could not parse release info:', e.message);
          printManualInstructions(dir);
          rl.close();
        }
      });
    }).on('error', (err) => {
      console.error('Failed to fetch release info:', err.message);
      printManualInstructions(dir);
      rl.close();
    });
  });
}

function printManualInstructions(dir) {
  console.log('\nManual fallback:');
  console.log('1. Download the latest ledfx-dev.zip from:');
  console.log('   https://github.com/YeonV/create-ledfx/releases/latest');
  console.log('2. Extract it.');
  console.log(`3. Rename the 'ledfx-dev' folder to '${dir}'.`);
  console.log(`4. Open ${dir}/ledfx.code-workspace in VS Code and run the Init Workspace task.`);
}

main();