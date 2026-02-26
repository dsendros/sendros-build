(() => {
  // ─── State ───────────────────────────────────────────────────────────────
  const CLI = {
    history: [],
    historyIdx: -1,
    typing: false,
    opened: false,
  };

  // ─── Projects data ────────────────────────────────────────────────────────
  const PROJECTS = [
    {
      name: 'cocktological-evenings',
      title: 'Cocktological Evenings',
      desc: 'Themed cocktail evenings hosted 2015–2019; three drinks, a presentation, six guests per night.',
      url: 'projects/cocktological-evenings/',
    },
    {
      name: 'india-learning',
      title: 'India Learning',
      desc: 'Interactive quiz games to learn India\'s states, capitals, and regions.',
      url: 'projects/india-learning/',
    },
    {
      name: 'mixtiles-planner',
      title: 'Mixtiles Planner',
      desc: 'Drag-and-drop tool for planning gallery wall layouts using Mixtiles photo tiles.',
      url: 'projects/mixtiles-planner/',
    },
    {
      name: 'zoning-dashboard',
      title: 'DC Zoning Dashboard',
      desc: 'Track DC Zoning Commission, BZA, and Design Review cases with real-time DC GIS data.',
      url: 'projects/zoning-dashboard/',
    },
    {
      name: 'odca-dashboard',
      title: 'ODCA Dashboard',
      desc: 'Browse, search, and track DC Auditor recommendations by agency, status, and report.',
      url: 'projects/odca-dashboard/',
    },
  ];

  // ─── All known commands (for tab completion) ──────────────────────────────
  const COMMANDS = [
    'help', 'ls', 'cd', 'open', 'pwd', 'cat', 'whoami', 'contact', 'resume',
    'neofetch', 'git', 'grep', 'history', 'theme', 'clear', 'man', 'ping',
    'sudo', 'exit',
  ];

  // ─── DOM refs ─────────────────────────────────────────────────────────────
  const overlay    = document.getElementById('cli-overlay');
  const output     = document.getElementById('cli-output');
  const input      = document.getElementById('cli-input');
  const cliToggle  = document.getElementById('cli-toggle');

  // ─── Output helpers ───────────────────────────────────────────────────────
  function appendLine(text, cls = 'cli-out') {
    const el = document.createElement('div');
    el.className = `cli-line ${cls}`;
    el.textContent = text;
    output.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendHTML(html, cls = 'cli-out') {
    const el = document.createElement('div');
    el.className = `cli-line ${cls}`;
    el.innerHTML = html;
    output.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendBlank() {
    appendLine('', 'cli-dim');
  }

  function scrollToBottom() {
    output.scrollTop = output.scrollHeight;
  }

  // ─── Typewriter effect ────────────────────────────────────────────────────
  function typewriter(lines, delay = 18, callback) {
    CLI.typing = true;
    input.disabled = true;

    let lineIdx = 0;

    function nextLine() {
      if (lineIdx >= lines.length) {
        CLI.typing = false;
        input.disabled = false;
        input.focus();
        if (callback) callback();
        return;
      }

      const { text, cls = 'cli-out' } = lines[lineIdx];
      lineIdx++;

      const el = document.createElement('div');
      el.className = `cli-line ${cls}`;
      output.appendChild(el);

      let charIdx = 0;
      function nextChar() {
        if (charIdx >= text.length) {
          scrollToBottom();
          setTimeout(nextLine, delay * 2);
          return;
        }
        el.textContent += text[charIdx++];
        scrollToBottom();
        setTimeout(nextChar, delay);
      }
      nextChar();
    }

    nextLine();
  }

  // ─── Toggle CLI ───────────────────────────────────────────────────────────
  function toggleCLI() {
    const isHidden = overlay.classList.contains('hidden');
    if (isHidden) {
      overlay.classList.remove('hidden');
      document.body.classList.add('cli-active');
      cliToggle.classList.add('active');
      input.focus();
      if (!CLI.opened) {
        CLI.opened = true;
        showWelcome();
      }
    } else {
      overlay.classList.add('hidden');
      document.body.classList.remove('cli-active');
      cliToggle.classList.remove('active');
    }
  }

  // ─── Welcome banner ───────────────────────────────────────────────────────
  function showWelcome() {
    const now = new Date().toDateString();
    appendLine('┌──────────────────────────────────────────────────┐', 'cli-dim');
    appendLine('│  sendros.build — personal portfolio terminal      │', 'cli-dim');
    appendLine(`│  ${now.padEnd(49)}│`, 'cli-dim');
    appendLine('│  type \'help\' for available commands              │', 'cli-dim');
    appendLine('└──────────────────────────────────────────────────┘', 'cli-dim');
    appendBlank();
  }

  // ─── Command dispatcher ───────────────────────────────────────────────────
  function runCommand(raw) {
    if (!raw) return;

    // Echo the command
    appendLine(`dsendros@sendros.build:~$ ${raw}`, 'cli-cmd');

    const parts = raw.trim().split(/\s+/);
    const cmd   = parts[0].toLowerCase();
    const args  = parts.slice(1);

    switch (cmd) {
      case 'help':     cmdHelp();           break;
      case 'ls':       cmdLs(args);         break;
      case 'cd':       cmdCd(args);         break;
      case 'open':     cmdOpen(args);       break;
      case 'pwd':      cmdPwd();            break;
      case 'cat':      cmdCat(args);        break;
      case 'whoami':   cmdWhoami();         break;
      case 'contact':  cmdContact();        break;
      case 'resume':   cmdResume();         break;
      case 'neofetch': cmdNeofetch();       break;
      case 'git':      cmdGit(args);        break;
      case 'grep':     cmdGrep(args);       break;
      case 'history':  cmdHistory();        break;
      case 'theme':    cmdTheme(args);      break;
      case 'clear':    cmdClear();          break;
      case 'man':      cmdMan(args);        break;
      case 'ping':     cmdPing(args);       break;
      case 'sudo':     cmdSudo(raw);        break;
      case 'exit':     toggleCLI();         break;
      default:
        appendLine(`command not found: ${cmd}  (try 'help')`, 'cli-err');
    }

    appendBlank();
  }

  // ─── Commands ─────────────────────────────────────────────────────────────
  function cmdHelp() {
    const rows = [
      ['help',           'Show this help table'],
      ['ls [projects/]', 'List projects'],
      ['cd projects/<n>','Navigate to a project'],
      ['open <name>',    'Navigate to a project by short name'],
      ['pwd',            'Print working directory'],
      ['cat about.md',   'Show bio / about text'],
      ['whoami',         'Who is Dennis?'],
      ['contact',        'Show contact info and links'],
      ['resume',         'Show resume link'],
      ['neofetch',       'System info, terminal style'],
      ['git log',        'Fake git log of projects'],
      ['grep <term>',    'Search project names and descriptions'],
      ['history',        'Show session command history'],
      ['theme light|dark','Toggle site theme'],
      ['clear',          'Clear terminal output'],
      ['man <cmd>',      'Extended help for a command'],
      ['ping sendros.build', 'Ping the server'],
      ['exit',           'Close the terminal'],
    ];
    appendBlank();
    rows.forEach(([name, desc]) => {
      appendLine(`  ${name.padEnd(24)} ${desc}`, 'cli-out');
    });
  }

  function cmdLs(args) {
    const target = args[0] || '';
    if (target && target !== 'projects/' && target !== 'projects') {
      appendLine(`ls: cannot access '${target}': No such file or directory`, 'cli-err');
      return;
    }
    appendBlank();
    PROJECTS.forEach(p => {
      appendLine(`  ${p.name.padEnd(32)} ${p.desc}`, 'cli-out');
    });
  }

  function cmdCd(args) {
    const path = args[0] || '';
    const match = path.match(/^projects\/(.+)\/?$/);
    if (!match) {
      if (path === '~' || path === '') {
        appendLine('Already at ~  (this is a portfolio, not a real shell)', 'cli-dim');
      } else {
        appendLine(`cd: no such directory: ${path}`, 'cli-err');
      }
      return;
    }
    const name = match[1].replace(/\/$/, '');
    const project = PROJECTS.find(p => p.name === name);
    if (!project) {
      appendLine(`cd: no such project: ${name}`, 'cli-err');
      return;
    }
    appendLine(`Navigating to ${project.title}…`, 'cli-dim');
    setTimeout(() => { window.location.href = project.url; }, 600);
  }

  function cmdOpen(args) {
    const name = args[0];
    if (!name) {
      appendLine('Usage: open <project-name>', 'cli-err');
      return;
    }
    const project = PROJECTS.find(p => p.name === name);
    if (!project) {
      appendLine(`open: no such project: ${name}`, 'cli-err');
      return;
    }
    appendLine(`Navigating to ${project.title}…`, 'cli-dim');
    setTimeout(() => { window.location.href = project.url; }, 600);
  }

  function cmdPwd() {
    appendLine('~/sendros.build', 'cli-out');
  }

  function cmdCat(args) {
    const file = args[0];
    if (file !== 'about.md') {
      appendLine(`cat: ${file || ''}: No such file or directory`, 'cli-err');
      return;
    }
    appendBlank();
    appendLine('# About Dennis Sendros', 'cli-out');
    appendBlank();
    appendLine('I live in DC, where I ride my bike and complain about the height limit.', 'cli-out');
    appendLine('Talk to me for too long and I might ask you to play a complicated board game.', 'cli-out');
    appendBlank();
    appendLine('This site is a place for personal projects. I used to run a supper club for', 'cli-out');
    appendLine('cocktails called Cocktological Evenings. I\'m currently learning Indian history,', 'cli-out');
    appendLine('planning a gallery wall, and trying to get more housing built in DC.', 'cli-out');
  }

  function cmdWhoami() {
    typewriter([
      { text: '' },
      { text: 'Dennis Sendros', cls: 'cli-out' },
      { text: 'DC-based developer, cyclist, and housing advocate.', cls: 'cli-dim' },
      { text: 'Builds civic-tech dashboards, quizzes, and tools for fun.', cls: 'cli-dim' },
      { text: 'Former cocktail supper club host. Asks you to play board games.', cls: 'cli-dim' },
      { text: '' },
    ]);
  }

  function cmdContact() {
    appendBlank();
    appendHTML(
      'Email:    <a class="cli-link" href="mailto:dennis@sendros.build">dennis@sendros.build</a>',
      'cli-out'
    );
    appendHTML(
      'GitHub:   <a class="cli-link" href="https://github.com/dsendros" target="_blank" rel="noopener">github.com/dsendros</a>',
      'cli-out'
    );
  }

  function cmdResume() {
    appendBlank();
    appendHTML(
      'Resume: <a class="cli-link" href="mailto:dennis@sendros.build">Email me to request a copy</a>',
      'cli-out'
    );
  }

  function cmdNeofetch() {
    const isDark = document.body.classList.contains('dark-mode');
    const ascii = [
      '   .dSSSSSSSSb.',
      '  dSSSSSSSSSSSb',
      ' dSSSSSSSSSSSSb',
      ' SSSSSSSSSSSSS',
      ' SSSSSSSSSSSSS',
      ' `SSSSSSSSSSS\'',
      '  `SSSSSSSSSS\'',
      '   `SSSSSSSS\'',
    ];
    const info = [
      'dsendros@sendros.build',
      '───────────────────────',
      'OS: Human v1.0 (DC Edition)',
      'Location: Washington, DC',
      'Theme: ' + (isDark ? 'dark' : 'light'),
      'Skills: HTML · CSS · JS · Python',
      'Editor: Whatever works',
      'Hobbies: Bikes, board games, housing',
      'Projects: 5 (and counting)',
    ];

    const lines = [];
    const maxLen = Math.max(ascii.length, info.length);
    for (let i = 0; i < maxLen; i++) {
      const a = (ascii[i] || '').padEnd(22);
      const b = info[i] || '';
      lines.push({ text: `${a}  ${b}`, cls: i === 0 ? 'cli-out' : (i < ascii.length ? 'cli-ascii' : 'cli-out') });
    }
    lines.unshift({ text: '' });
    lines.push({ text: '' });

    typewriter(lines, 12);
  }

  function cmdGit(args) {
    if (args[0] !== 'log') {
      appendLine(`git: '${args[0] || ''}' is not a git command. Did you mean 'git log'?`, 'cli-err');
      return;
    }
    appendBlank();
    const log = [
      { hash: 'a1b2c3d', date: '2024-11', msg: 'feat: add ODCA audit recommendations dashboard' },
      { hash: 'e4f5a6b', date: '2024-09', msg: 'feat: add DC Zoning Dashboard with real-time GIS' },
      { hash: 'c7d8e9f', date: '2024-06', msg: 'feat: add Mixtiles gallery wall planner' },
      { hash: 'f0a1b2c', date: '2024-03', msg: 'feat: add India states learning quiz' },
      { hash: '3d4e5f6', date: '2023-11', msg: 'feat: add Cocktological Evenings archive' },
      { hash: '7a8b9c0', date: '2023-01', msg: 'init: sendros.build portfolio site' },
    ];
    log.forEach(({ hash, date, msg }) => {
      appendLine(`\x1b commit ${hash}`, 'cli-dim');
      appendLine(`  Date: ${date}`, 'cli-dim');
      appendLine(`  ${msg}`, 'cli-out');
      appendBlank();
    });
  }

  function cmdGrep(args) {
    const term = args.join(' ').toLowerCase();
    if (!term) {
      appendLine('Usage: grep <search-term>', 'cli-err');
      return;
    }
    const matches = PROJECTS.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.title.toLowerCase().includes(term) ||
      p.desc.toLowerCase().includes(term)
    );
    if (matches.length === 0) {
      appendLine(`grep: no matches for '${term}'`, 'cli-dim');
      return;
    }
    appendBlank();
    matches.forEach(p => {
      appendLine(`  ${p.name.padEnd(32)} ${p.desc}`, 'cli-out');
    });
  }

  function cmdHistory() {
    if (CLI.history.length === 0) {
      appendLine('(no history yet)', 'cli-dim');
      return;
    }
    appendBlank();
    CLI.history.forEach((cmd, i) => {
      appendLine(`  ${String(i + 1).padStart(3)}  ${cmd}`, 'cli-out');
    });
  }

  function cmdTheme(args) {
    const choice = (args[0] || '').toLowerCase();
    if (choice !== 'light' && choice !== 'dark') {
      appendLine('Usage: theme light|dark', 'cli-err');
      return;
    }
    const isDark = document.body.classList.contains('dark-mode');
    if ((choice === 'dark' && isDark) || (choice === 'light' && !isDark)) {
      appendLine(`Theme is already ${choice}.`, 'cli-dim');
      return;
    }
    document.getElementById('theme-toggle').click();
    appendLine(`Theme set to ${choice}.`, 'cli-out');
  }

  function cmdClear() {
    output.innerHTML = '';
  }

  function cmdMan(args) {
    const cmd = args[0];
    const manPages = {
      help:    'help — list all available commands with short descriptions.',
      ls:      'ls [projects/] — list projects. Without arguments, lists all projects in the home directory.',
      cd:      'cd projects/<name> — navigate to a project page. Use the short project name.',
      open:    'open <name> — same as cd: navigate to a project page by short name.',
      pwd:     'pwd — print the current working path (always ~/sendros.build).',
      cat:     'cat <file> — display file contents. Supported: about.md',
      whoami:  'whoami — display info about the site owner using a typewriter effect.',
      contact: 'contact — display email and social links.',
      resume:  'resume — display a link to request a resume copy.',
      neofetch:'neofetch — display an ASCII art info card, neofetch style.',
      git:     'git log — display a stylized log of project commits.',
      grep:    'grep <term> — search project names, titles, and descriptions for a term.',
      history: 'history — display the session command history.',
      theme:   'theme light|dark — switch the site color theme.',
      clear:   'clear — clear all terminal output.',
      man:     'man <command> — display extended help for a command.',
      ping:    'ping sendros.build — send a fake ICMP ping to the server.',
      sudo:    'sudo ... — escalate privileges (results may vary).',
      exit:    'exit — close the terminal overlay.',
    };
    if (!cmd) {
      appendLine('Usage: man <command>', 'cli-err');
      return;
    }
    const page = manPages[cmd.toLowerCase()];
    if (!page) {
      appendLine(`man: no manual entry for ${cmd}`, 'cli-err');
      return;
    }
    appendBlank();
    appendLine(page, 'cli-out');
  }

  function cmdPing(args) {
    const host = args[0] || 'sendros.build';
    appendBlank();
    appendLine(`PING ${host}: 56 data bytes`, 'cli-out');
    const delays = [12, 11, 13, 12];
    delays.forEach((ms, i) => {
      setTimeout(() => {
        appendLine(`64 bytes from ${host}: icmp_seq=${i} ttl=64 time=${ms} ms`, 'cli-out');
        if (i === delays.length - 1) {
          setTimeout(() => {
            appendBlank();
            appendLine(`--- ${host} ping statistics ---`, 'cli-out');
            appendLine(`${delays.length} packets transmitted, ${delays.length} received, 0% packet loss`, 'cli-out');
            appendLine(`round-trip min/avg/max = 11/12/13 ms`, 'cli-dim');
          }, 200);
        }
      }, i * 400);
    });
  }

  function cmdSudo(raw) {
    if (raw.includes('rm') && raw.includes('-rf')) {
      appendLine('nice try.', 'cli-err');
    } else {
      appendLine('sudo: you are not in the sudoers file. This incident will be reported.', 'cli-err');
    }
  }

  // ─── Tab completion ───────────────────────────────────────────────────────
  function handleTab() {
    const val = input.value;
    if (!val) return;

    // Complete project name after "cd projects/" or "open "
    const cdMatch  = val.match(/^cd\s+projects\/(.*)$/);
    const openMatch = val.match(/^open\s+(.*)$/);

    if (cdMatch || openMatch) {
      const prefix = cdMatch ? cdMatch[1] : openMatch[1];
      const matches = PROJECTS.filter(p => p.name.startsWith(prefix));
      if (matches.length === 1) {
        if (cdMatch) {
          input.value = `cd projects/${matches[0].name}`;
        } else {
          input.value = `open ${matches[0].name}`;
        }
      } else if (matches.length > 1) {
        appendLine(`dsendros@sendros.build:~$ ${val}`, 'cli-cmd');
        appendLine(matches.map(p => p.name).join('   '), 'cli-dim');
        scrollToBottom();
      }
      return;
    }

    // Complete command name
    const matches = COMMANDS.filter(c => c.startsWith(val));
    if (matches.length === 1) {
      input.value = matches[0];
    } else if (matches.length > 1) {
      appendLine(`dsendros@sendros.build:~$ ${val}`, 'cli-cmd');
      appendLine(matches.join('   '), 'cli-dim');
      scrollToBottom();
    }
  }

  // ─── Input event handlers ─────────────────────────────────────────────────
  input.addEventListener('keydown', (e) => {
    if (CLI.typing) return;

    switch (e.key) {
      case 'Enter': {
        e.preventDefault();
        const cmd = input.value.trim();
        if (cmd) {
          CLI.history.push(cmd);
          CLI.historyIdx = -1;
        }
        input.value = '';
        runCommand(cmd);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        if (CLI.history.length === 0) break;
        if (CLI.historyIdx === -1) {
          CLI.historyIdx = CLI.history.length - 1;
        } else if (CLI.historyIdx > 0) {
          CLI.historyIdx--;
        }
        input.value = CLI.history[CLI.historyIdx];
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (CLI.historyIdx === -1) break;
        if (CLI.historyIdx < CLI.history.length - 1) {
          CLI.historyIdx++;
          input.value = CLI.history[CLI.historyIdx];
        } else {
          CLI.historyIdx = -1;
          input.value = '';
        }
        break;
      }
      case 'Tab': {
        e.preventDefault();
        handleTab();
        break;
      }
      case 'Escape': {
        toggleCLI();
        break;
      }
    }
  });

  // ─── Toggle button ────────────────────────────────────────────────────────
  cliToggle.addEventListener('click', toggleCLI);

  // ─── Click inside overlay to keep focus on input ─────────────────────────
  overlay.addEventListener('click', (e) => {
    if (e.target !== input) input.focus();
  });
})();
