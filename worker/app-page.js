import { AI_FILTER_PRESETS } from "./ai-selector.js";

export const TOOLS = [
  {
    id: "rss-magnet",
    name: "RSS 磁力提取",
    category: "下载辅助",
    path: "/tools/rss-magnet",
    status: "available",
    summary: "RSS 转磁力链接",
  },
];

export const ACCOUNT_DESIGN = {
  storage: "Cloudflare D1",
  sessions: "HttpOnly SameSite=Lax cookie + hashed session token",
  password_hashing: "PBKDF2-SHA256 with per-user salt",
  tables: ["account_users", "account_sessions"],
  current_capabilities: ["register", "login", "logout", "session"],
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusLabel(tool) {
  return tool.status === "available" ? "可用" : "待上线";
}

function toolInitial(tool) {
  return String(tool.name || "?").trim().slice(0, 1).toUpperCase();
}

function renderToolNav() {
  return TOOLS.map((tool) => (
    `<a class="nav-link" href="${escapeHtml(tool.path || "#")}" data-tool-link="${escapeHtml(tool.id)}">`
    + `<span><strong>${escapeHtml(tool.name)}</strong><span class="tool-meta">${escapeHtml(tool.category)}</span></span>`
    + '<span class="status-dot"></span>'
    + '</a>'
  )).join("");
}

function renderHomeTools() {
  return TOOLS.map((tool) => {
    const disabled = tool.status !== "available";
    const href = disabled ? "#" : tool.path;
    return `<a class="home-tool-card" href="${escapeHtml(href)}" data-tool-card="${escapeHtml(tool.id)}" aria-disabled="${disabled}">`
      + `<div class="tool-card-top"><div class="tool-icon">${escapeHtml(toolInitial(tool))}</div><span class="pill ${tool.status === "available" ? "available" : ""}">${escapeHtml(statusLabel(tool))}</span></div>`
      + `<div class="tool-card-title"><strong>${escapeHtml(tool.name)}</strong><span class="muted">${escapeHtml(tool.category)}</span><span class="muted">${escapeHtml(tool.summary || "")}</span></div>`
      + `<div class="tool-card-footer"><span class="muted">${escapeHtml(tool.path || "")}</span></div>`
      + '</a>';
  }).join("");
}

export function renderPage() {
  const toolsJson = JSON.stringify(TOOLS);
  const aiPresetsJson = JSON.stringify(AI_FILTER_PRESETS);
  const toolNavHtml = renderToolNav();
  const homeToolsHtml = renderHomeTools();
  const availableToolCount = TOOLS.filter((tool) => tool.status === "available").length;
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>凌月工具</title>
    <style>
      :root{color-scheme:light;--bg:#f4f6f8;--surface:#fff;--surface-2:#f9fafb;--line:#d7dde5;--text:#161a22;--muted:#647083;--brand:#155eef;--brand-2:#0f4bbd;--green:#117b55;--red:#b42318;--shadow:0 10px 30px rgba(15,23,42,.08)}
      *{box-sizing:border-box}
      body{margin:0;background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px}
      button,input,textarea,select{font:inherit}
      a{color:inherit;text-decoration:none}
      button{height:36px;border:1px solid var(--brand);border-radius:6px;background:var(--brand);color:#fff;padding:0 14px;cursor:pointer;white-space:nowrap}
      button:hover{background:var(--brand-2)}
      button.secondary{background:#fff;color:var(--brand)}
      button.ghost{border-color:transparent;background:transparent;color:inherit}
      button.danger{border-color:var(--red);background:var(--red)}
      button:disabled{cursor:not-allowed;opacity:.55}
      input,textarea,select{border:1px solid var(--line);border-radius:6px;background:#fff;color:var(--text)}
      input{height:38px;padding:0 11px}
      textarea{display:block;width:100%;padding:12px;line-height:20px;resize:vertical}
      h1,h2,h3,p{margin:0;letter-spacing:0}
      h1{font-size:22px;line-height:30px}
      h2{font-size:17px;line-height:24px}
      h3{font-size:14px;line-height:20px}
      .muted{color:var(--muted)}
      .status-ok{color:var(--green)}
      .status-error{color:var(--red)}
      .app{min-height:100vh}
      .site-header{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:18px;min-height:66px;padding:12px 24px;background:rgba(255,255,255,.92);border-bottom:1px solid var(--line);backdrop-filter:saturate(160%) blur(14px)}
      .brand{display:flex;align-items:center;gap:10px;min-width:max-content}
      .brand-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;background:#111827;color:#fff;font-weight:700}
      .brand-title{font-size:16px;font-weight:700}
      .brand-sub{font-size:12px;color:var(--muted);margin-top:2px}
      .top-nav{display:flex;align-items:center;gap:8px;min-width:0;flex:1;overflow-x:auto;padding:2px}
      #toolNav{display:flex;align-items:center;gap:8px}
      .nav-link{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:8px 12px;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--text);text-align:left;white-space:nowrap;transition:background .18s ease,border-color .18s ease,color .18s ease,transform .18s ease}
      .nav-link:hover{background:#f1f5f9;border-color:#dbe4ee}
      .nav-link.active{background:#eef4ff;border-color:#c7d7fe;color:var(--brand)}
      .nav-link:active{transform:scale(.98)}
      .nav-link:focus-visible,.home-tool-card:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}
      .nav-main{font-weight:700}
      .tool-meta{display:block;font-size:12px;color:var(--muted);margin-top:2px}
      .status-dot{width:8px;height:8px;border-radius:99px;background:#22c55e;flex:0 0 auto}
      .main{min-width:0}
      .topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:70px;padding:16px 24px;background:transparent}
      .top-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .rss-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .avatar{display:grid;place-items:center;width:32px;height:32px;border-radius:99px;background:#e8f0ff;color:var(--brand);font-weight:700}
      .shell{max-width:1320px;margin:0 auto;padding:0 24px 24px;view-transition-name:page-content}
      .view[hidden],.rss-actions[hidden]{display:none!important}
      .home-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
      .home-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
      .home-tool-card{display:grid;grid-template-rows:auto 1fr auto;gap:12px;min-height:150px;padding:16px;border:1px solid var(--line);border-radius:8px;background:var(--surface);transition:transform .22s cubic-bezier(.2,.8,.2,1),border-color .2s ease,box-shadow .2s ease}
      .home-tool-card:hover{border-color:#b6c4d7;box-shadow:var(--shadow);transform:translateY(-2px)}
      .home-tool-card:active{transform:translateY(0) scale(.99)}
      .tool-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
      .tool-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:8px;background:#eef4ff;color:var(--brand);font-weight:800}
      .tool-card-title{display:grid;gap:4px}
      .tool-card-title strong{font-size:16px;line-height:22px}
      .tool-card-footer{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .pill{display:inline-flex;align-items:center;min-height:24px;border:1px solid #c8d3e2;border-radius:99px;padding:0 8px;color:#3f4c5f;background:#f8fafc;font-size:12px}
      .pill.available{border-color:#bbf7d0;background:#f0fdf4;color:#166534}
      .tool-view{display:grid;gap:16px}
      .workspace{display:grid;grid-template-columns:minmax(280px,420px) minmax(0,1fr);gap:16px}
      .panel{border:1px solid var(--line);border-radius:8px;background:var(--surface)}
      .panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:60px;padding:13px 14px;border-bottom:1px solid var(--line)}
      .panel-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .panel-body{padding:14px}
      .input-panel textarea,.output-panel textarea{min-height:420px}
      .output-panel textarea{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
      .message{min-height:22px;margin-top:10px;color:var(--muted)}
      .message.error{color:var(--red)}
      .message.ok{color:var(--green)}
      .filter-grid{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:10px;margin-bottom:12px}
      .filter-grid label{display:grid;gap:6px;color:#3c4758}
      .filter-grid select{height:38px;padding:0 10px}
      .details-panel{margin-top:0}
      .table-wrap{overflow:auto}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}
      th{color:var(--muted);font-weight:600;white-space:nowrap}
      td.hash,.feed-cell{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
      .title-cell{min-width:240px}
      .feed-cell{max-width:420px;color:var(--muted)}
      .empty{color:var(--muted);text-align:center}
      dialog{width:min(440px,calc(100vw - 28px));border:1px solid var(--line);border-radius:8px;padding:0;box-shadow:0 24px 80px rgba(15,23,42,.22)}
      dialog::backdrop{background:rgba(15,23,42,.35)}
      .dialog-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--line)}
      .dialog-body{padding:16px}
      .tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
      .tabs button{border-color:var(--line);background:#fff;color:var(--text)}
      .tabs button.active{border-color:var(--brand);color:var(--brand);background:#eef4ff}
      .auth-form{display:grid;gap:10px}
      .auth-form label{display:grid;gap:6px;color:#3c4758}
      .auth-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:4px}
      .account-card{display:grid;gap:8px;padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)}
      .view.view-enter{animation:view-enter .28s cubic-bezier(.2,.8,.2,1) both}
      @keyframes view-enter{from{opacity:0;transform:translateY(10px) scale(.995)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes page-in{from{opacity:0;transform:translateY(12px) scale(.996)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes page-out{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-4px) scale(.998)}}
      ::view-transition-old(page-content){animation:page-out .16s cubic-bezier(.4,0,.2,1) both}
      ::view-transition-new(page-content){animation:page-in .28s cubic-bezier(.2,.8,.2,1) both}
      @media(max-width:940px){
        .site-header{align-items:flex-start;display:grid;grid-template-columns:1fr auto;gap:12px}
        .top-nav{grid-column:1/-1}
        .workspace{display:block}
        .output-panel{margin-top:16px}
        .topbar{align-items:flex-start}
        .shell{padding:16px}
        .input-panel textarea,.output-panel textarea{min-height:300px}
        .filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media(max-width:560px){
        .topbar{display:grid}
        .home-grid{grid-template-columns:1fr}
        .filter-grid{grid-template-columns:1fr}
        .site-header{padding:12px 16px}
      }
      @media(prefers-reduced-motion:reduce){
        *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition-duration:.001ms!important}
      }
    </style>
  </head>
  <body>
    <div class="app">
      <header class="site-header">
        <a class="brand" href="/" data-home-link>
          <div class="brand-mark">LT</div>
          <div>
            <div class="brand-title">凌月工具</div>
            <div class="brand-sub">lingyuetools.org</div>
          </div>
        </a>
        <nav class="top-nav" aria-label="工具导航">
          <a class="nav-link" href="/" data-home-link>
            <span class="nav-main">主页</span>
          </a>
          <div id="toolNav">${toolNavHtml}</div>
        </nav>
        <button id="accountBtn" type="button" class="secondary"><span id="accountLabel">登录</span></button>
      </header>
      <main class="main">
        <header class="topbar">
          <div>
            <h1 id="pageTitle">工具主页</h1>
            <p id="summaryText" class="muted">1 个可用工具</p>
          </div>
          <div class="top-actions">
            <div id="rssTopActions" class="rss-actions" hidden>
              <button id="parseBtn" type="button">解析 RSS</button>
              <button id="copyTopBtn" type="button" class="secondary">复制全部</button>
            </div>
          </div>
        </header>
        <div class="shell">
          <section id="homeView" class="view home-view" aria-label="工具主页">
            <div class="home-head">
              <h2>工具</h2>
              <span id="toolCount" class="pill">${availableToolCount} 个可用</span>
            </div>
            <div id="homeToolGrid" class="home-grid">${homeToolsHtml}</div>
          </section>
          <section id="rssToolView" class="view tool-view" aria-label="RSS 磁力提取" hidden>
            <section class="panel filters-panel" aria-label="AI 预设筛选">
              <div class="panel-head">
                <h2>AI 预设筛选</h2>
                <span id="aiStatus" class="pill">检查中</span>
              </div>
              <div class="panel-body">
                <div class="filter-grid">
                  <label>语言<select id="languagePreset"></select></label>
                  <label>画质<select id="qualityPreset"></select></label>
                  <label>字幕<select id="subtitlePreset"></select></label>
                  <label>封装<select id="containerPreset"></select></label>
                  <label>编码<select id="codecPreset"></select></label>
                  <label>策略<select id="modePreset"></select></label>
                </div>
                <div class="panel-actions">
                  <input id="deepseekKeyInput" type="password" autocomplete="off" placeholder="临时 DeepSeek Key" />
                  <button id="saveAiKeyBtn" type="button" class="secondary">使用 Key</button>
                  <button id="clearAiKeyBtn" type="button" class="secondary">清除 Key</button>
                  <button id="aiSelectBtn" type="button" class="secondary">AI 筛选</button>
                  <button id="restoreAllBtn" type="button" class="secondary">恢复全部</button>
                </div>
                <div id="aiMessage" class="message"></div>
              </div>
            </section>
            <section class="workspace">
              <div class="panel input-panel">
                <div class="panel-head">
                  <h2>RSS 地址</h2>
                  <button id="clearBtn" type="button" class="secondary">清空</button>
                </div>
                <div class="panel-body">
                  <textarea id="feedsInput" spellcheck="false" placeholder="每行一个 RSS 地址"></textarea>
                  <div id="messageBar" class="message"></div>
                </div>
              </div>
              <div class="panel output-panel">
                <div class="panel-head">
                  <h2>磁力链接</h2>
                  <div class="panel-actions">
                    <button id="copyBtn" type="button">复制</button>
                    <button id="downloadBtn" type="button" class="secondary">下载 txt</button>
                  </div>
                </div>
                <div class="panel-body">
                  <textarea id="magnetsOutput" spellcheck="false" readonly placeholder="解析出的 magnet 会按行排列在这里"></textarea>
                </div>
              </div>
            </section>
            <section class="panel details-panel">
              <div class="panel-head"><h2>明细</h2></div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>标题</th><th>BTIH</th><th>来源</th></tr></thead>
                  <tbody id="detailsBody"><tr><td colspan="3" class="empty">暂无结果</td></tr></tbody>
                </table>
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
    <dialog id="accountDialog">
      <div class="dialog-head">
        <h2>账号</h2>
        <button id="closeAccountBtn" class="ghost" type="button">关闭</button>
      </div>
      <div class="dialog-body">
        <div id="signedInView" hidden>
          <div class="account-card">
            <strong id="accountName"></strong>
            <span id="accountEmail" class="muted"></span>
          </div>
          <div class="auth-actions"><button id="logoutBtn" class="danger" type="button">退出登录</button></div>
        </div>
        <div id="signedOutView">
          <div class="tabs">
            <button id="loginTab" class="active" type="button">登录</button>
            <button id="registerTab" type="button">注册</button>
          </div>
          <form id="authForm" class="auth-form">
            <label id="nameField" hidden>显示名<input id="displayNameInput" autocomplete="name" /></label>
            <label>邮箱<input id="emailInput" type="email" autocomplete="email" required /></label>
            <label>密码<input id="passwordInput" type="password" autocomplete="current-password" minlength="8" required /></label>
            <div id="authMessage" class="message"></div>
            <div class="auth-actions"><button id="submitAuthBtn" type="submit">登录</button></div>
          </form>
        </div>
      </div>
    </dialog>
    <script>
      const tools = ${toolsJson};
      const aiPresets = ${aiPresetsJson};
      const state = {
        items: [],
        allItems: [],
        text: "",
        authMode: "login",
        user: null,
        accountsEnabled: true,
        aiConfigured: false,
        serverAiConfigured: false,
        aiModel: "",
        aiOptions: null,
        activeView: "home",
        routeReady: false
      };
      const $ = id => document.getElementById(id);
      const availableTools = () => tools.filter(tool => tool.status === "available");
      const toolById = id => tools.find(tool => tool.id === id);
      const toolByPath = path => tools.find(tool => tool.path === path);
      function setMessage(text, kind = "") {
        const el = $("messageBar");
        el.textContent = text || "";
        el.className = ("message " + kind).trim();
      }
      function setAiMessage(text, kind = "") {
        const el = $("aiMessage");
        el.textContent = text || "";
        el.className = ("message " + kind).trim();
      }
      function setAuthMessage(text, kind = "") {
        const el = $("authMessage");
        el.textContent = text || "";
        el.className = ("message " + kind).trim();
      }
      function setSummary(text, kind = "muted") {
        const el = $("summaryText");
        el.textContent = text;
        el.className = kind === "ok" ? "muted status-ok" : kind === "error" ? "muted status-error" : "muted";
      }
      async function api(path, options = {}) {
        const response = await fetch(path, { headers: { "Content-Type": "application/json" }, credentials: "same-origin", ...options });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || data.message || "HTTP " + response.status);
        return data;
      }
      function escapeHtml(value) {
        return String(value || "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }
      function statusLabel(tool) {
        return tool.status === "available" ? "可用" : "待上线";
      }
      function toolInitial(tool) {
        return String(tool.name || "?").trim().slice(0, 1).toUpperCase();
      }
      function renderNavigation() {
        $("toolNav").innerHTML = tools.map(tool => {
          return '<a class="nav-link" href="' + escapeHtml(tool.path || "#") + '" data-tool-link="' + escapeHtml(tool.id) + '">'
            + '<span><strong>' + escapeHtml(tool.name) + '</strong><span class="tool-meta">' + escapeHtml(tool.category) + '</span></span>'
            + '<span class="status-dot"></span>'
            + '</a>';
        }).join("");
      }
      function renderHomeTools() {
        const count = availableTools().length;
        $("toolCount").textContent = count + " 个可用";
        $("homeToolGrid").innerHTML = tools.map(tool => {
          const disabled = tool.status !== "available";
          const href = disabled ? "#" : tool.path;
          return '<a class="home-tool-card" href="' + escapeHtml(href) + '" data-tool-card="' + escapeHtml(tool.id) + '" aria-disabled="' + disabled + '">'
            + '<div class="tool-card-top"><div class="tool-icon">' + escapeHtml(toolInitial(tool)) + '</div><span class="pill ' + (tool.status === "available" ? "available" : "") + '">' + escapeHtml(statusLabel(tool)) + '</span></div>'
            + '<div class="tool-card-title"><strong>' + escapeHtml(tool.name) + '</strong><span class="muted">' + escapeHtml(tool.category) + '</span><span class="muted">' + escapeHtml(tool.summary || "") + '</span></div>'
            + '<div class="tool-card-footer"><span class="muted">' + escapeHtml(tool.path || "") + '</span></div>'
            + '</a>';
        }).join("");
      }
      function updateRouteChrome() {
        const isHome = state.activeView === "home";
        $("homeView").hidden = !isHome;
        $("rssToolView").hidden = state.activeView !== "rss-magnet";
        $("rssTopActions").hidden = state.activeView !== "rss-magnet";
        document.querySelectorAll("[data-home-link].nav-link").forEach(link => {
          link.classList.toggle("active", isHome);
        });
        document.querySelectorAll("[data-tool-link]").forEach(link => {
          link.classList.toggle("active", link.getAttribute("data-tool-link") === state.activeView);
        });
        if (isHome) {
          $("pageTitle").textContent = "工具主页";
          setSummary(availableTools().length + " 个可用工具", "muted");
          document.title = "凌月工具";
        } else {
          const tool = toolById(state.activeView);
          $("pageTitle").textContent = tool ? tool.name : "工具";
          document.title = (tool ? tool.name : "工具") + " - 凌月工具";
          if (state.items.length) {
            setSummary("已提取 " + state.items.length + " 条磁力链接", "ok");
          } else {
            setSummary("输入 RSS 地址后解析", "muted");
          }
        }
      }
      function visibleViewElement() {
        return state.activeView === "rss-magnet" ? $("rssToolView") : $("homeView");
      }
      function runRouteTransition(callback) {
        if (document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          document.startViewTransition(callback);
          return;
        }
        callback();
        const view = visibleViewElement();
        view.classList.remove("view-enter");
        void view.offsetWidth;
        view.classList.add("view-enter");
        window.setTimeout(() => view.classList.remove("view-enter"), 320);
      }
      function commitRoute(normalized, nextView, push) {
        state.activeView = nextView;
        updateRouteChrome();
        if (push && window.location.pathname !== normalized) {
          history.pushState({ path: normalized }, "", normalized);
        }
        state.routeReady = true;
      }
      function navigateTo(path, push = true) {
        const normalized = path === "/index.html" ? "/" : path;
        const tool = toolByPath(normalized);
        const nextView = tool ? tool.id : "home";
        const shouldAnimate = state.routeReady && state.activeView !== nextView;
        if (shouldAnimate) {
          runRouteTransition(() => commitRoute(normalized, nextView, push));
        } else {
          commitRoute(normalized, nextView, push);
        }
      }
      function handleNavigation(event) {
        const homeLink = event.target.closest("[data-home-link]");
        const toolLink = event.target.closest("[data-tool-link],[data-tool-card]");
        if (homeLink) {
          event.preventDefault();
          navigateTo("/");
          return;
        }
        if (toolLink) {
          const tool = toolById(toolLink.getAttribute("data-tool-link") || toolLink.getAttribute("data-tool-card"));
          if (!tool || tool.status !== "available") {
            event.preventDefault();
            return;
          }
          event.preventDefault();
          navigateTo(tool.path);
        }
      }
      function renderPresetControls(dynamicOptions = null) {
        state.aiOptions = dynamicOptions;
        for (const key of ["language", "quality", "subtitle", "container", "codec", "mode"]) {
          const select = $(key + "Preset");
          const options = dynamicOptions?.options?.[key] || [];
          if (!options.length) {
            select.innerHTML = '<option value="">先解析 RSS</option>';
            select.disabled = true;
            continue;
          }
          select.disabled = false;
          select.innerHTML = options.map(preset => '<option value="' + escapeHtml(preset.id) + '">' + escapeHtml(preset.label) + '</option>').join("");
          const defaultValue = dynamicOptions?.defaults?.[key] || options[0]?.id;
          if (defaultValue && options.some(option => option.id === defaultValue)) {
            select.value = defaultValue;
          }
        }
        updateAiAvailability();
      }
      function currentPreferences() {
        return {
          language: $("languagePreset").value,
          quality: $("qualityPreset").value,
          subtitle: $("subtitlePreset").value,
          container: $("containerPreset").value,
          codec: $("codecPreset").value,
          mode: $("modePreset").value
        };
      }
      function sessionAiKey() {
        try { return sessionStorage.getItem("deepseek_api_key") || ""; } catch { return ""; }
      }
      function setSessionAiKey(value) {
        try {
          if (value) sessionStorage.setItem("deepseek_api_key", value);
          else sessionStorage.removeItem("deepseek_api_key");
        } catch {}
      }
      function updateAiAvailability(model = state.aiModel) {
        if (model) state.aiModel = model;
        const hasTempKey = Boolean(sessionAiKey());
        state.aiConfigured = state.serverAiConfigured || hasTempKey;
        $("aiStatus").textContent = state.serverAiConfigured ? ("DeepSeek " + (state.aiModel || "")).trim() : hasTempKey ? "临时 Key 已启用" : "AI 未配置";
        $("aiSelectBtn").disabled = !state.aiConfigured || !state.allItems.length;
        $("deepseekKeyInput").value = hasTempKey ? "••••••••" : "";
      }
      function setAiStatus(configured, model) {
        state.serverAiConfigured = Boolean(configured);
        updateAiAvailability(model);
      }
      async function loadAiStatus() {
        try {
          const data = await api("/api/ai/status");
          setAiStatus(data.provider?.configured, data.provider?.model);
        } catch {
          setAiStatus(false, "");
        }
      }
      function saveAiKey() {
        const value = $("deepseekKeyInput").value.trim();
        if (!value || value === "••••••••") {
          setAiMessage(sessionAiKey() ? "临时 Key 已启用" : "请输入 DeepSeek Key", "error");
          return;
        }
        setSessionAiKey(value);
        updateAiAvailability();
        setAiMessage("临时 Key 已启用，仅保存在当前浏览器会话", "ok");
      }
      function clearAiKey() {
        setSessionAiKey("");
        updateAiAvailability();
        setAiMessage("临时 Key 已清除", "ok");
      }
      function renderDetails() {
        const body = $("detailsBody");
        if (!state.items.length) {
          body.innerHTML = '<tr><td colspan="3" class="empty">暂无结果</td></tr>';
          return;
        }
        body.innerHTML = state.items.map(item => {
          return '<tr><td class="title-cell">' + escapeHtml(item.title || item.hash) + '</td>'
            + '<td class="hash">' + escapeHtml(item.hash) + '</td>'
            + '<td class="feed-cell">' + escapeHtml(item.feed_url) + '</td></tr>';
        }).join("");
      }
      function updateOutput(items, text) {
        state.items = items || [];
        state.text = text || state.items.map(item => item.magnet).join("\\n");
        $("magnetsOutput").value = state.text;
        renderDetails();
        const count = state.items.length;
        if (state.activeView === "rss-magnet") {
          setSummary(count ? "已提取 " + count + " 条磁力链接" : "没有找到磁力链接", count ? "ok" : "muted");
        }
      }
      function feedUrls() {
        return $("feedsInput").value.split(/\\r?\\n/).map(line => line.trim()).filter(Boolean);
      }
      async function parseFeeds() {
        const feeds = feedUrls();
        if (!feeds.length) {
          setMessage("请输入 RSS 地址", "error");
          return;
        }
        $("parseBtn").disabled = true;
        setMessage("正在解析 RSS，并用 AI 识别可选项...");
        setAiMessage("");
        try {
          const data = await api("/api/rss/extract", { method: "POST", body: JSON.stringify({ feeds }) });
          state.allItems = data.items || [];
          renderPresetControls(data.ai_options || null);
          updateOutput(state.allItems, data.text || "");
          setMessage("完成：" + feeds.length + " 个订阅，" + (data.count || 0) + " 条磁力链接", "ok");
          if (data.ai_options) {
            setAiMessage(data.ai_options.summary || "AI 已根据 RSS 生成可选预设", "ok");
          } else if (data.ai_options_error) {
            setAiMessage("AI 选项识别失败：" + data.ai_options_error.detail, "error");
          } else {
            setAiMessage(state.allItems.length ? "请检查 AI 配置后重新解析" : "没有可用于筛选的结果", "error");
          }
        } catch (error) {
          setMessage(error.message, "error");
          setSummary("解析失败", "error");
        } finally {
          $("parseBtn").disabled = false;
          updateAiAvailability();
        }
      }
      async function selectWithAi() {
        if (!state.allItems.length) {
          setAiMessage("请先解析 RSS", "error");
          return;
        }
        if (!state.aiConfigured) {
          setAiMessage("DeepSeek API Key 未配置", "error");
          return;
        }
        $("aiSelectBtn").disabled = true;
        setAiMessage("正在筛选...");
        const key = sessionAiKey();
        try {
          const payload = { items: state.allItems, preferences: currentPreferences() };
          if (key && !state.serverAiConfigured) payload.deepseek_api_key = key;
          const data = await api("/api/rss/ai-select", { method: "POST", body: JSON.stringify(payload) });
          updateOutput(data.selected_items || [], data.text || "");
          setAiMessage(data.summary || "已保留 " + (data.count || 0) + " 条", "ok");
          setMessage("AI 筛选完成：" + (data.count || 0) + " / " + state.allItems.length, "ok");
        } catch (error) {
          setAiMessage(error.message, "error");
        } finally {
          $("aiSelectBtn").disabled = !state.aiConfigured;
        }
      }
      function restoreAll() {
        if (!state.allItems.length) {
          setAiMessage("没有可恢复的结果", "error");
          return;
        }
        updateOutput(state.allItems, state.allItems.map(item => item.magnet).join("\\n"));
        setAiMessage("已恢复全部结果", "ok");
      }
      async function copyOutput() {
        if (!state.text) {
          setMessage("没有可复制的磁力链接", "error");
          return;
        }
        try {
          await navigator.clipboard.writeText(state.text);
        } catch {
          $("magnetsOutput").select();
          document.execCommand("copy");
        }
        setMessage("已复制到剪贴板", "ok");
      }
      function downloadOutput() {
        if (!state.text) {
          setMessage("没有可下载的磁力链接", "error");
          return;
        }
        const blob = new Blob([state.text + "\\n"], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "magnets.txt";
        link.click();
        URL.revokeObjectURL(url);
      }
      function clearAll() {
        $("feedsInput").value = "";
        state.allItems = [];
        renderPresetControls(null);
        updateOutput([], "");
        setMessage("");
        setAiMessage("");
        if (state.activeView === "rss-magnet") setSummary("输入 RSS 地址后解析", "muted");
        updateAiAvailability();
      }
      function setAuthMode(mode) {
        state.authMode = mode;
        $("loginTab").classList.toggle("active", mode === "login");
        $("registerTab").classList.toggle("active", mode === "register");
        $("nameField").hidden = mode !== "register";
        $("submitAuthBtn").textContent = mode === "login" ? "登录" : "注册";
        $("passwordInput").autocomplete = mode === "login" ? "current-password" : "new-password";
        setAuthMessage("");
      }
      function renderAccount() {
        const signedIn = Boolean(state.user);
        $("signedInView").hidden = !signedIn;
        $("signedOutView").hidden = signedIn;
        $("accountLabel").textContent = signedIn ? state.user.display_name : "登录";
        if (signedIn) {
          $("accountName").textContent = state.user.display_name;
          $("accountEmail").textContent = state.user.email;
        }
      }
      async function loadSession() {
        try {
          const data = await api("/api/account/session");
          state.user = data.user;
          state.accountsEnabled = data.accounts?.enabled !== false;
          renderAccount();
          if (!state.accountsEnabled) setAuthMessage("账号服务未启用", "error");
        } catch {
          renderAccount();
        }
      }
      async function submitAuth(event) {
        event.preventDefault();
        if (!state.accountsEnabled) {
          setAuthMessage("账号服务未启用", "error");
          return;
        }
        const payload = {
          email: $("emailInput").value,
          password: $("passwordInput").value,
          display_name: $("displayNameInput").value
        };
        $("submitAuthBtn").disabled = true;
        try {
          const path = state.authMode === "login" ? "/api/account/login" : "/api/account/register";
          const data = await api(path, { method: "POST", body: JSON.stringify(payload) });
          state.user = data.user;
          renderAccount();
          $("accountDialog").close();
        } catch (error) {
          setAuthMessage(error.message, "error");
        } finally {
          $("submitAuthBtn").disabled = false;
        }
      }
      async function logout() {
        try {
          await api("/api/account/logout", { method: "POST", body: "{}" });
        } finally {
          state.user = null;
          renderAccount();
          $("accountDialog").close();
        }
      }
      document.addEventListener("click", handleNavigation);
      window.addEventListener("popstate", () => navigateTo(window.location.pathname, false));
      $("parseBtn").addEventListener("click", parseFeeds);
      $("saveAiKeyBtn").addEventListener("click", saveAiKey);
      $("clearAiKeyBtn").addEventListener("click", clearAiKey);
      $("aiSelectBtn").addEventListener("click", selectWithAi);
      $("restoreAllBtn").addEventListener("click", restoreAll);
      $("copyBtn").addEventListener("click", copyOutput);
      $("copyTopBtn").addEventListener("click", copyOutput);
      $("downloadBtn").addEventListener("click", downloadOutput);
      $("clearBtn").addEventListener("click", clearAll);
      $("accountBtn").addEventListener("click", () => {
        $("accountDialog").showModal();
        renderAccount();
      });
      $("closeAccountBtn").addEventListener("click", () => $("accountDialog").close());
      $("loginTab").addEventListener("click", () => setAuthMode("login"));
      $("registerTab").addEventListener("click", () => setAuthMode("register"));
      $("authForm").addEventListener("submit", submitAuth);
      $("logoutBtn").addEventListener("click", logout);
      renderNavigation();
      renderHomeTools();
      renderPresetControls(null);
      navigateTo(window.location.pathname, false);
      loadSession();
      loadAiStatus();
    </script>
  </body>
</html>`;
}
