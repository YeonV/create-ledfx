// LedFx Workspace Setup Script (Node.js)
// Clones all required repositories into their respective folders

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- ANSI COLORS ---
const RESET = '\x1b[0m';
const BRIGHT = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

// --- CONFIGURATION ---
const REPOS = [
  { folder: 'frontend', url: 'https://github.com/YeonV/LedFx-Frontend-v2.git' },
  { folder: 'backend', url: 'https://github.com/LedFx/LedFx.git' },
  { folder: '_audio-visualiser', url: 'https://github.com/Mattallmighty/audio-visualiser.git', upstream: 'https://github.com/YeonV/audio-visualiser.git' },
  { folder: '_react-dynamic-module', url: 'https://github.com/YeonV/react-dynamic-module.git' },
  { folder: '_pipeline/tools/song_detector', url: 'https://github.com/YeonV/LedFx-Builds.git' },
  { folder: '_python-for-android', url: 'https://github.com/YeonV/python-for-android.git', upstream: 'https://github.com/broccoliboy/python-for-android.git' },
  { folder: '_pipeline_android', url: 'https://github.com/YeonV/ledfx-android.git', upstream: 'https://github.com/broccoliboy/ledfx-android.git' },
  { folder: '_download', url: 'https://github.com/YeonV/LedFx-Builds.git' },
  { folder: '_pipeline', url: 'https://github.com/YeonV/ledfx-web.git' }
];

const FOLDER_TEMPLATES = {
  'frontend': { path: 'frontend', name: '[Frontend] Web + CC', settings: { 'npm.packageManager': 'yarn' } },
  'backend': { path: 'backend', name: '[Backend] Core' },
  '_audio-visualiser': { path: '_audio-visualiser', name: '[Visualiser]', settings: { 'npm.packageManager': 'pnpm' } },
  '_react-dynamic-module': { path: '_react-dynamic-module', name: '[Dynamic Module]', settings: { 'npm.packageManager': 'yarn' } },
  '_pipeline/tools/song_detector': { path: '_pipeline/tools/song_detector', name: '[Song Detector]' },
  '_python-for-android': { path: '_python-for-android', name: '[Python For Android]' },
  '_pipeline_android': { path: '_pipeline_android', name: '[Build Android]' },
  '_download': { path: '_download', name: '[Download Page]', settings: { 'npm.packageManager': 'yarn' } },
  '_pipeline': { path: '_pipeline', name: '[Build]' }
};

const TASK_TEMPLATES = [
  { label: 'Init Workspace (clone all repos)', type: 'shell', command: 'node', args: ['ledfx.setup.js'], options: { cwd: '${workspaceFolder}/../' }, presentation: { reveal: 'always' }, group: 'build' },
  { label: '[Backend] Start', type: 'shell', command: 'uv', args: ['run', 'ledfx', '--offline', '-vv'], options: { cwd: '${workspaceFolder:[Backend] Core}' }, presentation: { reveal: 'always' }, group: 'build' },
  { label: '[Frontend] Start', type: 'shell', command: 'yarn', args: ['start'], options: { cwd: '${workspaceFolder:[Frontend] Web + CC}' }, presentation: { reveal: 'always' }, group: 'build' },
  { label: '[Backend] Init', type: 'shell', command: 'uv', args: ['run', 'ledfx-loopback-install'], options: { cwd: '${workspaceFolder:[Backend] Core}' }, presentation: { reveal: 'always' }, group: 'build', problemMatcher: [] },
  { label: '[Frontend] Init', type: 'shell', command: 'yarn', options: { cwd: '${workspaceFolder:[Frontend] Web + CC}' }, presentation: { reveal: 'always' }, group: 'build' },
  { label: '[Visualiser] Init', type: 'shell', command: 'pnpm', args: ['install'], options: { cwd: '${workspaceFolder:[Visualiser]}' }, presentation: { reveal: 'always' }, group: 'build' },
  { label: '[Visualiser] Start', type: 'shell', command: 'pnpm', args: ['dev'], options: { cwd: '${workspaceFolder:[Visualiser]}' }, presentation: { reveal: 'always' }, group: 'build' }
];

// --- CORE LOGIC ---

function cloneRepo(folder, url, upstream) {
  if (!fs.existsSync(folder)) {
    console.log(`\n${CYAN}Cloning ${url} into ${folder}...${RESET}`);
    const parent = path.dirname(folder);
    if (parent !== '.' && !fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    execSync(`git clone ${url} ${folder}`, { stdio: 'inherit' });
    
    if (upstream) {
      try {
        execSync(`git remote add upstream ${upstream}`, { cwd: folder, stdio: 'inherit' });
        console.log(`${GREEN}Added upstream remote (${upstream}) to ${folder}${RESET}`);
      } catch (e) {
        console.log(`${YELLOW}Failed to add upstream remote to ${folder}: ${e.message}${RESET}`);
      }
    }
  } else {
    console.log(`\n${YELLOW}Folder ${folder} already exists, skipping.${RESET}`);
  }
}

function showMenuAndClone() {
  const stdin = process.stdin;
  const stdout = process.stdout;
  
  // Pre-select 'frontend' and 'backend' by default
  let selected = REPOS.map(repo => repo.folder === 'frontend' || repo.folder === 'backend');
  let cursor = 0;

  function renderMenu() {
    stdout.write('\x1Bc'); // Clear screen
    
    // Clean, multi-line ASCII Art
    stdout.write(`${CYAN}${BRIGHT}
$$\\                      $$\\ $$$$$$$$\\       
$$ |                     $$ |$$  _____|      
$$ |      $$$$$$\\   $$$$$$$ |$$ |  $$\\   $$\\ 
$$ |     $$  __$$\\ $$  __$$ |$$$$$\\ $$\\ $$  |
$$ |     $$$$$$$$ |$$ /  $$ |$$  __|\\$$$$  / 
$$ |     $$   ____|$$ |  $$ |$$ |   $$  $$<  
$$$$$$$$\\$$$$$$$\\ \\$$$$$$$  |$$ |  $$  /\\$$\\ 
\\________|\\_______| \\_______|\\__|  \\__/  \\__|
${RESET}\n`);

    stdout.write(`${BRIGHT}${YELLOW}Select repos to clone (SPACE to toggle, ENTER to confirm):${RESET}\n\n`);
    
    REPOS.forEach((repo, idx) => {
      const friendlyName = FOLDER_TEMPLATES[repo.folder]?.name || repo.folder;
      const prefix = cursor === idx ? `${CYAN}${BRIGHT}>${RESET} ` : '  ';
      const mark = selected[idx] ? `${GREEN}[x]${RESET}` : `${DIM}[ ]${RESET}`;
      const lineColor = cursor === idx ? BRIGHT : '';
      
      stdout.write(`${prefix}${mark} ${lineColor}${friendlyName}${RESET}\n`);
    });
    
    stdout.write(`\n${DIM}Use UP/DOWN to navigate, SPACE to select, ENTER to confirm.${RESET}\n`);
  }

  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  renderMenu();

  stdin.on('data', function(key) {
    if (key === '\u0003') { // Ctrl+C
      process.exit();
    } else if (key === '\r') { // ENTER
      stdin.setRawMode(false);
      stdin.pause();
      
      // Only clone what is explicitly selected!
      let chosen = REPOS.filter((_, idx) => selected[idx]);
      
      stdout.write('\x1Bc'); // Clear screen before cloning
      
      if (chosen.length === 0) {
        console.log(`${YELLOW}No repositories selected. Creating an empty workspace...${RESET}\n`);
      }
      
      runCloning(chosen);
    } else if (key === '\u001b[A') { // UP
      cursor = (cursor - 1 + REPOS.length) % REPOS.length;
      renderMenu();
    } else if (key === '\u001b[B') { // DOWN
      cursor = (cursor + 1) % REPOS.length;
      renderMenu();
    } else if (key === ' ') { // SPACE
      selected[cursor] = !selected[cursor];
      renderMenu();
    }
  });
}

function runCloning(selectedRepos) {
  // 1. Clone all selected repos
  selectedRepos.forEach(repo => {
    cloneRepo(repo.folder, repo.url, repo.upstream);
  });

  // 2. Build folders array
  const selectedFolders = selectedRepos.map(repo => FOLDER_TEMPLATES[repo.folder]).filter(Boolean);
  const selectedFolderNames = selectedFolders.map(f => f.name);

  // 3. Always ensure the __welcome__ folder is injected into the workspace
  selectedFolders.push({ path: "__welcome__", name: "_Welcome_" });

  // 4. Filter tasks dynamically using your regex logic
  const filteredTasks = TASK_TEMPLATES.filter(task => {
    if (task.options && task.options.cwd) {
      const match = task.options.cwd.match(/\$\{workspaceFolder:([^}]+)}/);
      if (match) {
        return selectedFolderNames.includes(match[1]);
      }
    }
    return true; // Keep global tasks that don't depend on a specific workspaceFolder
  });

  // 5. Generate and write the final workspace file ONCE
  const workspaceFile = 'ledfx.code-workspace';
  const dynamicWorkspaceContent = {
    folders: selectedFolders,
    settings: {
      "workbench.startupEditor": "readme",
    },
    tasks: {
      version: '2.0.0',
      tasks: filteredTasks
    }
  };

  try {
    fs.writeFileSync(workspaceFile, JSON.stringify(dynamicWorkspaceContent, null, 2));
    console.log(`\n${GREEN}Workspace file dynamically generated for selected repos!${RESET}`);
  } catch (e) {
    console.error(`\n${YELLOW}Failed to write workspace file: ${e.message}${RESET}`);
  }
}

// Start the CLI application
showMenuAndClone();