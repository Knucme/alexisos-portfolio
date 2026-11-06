/* ===================================================================
   AlexisOS - github.js
   Live GitHub feed for the MASTER page: recently pushed repos, the
   latest commit messages, and a 14-day push activity chart.

   Uses GitHub's public REST API (no token). That allows 60 requests an
   hour per visitor, so results are cached in the browser for 10 minutes
   and reused if GitHub is unreachable. Each source is flagged like a
   telemetry readout:
     [LIVE]       fetched just now
     [CACHE 4M]   from the browser cache, 4 minutes old
     [NO DATA]    nothing available (shown instead of guessing)
   =================================================================== */
(function () {
  "use strict";

  const USER = "Knucme";
  const API = "https://api.github.com";
  const TTL = 10 * 60 * 1000;          // refresh at most every 10 minutes
  const KEY = "alexisos-gh-v1";

  let memo = null;                     // { t, repos, events, commits, commitsRepo }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }

  /* Display text without hyphens (links keep the real names). */
  function plain(t) { return String(t).replace(/(\w)-(?=\w)/g, "$1 "); }

  function ago(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 3600) { return Math.max(1, Math.round(s / 60)) + "M AGO"; }
    if (s < 86400) { return Math.round(s / 3600) + "H AGO"; }
    return Math.round(s / 86400) + "D AGO";
  }

  function readCache() {
    if (memo) { return memo; }
    try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
  }
  function writeCache(data) {
    memo = data;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked */ }
  }

  function getJSON(url) {
    return fetch(url, { headers: { Accept: "application/vnd.github+json" } }).then(function (r) {
      if (!r.ok) { throw new Error("HTTP " + r.status); }
      return r.json();
    });
  }

  /* Fetch everything (3 requests). Resolves with fresh data or rejects. */
  function fetchAll() {
    return Promise.all([
      getJSON(API + "/users/" + USER + "/repos?sort=pushed&per_page=6"),
      getJSON(API + "/users/" + USER + "/events/public?per_page=100")
    ]).then(function (res) {
      const repos = (res[0] || []).filter(function (r) { return !r.fork; });
      const events = res[1] || [];
      const newest = repos[0];
      const commitsReq = newest
        ? getJSON(API + "/repos/" + newest.full_name + "/commits?per_page=5").catch(function () { return []; })
        : Promise.resolve([]);
      return commitsReq.then(function (commits) {
        return {
          t: Date.now(),
          repos: repos.slice(0, 5).map(function (r) {
            return { name: r.name, url: r.html_url, lang: r.language || "", stars: r.stargazers_count,
                     pushed: r.pushed_at, desc: r.description || "" };
          }),
          events: events.filter(function (e) { return e.type === "PushEvent"; })
                        .map(function (e) { return { repo: e.repo.name, at: e.created_at }; }),
          commitsRepo: newest ? newest.name : "",
          commits: (commits || []).slice(0, 5).map(function (c) {
            return { sha: c.sha.slice(0, 7), url: c.html_url,
                     msg: (c.commit.message || "").split("\n")[0],
                     at: c.commit.author ? c.commit.author.date : "" };
          })
        };
      });
    });
  }

  /* 14-day push chart as block characters, oldest on the left. */
  function sparkline(events) {
    const days = 14, counts = new Array(days).fill(0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    events.forEach(function (e) {
      const d = new Date(e.at); d.setHours(0, 0, 0, 0);
      const idx = days - 1 - Math.round((today - d) / 86400000);
      if (idx >= 0 && idx < days) { counts[idx]++; }
    });
    return {
      counts: counts,
      max: Math.max.apply(null, counts) || 1,
      total: counts.reduce(function (a, b) { return a + b; }, 0)
    };
  }

  function flagText(data, live) {
    if (!data) { return "[NO DATA]"; }
    if (live) { return "[LIVE]"; }
    return "[CACHE " + Math.max(1, Math.round((Date.now() - data.t) / 60000)) + "M]";
  }

  /* Draw the three columns into `body`. */
  function draw(body, flag, data, live) {
    body.innerHTML = "";
    flag.textContent = flagText(data, live);
    flag.className = "gh-flag" + (data ? "" : " alert");

    const cols = el("div", "gh-cols");

    // Repositories
    const repoCol = el("div", "gh-col");
    repoCol.appendChild(el("div", "gh-h", "REPOSITORIES"));
    if (data && data.repos.length) {
      data.repos.forEach(function (r) {
        const row = el("div", "gh-row");
        const a = el("a", "gh-name", plain(r.name));
        a.href = r.url; a.target = "_blank"; a.rel = "noopener";
        row.appendChild(a);
        row.appendChild(el("span", "gh-meta", (r.lang ? r.lang.toUpperCase() + "  " : "") + "★" + r.stars));
        row.appendChild(el("span", "gh-when", ago(r.pushed)));
        repoCol.appendChild(row);
      });
    } else {
      repoCol.appendChild(el("div", "line dim", "NO DATA"));
    }
    cols.appendChild(repoCol);

    // Latest commits on the most recently pushed repo
    const comCol = el("div", "gh-col");
    comCol.appendChild(el("div", "gh-h", "LATEST COMMITS"));
    if (data && data.commits.length) {
      data.commits.forEach(function (c) {
        const row = el("div", "gh-row");
        const a = el("a", "gh-sha", c.sha);
        a.href = c.url; a.target = "_blank"; a.rel = "noopener";
        row.appendChild(a);
        row.appendChild(el("span", "gh-msg", plain(c.msg)));
        row.appendChild(el("span", "gh-when", c.at ? ago(c.at) : ""));
        comCol.appendChild(row);
      });
    } else {
      comCol.appendChild(el("div", "line dim", "NO DATA"));
    }
    cols.appendChild(comCol);

    // Activity
    const actCol = el("div", "gh-col");
    actCol.appendChild(el("div", "gh-h", "PUSH ACTIVITY, 14 DAYS"));
    if (data) {
      const sp = sparkline(data.events);
      // Bar chart: one bar per day, height = pushes that day
      const chart = el("div", "gh-chart");
      sp.counts.forEach(function (c, i) {
        const bar = el("div", "gh-bar" + (c ? "" : " zero"));
        bar.style.height = (c ? Math.max(12, Math.round(c / sp.max * 100)) : 4) + "%";
        bar.title = (13 - i === 0 ? "today" : (13 - i) + "d ago") + ": " + c + " push" + (c === 1 ? "" : "es");
        chart.appendChild(bar);
      });
      actCol.appendChild(chart);
      const axis = el("div", "gh-axis dim");
      axis.appendChild(el("span", null, "14D AGO"));
      axis.appendChild(el("span", null, "TODAY"));
      actCol.appendChild(axis);
      const last = data.events[0];
      actCol.appendChild(el("div", "gh-stat", "PUSHES ....... " + sp.total));
      actCol.appendChild(el("div", "gh-stat", "LAST PUSH .... " + (last ? ago(last.at) : "NONE")));
    } else {
      actCol.appendChild(el("div", "line dim", "NO DATA"));
    }
    const prof = el("a", "gh-profile", "github.com/" + USER);
    prof.href = "https://github.com/" + USER; prof.target = "_blank"; prof.rel = "noopener";
    actCol.appendChild(prof);
    cols.appendChild(actCol);

    body.appendChild(cols);
  }

  /* Fill a panel body. Shows cached data at once, then refreshes if stale. */
  function fill(body, flag) {
    const cached = readCache();
    const fresh = cached && Date.now() - cached.t < TTL;
    if (cached) { draw(body, flag, cached, false); }
    else { body.appendChild(el("div", "line dim", "ESTABLISHING UPLINK TO GITHUB...")); flag.textContent = "[SYNC]"; }
    if (fresh || typeof fetch !== "function") { if (!cached) { draw(body, flag, null, false); } return; }
    fetchAll().then(function (data) {
      writeCache(data);
      if (body.isConnected) { draw(body, flag, data, true); }
    }).catch(function () {
      if (body.isConnected) { draw(body, flag, cached, false); }
    });
  }

  window.GitFeed = { fill: fill, USER: USER };
})();
