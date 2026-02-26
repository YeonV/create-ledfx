#!/usr/bin/env node

const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');
const https = require('https');
const { execSync, spawn } = require('child_process');
const os = require('os');
const readline = require('readline');

console.log('\x1b[36m%s\x1b[0m', '\nWelcome to create-ledfx!\n');

const GITHUB_REPO = 'YeonV/create-ledfx';
const API_RELEASES = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const USER_AGENT = 'create-ledfx-installer';

// --- ASYNC HELPER FUNCTIONS ---

// 1. Promisified Readline (User Input)
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

// 2. Promisified GitHub API Fetch
function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    https.get(API_RELEASES, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      // Handle GitHub Rate Limiting
      if (res.statusCode === 403) {
        return reject(new Error('GitHub API rate limit exceeded (HTTP 403). Try again in an hour or authenticate your request.'));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch release info. Status Code: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Could not parse GitHub release JSON data.'));
        }
      });
    }).on('error', reject);
  });
}

// 3. Promisified File Download
function download(url, dest, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      return reject(new Error('Too many redirects while downloading.'));
    }
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Handle redirect
        return resolve(download(res.headers.location, dest, redirectCount + 1));
      }
      if (res.statusCode !== 200) {
        return reject(new Error('Failed to download zip: ' + res.statusCode));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', (err) => {
        fs.unlink(dest, () => reject(err));
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

// --- MAIN EXECUTION ---

async function main() {
  // Check for TTY
  if (!process.stdin.isTTY) {
    console.error('\x1b[31m%s\x1b[0m', 'Interactive prompts require a TTY. Please run this script in a proper terminal.');
    process.exit(1);
  }

  // Pre-check: Ensure the temporary extraction folder doesn't already exist
  if (fs.existsSync('ledfx-dev')) {
    console.error('\x1b[31m%s\x1b[0m', "A folder named 'ledfx-dev' already exists in this directory.\nPlease move or remove it before running this command.\nAborting.");
    process.exit(1);
  }

  let dirName = '';

  try {
    // Prompt User
    dirName = await askQuestion('Project directory name: ');
    if (!dirName) {
      console.error('\x1b[31m%s\x1b[0m', 'Directory name cannot be empty. Aborting.');
      return;
    }

    const targetDir = path.resolve(process.cwd(), dirName);
    if (fs.existsSync(targetDir)) {
      console.error('\x1b[31m%s\x1b[0m', `Directory '${dirName}' already exists. Aborting.`);
      return;
    }

    // Fetch Release
    console.log('Fetching latest ledfx-dev workspace release...');
    const release = await fetchLatestRelease();
    const asset = (release.assets || []).find(a => a.name === 'ledfx-dev.zip');
    if (!asset) throw new Error('No ledfx-dev.zip found in latest release.');

    // Download Zip
    const zipUrl = asset.browser_download_url;
    const outZip = path.join(process.cwd(), 'ledfx-dev.zip');
    console.log('Downloading ledfx-dev.zip...');
    await download(zipUrl, outZip);

    // Extract Zip
    console.log('Extracting ledfx-dev.zip...');
    if (os.platform() === 'win32') {
      execSync(`tar -xf "${outZip}" -C "${process.cwd()}"`);
    } else {
      execSync(`unzip -q -o "${outZip}" -d "${process.cwd()}"`);
    }
    fs.unlinkSync(outZip); // Clean up zip file

    // Rename Dance Removed: We now directly rename 'ledfx-dev' to the user's directory!
    await fsPromises.rename('ledfx-dev', targetDir);

    // Edit Workspace File
    const workspacePath = path.join(targetDir, 'ledfx.code-workspace');
    let workspaceJson = JSON.parse(await fsPromises.readFile(workspacePath, 'utf8'));
    
    if (!Array.isArray(workspaceJson.folders)) workspaceJson.folders = [];
    const hasWelcome = workspaceJson.folders.some(f => f.path === "__welcome__");
    if (!hasWelcome) {
      workspaceJson.folders.push({ path: "__welcome__", name: "_Welcome_" });
      await fsPromises.writeFile(workspacePath, JSON.stringify(workspaceJson, null, 2));
    }

    // Create __welcome__/README.md
    const welcomeDir = path.join(targetDir, '__welcome__');
    if (!fs.existsSync(welcomeDir)) await fsPromises.mkdir(welcomeDir);
    const welcomeReadme = path.join(welcomeDir, 'README.md');
    await fsPromises.writeFile(welcomeReadme, '# Welcome!\n\nUse **Run Task** (Ctrl+Shift+P → Run Task) to initialize or start a subproject.');

    // Auto-run ledfx.setup.js (if exists)
    const setupPath = path.join(targetDir, 'ledfx.setup.js');
    if (fs.existsSync(setupPath)) {
      console.log('Running ledfx.setup.js...');
      await new Promise((resolve) => {
        const child = spawn(process.execPath, [setupPath], {
          cwd: targetDir,
          stdio: 'inherit'
        });
        child.on('exit', (code) => {
          if (code !== 0) console.error(`ledfx.setup.js exited with code ${code}`);
          resolve(); // Resolve anyway so we can still open VS Code
        });
        child.on('error', (err) => {
          console.error('Failed to run setup script:', err.message);
          resolve();
        });
      });
    }

    // Auto-open workspace in VS Code
    console.log('Opening workspace in VS Code...');
    await new Promise((resolve) => {
      const openVSCode = spawn('code', [workspacePath], {
        cwd: targetDir,
        stdio: 'inherit',
        shell: true
      });
      openVSCode.on('error', (err) => {
        if (err.code === 'ENOENT') {
          console.error('\x1b[33m%s\x1b[0m', '\nVS Code (code) command not found. Please open the workspace file manually:');
          console.error(workspacePath);
        } else {
          console.error('Failed to open workspace in VS Code:', err.message);
        }
        resolve();
      });
      openVSCode.on('exit', () => resolve());
    });

    console.log('\x1b[32m%s\x1b[0m', '\nSetup Complete! Have fun coding.\n');

  } catch (err) {
    // This single catch block handles ERRORS from APIs, Downloads, FS, EVERYTHING.
    console.error('\x1b[31m%s\x1b[0m', '\nAn error occurred during setup:');
    console.error(err.message);
    printManualInstructions(dirName || 'your-project-name');
  }
}

function printManualInstructions(dir) {
  console.log('\nManual fallback:');
  console.log('1. Download the latest ledfx-dev.zip from:');
  console.log('   https://github.com/YeonV/create-ledfx/releases/latest');
  console.log('2. Extract it.');
  console.log(`3. Rename the 'ledfx-dev' folder to '${dir}'.`);
  console.log(`4. Open ${dir}/ledfx.code-workspace in VS Code and run the Init Workspace task.`);
}

// Only called ONCE! :)
main();