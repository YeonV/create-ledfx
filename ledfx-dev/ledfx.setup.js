// LedFx Workspace Setup Script (Node.js)
// Clones all required repositories into their respective folders

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repos = [
  {
    folder: 'frontend',
    url: 'https://github.com/YeonV/LedFx-Frontend-v2.git'
  },
  {
    folder: 'backend',
    url: 'https://github.com/LedFx/LedFx.git'
  },
  {
    folder: '_audio-visualiser',
    url: 'https://github.com/Mattallmighty/audio-visualiser.git',
    upstream: 'https://github.com/YeonV/audio-visualiser.git'
  },
  {
    folder: '_react-dynamic-module',
    url: 'https://github.com/YeonV/react-dynamic-module.git'
  },
  {
    folder: '_pipeline/tools/song_detector',
    url: 'https://github.com/YeonV/LedFx-Builds.git'
  },
  {
    folder: '_python-for-android',
    url: 'https://github.com/YeonV/python-for-android.git',
    upstream: 'https://github.com/broccoliboy/python-for-android.git'
  },
  {
    folder: '_pipeline_android',
    url: 'https://github.com/YeonV/ledfx-android.git',
    upstream: 'https://github.com/broccoliboy/ledfx-android.git'
  },
  {
    folder: '_download',
    url: 'https://github.com/YeonV/LedFx-Builds.git'
  },
  {
    folder: '_pipeline',
    url: 'https://github.com/YeonV/ledfx-web.git'
  }
];

const readline = require('readline');

function cloneRepo(folder, url, upstream) {
  if (!fs.existsSync(folder)) {
    console.log(`Cloning ${url} into ${folder}...`);
    // Ensure parent directory exists
    const parent = path.dirname(folder);
    if (parent !== '.' && !fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    execSync(`git clone ${url} ${folder}`, { stdio: 'inherit' });
    if (upstream) {
      try {
        execSync(`git remote add upstream ${upstream}`, { cwd: folder, stdio: 'inherit' });
        console.log(`Added upstream remote (${upstream}) to ${folder}`);
      } catch (e) {
        console.log(`Failed to add upstream remote to ${folder}:`, e.message);
      }
    }
  } else {
    console.log(`Folder ${folder} already exists, skipping.`);
  }
}

// Interactive menu and auto-run logic

function showMenuAndClone() {
  const stdin = process.stdin;
  const stdout = process.stdout;
  let selected = repos.map(() => false);
  let cursor = 0;

  // ANSI color codes
  const RESET = '\x1b[0m';
  const BRIGHT = '\x1b[1m';
  const DIM = '\x1b[2m';
  const UNDERSCORE = '\x1b[4m';
  const RED = '\x1b[31m';
  const GREEN = '\x1b[32m';
  const YELLOW = '\x1b[33m';
  const BLUE = '\x1b[34m';
  const MAGENTA = '\x1b[35m';
  const CYAN = '\x1b[36m';
  const WHITE = '\x1b[37m';

  function renderMenu() {
    stdout.write('\x1Bc'); // clear screen
    // Shorter ASCII Art Banner
    stdout.write(`${CYAN}${BRIGHT}`);
    stdout.write('                                             \n');
    stdout.write('                                             \n');
    stdout.write('$$\\                      $$\\ $$$$$$$$\\       \n');
    stdout.write('$$ |                     $$ |$$  _____|      \n');
    stdout.write('$$ |      $$$$$$\\   $$$$$$$ |$$ |  $$\\   $$\\ \n');
    stdout.write('$$ |     $$  __$$\\ $$  __$$ |$$$$$\\ $$\\ $$  |\n');
    stdout.write('$$ |     $$$$$$$$ |$$ /  $$ |$$  __|\\$$$$  / \n');
    stdout.write('$$ |     $$   ____|$$ |  $$ |$$ |   $$  $$<  \n');
    stdout.write('$$$$$$$$\\$$$$$$$\\ \\$$$$$$$  |$$ |  $$  /\\$$\\ \n');
    stdout.write('\\________|\\_______| \\_______|\\__|  \\__/  \\__|\n');
    stdout.write('                                             \n');
    stdout.write('                                             \n');
    stdout.write(`${RESET}\n`);
    stdout.write(`${BRIGHT}${YELLOW}Select repos to clone (SPACE to toggle, ENTER to confirm):${RESET}\n`);
    stdout.write('                                             \n');
    // Use friendly name from folderTemplates if available
    const folderTemplates = {
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
    repos.forEach((repo, idx) => {
      const friendly = folderTemplates[repo.folder]?.name;
      const name = friendly || repo.folder || repo.url.split('/').pop().replace('.git', '');
      const prefix = cursor === idx ? `${CYAN}${BRIGHT}>${RESET} ` : '  ';
      const mark = selected[idx] ? `${GREEN}[x]${RESET}` : `${DIM}[ ]${RESET}`;
      const lineColor = cursor === idx ? BRIGHT : '';
      stdout.write(`${prefix}${mark} ${lineColor}${name}${RESET}\n`);
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
      let chosen = selected.some(s => s) ? repos.filter((_, idx) => selected[idx]) : repos;
      runCloning(chosen);
    } else if (key === '\u001b[A') { // UP
      cursor = (cursor - 1 + repos.length) % repos.length;
      renderMenu();
    } else if (key === '\u001b[B') { // DOWN
      cursor = (cursor + 1) % repos.length;
      renderMenu();
    } else if (key === ' ') { // SPACE
      selected[cursor] = !selected[cursor];
      renderMenu();
    }
  });
}

function runCloning(selectedRepos) {
  selectedRepos.forEach(repo => {
    cloneRepo(repo.folder, repo.url, repo.upstream);
  });

  // Dynamic workspace file generation
  const workspaceFile = 'ledfx.code-workspace';
  // Adjusted folder templates and task templates to match required output
  const folderTemplates = {
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

  const taskTemplates = [
    {
      label: 'Init Workspace (clone all repos)',
      type: 'shell',
      command: 'node',
      args: ['ledfx.setup.js'],
      options: { cwd: '${workspaceFolder}/../' },
      presentation: { reveal: 'always' },
      group: 'build'
    },
    {
      label: '[Backend] Start',
      type: 'shell',
      command: 'uv',
      args: ['run', 'ledfx', '--offline', '-vv'],
      options: { cwd: '${workspaceFolder:[Backend] Core}' },
      presentation: { reveal: 'always' },
      group: 'build'
    },
    {
      label: '[Frontend] Start',
      type: 'shell',
      command: 'yarn',
      args: ['start'],
      options: { cwd: '${workspaceFolder:[Frontend] Web + CC}' },
      presentation: { reveal: 'always' },
      group: 'build'
    },
    {
      label: '[Backend] Init',
      type: 'shell',
      command: 'uv',// uv run ledfx-loopback-install
      args: ['run', 'ledfx-loopback-install'],
      options: { cwd: '${workspaceFolder:[Backend] Core}' },
      presentation: { reveal: 'always' },
      group: 'build',
      problemMatcher: []
    },
    {
      label: '[Frontend] Init',
      type: 'shell',
      command: 'yarn',
      options: { cwd: '${workspaceFolder:[Frontend] Web + CC}' },
      presentation: { reveal: 'always' },
      group: 'build'
    },
    {
      label: '[Visualiser] Init',
      type: 'shell',
      command: 'pnpm',
      args: ['install'],
      options: { cwd: '${workspaceFolder:[Visualiser]}' },
      presentation: { reveal: 'always' },
      group: 'build'
    },
    {
      label: '[Visualiser] Start',
      type: 'shell',
      command: 'pnpm',
      args: ['dev'],
      options: { cwd: '${workspaceFolder:[Visualiser]}' },
      presentation: { reveal: 'always' },
      group: 'build'
    }
  ];

  // Build folders array based on selected repos
  const selectedFolders = selectedRepos.map(repo => folderTemplates[repo.folder]).filter(Boolean);
  const selectedFolderNames = selectedFolders.map(f => f.name);
  // Filter tasks to only include those relevant to selected folders
  const filteredTasks = taskTemplates.filter(task => {
    if (task.options && task.options.cwd) {
      // Extract folder display name from workspace variable
      const match = task.options.cwd.match(/\$\{workspaceFolder:([^}]+)}/);
      if (match) {
        return selectedFolderNames.includes(match[1]);
      }
      // If not a folder-specific task, include
      return true;
    }
    return true;
  });

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
  fs.writeFileSync(workspaceFile, JSON.stringify(dynamicWorkspaceContent, null, 2));
  // Append __welcome__ folder entry if not present
  try {
    const workspaceJson = JSON.parse(fs.readFileSync(workspaceFile, 'utf8'));
    if (!Array.isArray(workspaceJson.folders)) workspaceJson.folders = [];
    const hasWelcome = workspaceJson.folders.some(f => f.path === "__welcome__");
    if (!hasWelcome) {
      workspaceJson.folders.push({ path: "__welcome__", name: "_Welcome_" });
      fs.writeFileSync(workspaceFile, JSON.stringify(workspaceJson, null, 2));
      console.log('Appended __welcome__ folder to workspace file.');
    }
  } catch (e) {
    console.error('Failed to append __welcome__ folder to workspace file:', e.message);
  }
  console.log('Workspace file dynamically generated for selected repos.');
}

// Start menu
showMenuAndClone();
