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

function download(url, dest, cb, redirectCount = 0) {
  if (redirectCount > 5) {
    cb(new Error('Too many redirects while downloading.'));
    return;
  }
  https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      // Handle redirect (no file stream yet)
      download(response.headers.location, dest, cb, redirectCount + 1);
      return;
    }
    if (response.statusCode !== 200) {
      cb(new Error('Failed to download: ' + response.statusCode));
      return;
    }
    const file = fs.createWriteStream(dest);
    response.pipe(file);
    file.on('finish', () => file.close(cb));
    file.on('error', (err) => {
      fs.unlink(dest, () => cb(err));
    });
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
  // Always rename from 'ledfx-dev-yz' after extraction
  fs.rename('ledfx-dev-yz', targetDir, cb);
}


function main() {
  if (fs.existsSync('ledfx-dev-yz')) {
    console.error("A folder named 'ledfx-dev-yz' already exists in this directory.\nPlease move or remove it before running this command to avoid overwriting your data.\nAborting.");
    process.exit(1);
  }
  if (!process.stdin.isTTY) {
    console.error('Interactive prompts require a TTY. Please run this script in a proper terminal.');
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
              // Always rename from 'ledfx-dev-yz' after extraction
              fs.rename('ledfx-dev', 'ledfx-dev-yz', (renameErr) => {
                if (renameErr) {
                  console.error('Rename to ledfx-dev-yz failed:', renameErr.message);
                  printManualInstructions(dir);
                  rl.close();
                  return;
                }
                renameLedfxDev(dir, (err3) => {
                  if (err3) {
                    console.error('Rename failed:', err3.message);
                    printManualInstructions(dir);
                    rl.close();
                    return;
                  }
                  // Add __welcome__ folder to workspace file
                  const workspacePath = path.join(process.cwd(), dir, 'ledfx.code-workspace');
                  let workspaceJson;
                  try {
                    workspaceJson = JSON.parse(fs.readFileSync(workspacePath, 'utf8'));
                  } catch (e) {
                    console.error('Could not read workspace file:', e.message);
                    rl.close();
                    return;
                  }
                  if (!Array.isArray(workspaceJson.folders)) workspaceJson.folders = [];
                  // Only add __welcome__ if not already present
                  const hasWelcome = workspaceJson.folders.some(f => f.path === "__welcome__");
                  if (!hasWelcome) {
                    workspaceJson.folders.push({ path: "__welcome__", name: "_Welcome_" });
                    fs.writeFileSync(workspacePath, JSON.stringify(workspaceJson, null, 2));
                  }

                  // Create __welcome__/README.md
                  const welcomeDir = path.join(process.cwd(), dir, '__welcome__');
                  if (!fs.existsSync(welcomeDir)) fs.mkdirSync(welcomeDir);
                  const welcomeReadme = path.join(welcomeDir, 'README.md');
                  fs.writeFileSync(welcomeReadme, '# Welcome!\n\nUse **Run Task** (Ctrl+Shift+P → Run Task) to initialize or start a subproject.');

                  // Auto-run ledfx.setup.js as a child process if present
                  const setupPath = path.join(process.cwd(), dir, 'ledfx.setup.js');
                  if (fs.existsSync(setupPath)) {
                    console.log('Running ledfx.setup.js...');
                    const { spawn } = require('child_process');
                    const child = spawn(process.execPath, [setupPath], {
                      cwd: path.join(process.cwd(), dir),
                      stdio: 'inherit'
                    });
                    child.on('exit', (code) => {
                      if (code !== 0) {
                        console.error(`ledfx.setup.js exited with code ${code}`);
                      }
                      // Auto-open workspace file in VS Code
                      const openVSCode = spawn('code', [workspacePath], {
                        cwd: path.join(process.cwd(), dir),
                        stdio: 'inherit',
                        shell: true
                      });
                      openVSCode.on('error', (err) => {
                        if (err.code === 'ENOENT') {
                          console.error('VS Code (code) command not found. Please open the workspace file manually:');
                          console.error(workspacePath);
                        } else {
                          console.error('Failed to open workspace in VS Code:', err.message);
                        }
                      });
                      rl.close();
                    });
                  } else {
                    // Auto-open workspace file in VS Code
                    const { spawn } = require('child_process');
                    const openVSCode = spawn('code', [workspacePath], {
                      cwd: path.join(process.cwd(), dir),
                      stdio: 'inherit',
                      shell: true
                    });
                    openVSCode.on('error', (err) => {
                      if (err.code === 'ENOENT') {
                        console.error('VS Code (code) command not found. Please open the workspace file manually:');
                        console.error(workspacePath);
                      } else {
                        console.error('Failed to open workspace in VS Code:', err.message);
                      }
                    });
                    rl.close();
                  }
                });
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

main();

function printManualInstructions(dir) {
  console.log('\nManual fallback:');
  console.log('1. Download the latest ledfx-dev.zip from:');
  console.log('   https://github.com/YeonV/create-ledfx/releases/latest');
  console.log('2. Extract it.');
  console.log(`3. Rename the 'ledfx-dev' folder to 'ledfx-dev-yz', then rename 'ledfx-dev-yz' to '${dir}'.`);
  console.log(`4. Open ${dir}/ledfx.code-workspace in VS Code and run the Init Workspace task.`);
}

main();