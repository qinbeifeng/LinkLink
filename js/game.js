import {
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  MODES,
  COLORS,
  BLOCK_COLORS,
} from "./constants.js";
import { Board, Pathfinding } from "./logic.js";
import { EffectManager, LightningArc, DestructionEffect } from "./effects.js";
import { UIHelper } from "./ui.js";
import { StorageManager } from "./storage.js";
import { DynamicBackground } from "./background.js";

const HELP_RULE = "点击两个相同的方块，且连线不超过两个弯折即可消除。";
const HELP_KEYS = "H: 提示 | S: 洗牌 | R: 重置 | P: 暂停";

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = WINDOW_WIDTH;
    this.canvas.height = WINDOW_HEIGHT;

    this.background = new DynamicBackground();
    this.state = "MENU"; // MENU, DIFFICULTY_SELECT, LEVEL_SELECT, PLAYING, PAUSED, GAMEOVER, VICTORY, LEADERBOARD, SETTINGS, HELP
    this.mode = null;
    this.gameType = null; // 'BASIC', 'CASUAL', 'LEVEL'
    this.currentLevel = 1;
    this.playerName = localStorage.getItem("linklink_player_name") || "Player";
    this.board = null;
    this.score = 0;
    this.comboCount = 0;
    this.lastMatchTime = 0;
    this.timeLeft = 0;
    this.totalTime = 0;
    this.leaderboardCategory = "BASIC"; // Current category in leaderboard view
    this.lastTick = 0;
    this.selected = null;
    this.effects = new EffectManager();
    this.parallax = {
      targetX: 0,
      targetY: 0,
      currentX: 0,
      currentY: 0,
      maxShiftX: 12,
      maxShiftY: 10,
    };
    this.lastFrameTime = Date.now();

    this.setupMainMenu();
    this.bindEvents();
    this.gameLoop();
  }

  // --- Menu Setups ---

  setVisible(el, visible) {
    if (!el) return;
    el.classList.toggle("hidden", !visible);
  }

  showPage(page) {
    const pageMain = document.getElementById("page-main");
    const pageHelp = document.getElementById("page-help");
    const pageLeaderboard = document.getElementById("page-leaderboard");
    const navBack = document.getElementById("nav-back");
    const gameCanvas = document.getElementById("gameCanvas");

    this.setVisible(pageMain, page === "MAIN");
    this.setVisible(pageHelp, page === "HELP");
    this.setVisible(pageLeaderboard, page === "LEADERBOARD");
    this.setVisible(navBack, page === "HELP" || page === "LEADERBOARD");

    if (gameCanvas)
      gameCanvas.style.display = page === "PLAYING" ? "block" : "none";
    if (navBack) navBack.onclick = () => this.setupMainMenu();
  }

  renderMenu(title, buttons, layout = "list") {
    const mainTitle = document.getElementById("main-title");
    const mainMenu = document.getElementById("main-menu");

    if (mainTitle) mainTitle.innerText = title;
    if (!mainMenu) return;

    mainMenu.innerHTML = "";
    mainMenu.dataset.layout = layout;

    buttons.forEach((btn) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "menu-btn";
      if (btn.active) el.classList.add("is-active");

      el.textContent = btn.label;

      if (typeof btn.stars === "number") {
        const starsEl = document.createElement("span");
        starsEl.className = "menu-stars";
        starsEl.textContent = "★".repeat(btn.stars) + "☆".repeat(3 - btn.stars);
        el.appendChild(starsEl);
      }

      if (btn.label === "返回主菜单") {
        if (layout === "grid-2") el.style.gridColumn = "span 2";
        if (layout === "grid-3") el.style.gridColumn = "span 3";
      }

      el.onclick = btn.action;
      mainMenu.appendChild(el);
    });
  }

  renderHelp() {
    const ruleEl = document.getElementById("help-rule");
    const keysEl = document.getElementById("help-keys");

    if (ruleEl) {
      ruleEl.innerText = HELP_RULE;
    }
    if (keysEl) {
      keysEl.innerText = HELP_KEYS;
    }
  }

  buildLeaderboardRows() {
    const data = StorageManager.getLeaderboard(this.leaderboardCategory);
    return data.map((entry, idx) => ({
      rank: idx + 1,
      name: entry.name,
      score: entry.score,
      time: entry.date,
    }));
  }

  renderLeaderboard() {
    const container = document.getElementById("leaderboard-table");
    if (!container) return;

    const rows = this.buildLeaderboardRows();
    let html =
      '<table class="leaderboard-table"><thead><tr><th>#</th><th>名字</th><th>得分</th><th>完成时间</th></tr></thead><tbody>';

    if (rows.length === 0) {
      html +=
        '<tr><td colspan="4" class="leaderboard-empty">暂无记录</td></tr>';
    } else {
      rows.forEach((r) => {
        html += `<tr><td>${r.rank}</td><td>${r.name}</td><td>${r.score}</td><td class="leaderboard-date">${r.time}</td></tr>`;
      });
    }

    html += "</tbody></table>";
    container.innerHTML = html;
  }

  setupMainMenu() {
    this.state = "MENU";
    this.showPage("MAIN");
    const mainButtons = [
      { label: "基本模式", action: () => this.setupDifficultyMenu() },
      { label: "休闲模式", action: () => this.startCasualGame() },
      { label: "关卡模式", action: () => this.setupLevelMenu() },
      {
        label: "排行榜",
        action: () => {
          this.state = "LEADERBOARD";
          this.leaderboardCategory = "BASIC";
          this.showLeaderboardPage();
        },
      },
      {
        label: "设置",
        action: () => {
          this.state = "SETTINGS";
          this.setupSettingsMenu();
        },
      },
      {
        label: "帮助",
        action: () => {
          this.state = "HELP";
          this.showHelpPage();
        },
      },
    ];
    this.renderMenu("LINK LINK", mainButtons, "list");
  }

  setupDifficultyMenu() {
    this.state = "DIFFICULTY_SELECT";
    this.showPage("MAIN");
    const difficultyButtons = Object.keys(MODES).map((name) => ({
      label: name,
      action: () => {
        this.gameType = "BASIC";
        this.startGame(name);
      },
    }));

    const allButtons = [
      ...difficultyButtons,
      { label: "返回主菜单", action: () => this.setupMainMenu() },
    ];
    this.renderMenu("选择难度", allButtons, "grid-2");
  }

  setupLevelMenu() {
    this.state = "LEVEL_SELECT";
    this.showPage("MAIN");
    const buttons = [];

    for (let i = 1; i <= 6; i++) {
      const isUnlocked = StorageManager.isLevelUnlocked(i);
      const stars = StorageManager.getLevelStars(i);

      buttons.push({
        label: isUnlocked ? `第 ${i} 关` : "🔒",
        stars: isUnlocked ? stars : 0,
        action: () => {
          if (!isUnlocked) return;
          this.gameType = "LEVEL";
          this.currentLevel = i;
          const mode = i <= 2 ? "Easy" : i <= 4 ? "Medium" : "Hard";
          this.startGame(mode);
        },
      });
    }

    buttons.push({ label: "返回主菜单", action: () => this.setupMainMenu() });
    this.renderMenu("选择关卡", buttons, "grid-3");
  }

  setupSettingsMenu() {
    this.state = "SETTINGS";
    this.showPage("MAIN");
    this.renderMenu(
      "设置",
      [{ label: "返回主菜单", action: () => this.setupMainMenu() }],
      "list",
    );
  }

  showHelpPage() {
    this.state = "HELP";
    this.showPage("HELP");
    this.renderHelp();
  }

  showLeaderboardPage() {
    this.state = "LEADERBOARD";
    this.showPage("LEADERBOARD");
    this.renderLeaderboard();
  }

  // --- Game Logic ---

  startCasualGame() {
    this.gameType = "CASUAL";
    this.startGame("Easy");
  }

  startGame(modeName) {
    this.showPage("PLAYING");

    this.mode = modeName;
    this.board = new Board(modeName);
    this.score = 0;
    this.comboCount = 0;
    this.lastMatchTime = 0;
    this.timeLeft = MODES[modeName].time;
    this.totalTime = this.timeLeft;
    if (this.gameType === "CASUAL") {
      this.timeLeft *= 2;
      this.totalTime = this.timeLeft;
    }

    this.lastTick = Date.now();
    this.state = "PLAYING";
    this.selected = null;
    this.effects = new EffectManager();
  }

  togglePause() {
    if (this.state === "PLAYING") {
      this.state = "PAUSED";
    } else if (this.state === "PAUSED") {
      this.state = "PLAYING";
      this.lastTick = Date.now();
    }
  }

  getCellPos(r, c) {
    const boardW = (this.board.cols + 2) * this.board.cellSize;
    const boardH = (this.board.rows + 2) * this.board.cellSize;
    const offsetX = (WINDOW_WIDTH - boardW) / 2;
    const offsetY = (WINDOW_HEIGHT - boardH) / 2 + 40;
    return [
      offsetX + c * this.board.cellSize + this.board.cellSize / 2,
      offsetY + r * this.board.cellSize + this.board.cellSize / 2,
    ];
  }

  handleInput(x, y) {
    if (this.state === "PLAYING") {
      const boardW = (this.board.cols + 2) * this.board.cellSize;
      const boardH = (this.board.rows + 2) * this.board.cellSize;
      const offsetX = (WINDOW_WIDTH - boardW) / 2;
      const offsetY = (WINDOW_HEIGHT - boardH) / 2 + 40;

      const c = Math.floor((x - offsetX) / this.board.cellSize);
      const r = Math.floor((y - offsetY) / this.board.cellSize);

      if (
        r < 1 ||
        r > this.board.rows ||
        c < 1 ||
        c > this.board.cols ||
        this.board.grid[r][c] === 0
      )
        return;

      if (this.selected === null) {
        this.selected = [r, c];
      } else if (this.selected[0] === r && this.selected[1] === c) {
        this.selected = null;
      } else {
        const path = Pathfinding.findPath(
          this.board.grid,
          this.selected,
          [r, c],
          this.board.rows,
          this.board.cols,
        );
        if (path) {
          // Combo logic
          const now = Date.now();
          if (now - this.lastMatchTime < 2000) {
            // 2 seconds for combo
            this.comboCount++;
          } else {
            this.comboCount = 1;
          }
          this.lastMatchTime = now;

          const comboBonus = (this.comboCount - 1) * 5;
          this.score += 10 + comboBonus;

          this.effects.triggerFlash(60);
          const pixelPath = path.map((p) => this.getCellPos(p[0], p[1]));
          this.effects.addEffect(new LightningArc(pixelPath));

          [this.selected, [r, c]].forEach((coord) => {
            const pos = this.getCellPos(coord[0], coord[1]);
            const color =
              BLOCK_COLORS[
                (this.board.grid[coord[0]][coord[1]] - 1) % BLOCK_COLORS.length
              ];
            this.effects.addEffect(new DestructionEffect(pos, color));
          });

          this.board.grid[this.selected[0]][this.selected[1]] = 0;
          this.board.grid[r][c] = 0;
          this.selected = null;

          if (this.board.isEmpty()) {
            this.state = "VICTORY";

            // Calculate Stars
            let stars = 1;
            const timeRatio = this.timeLeft / this.totalTime;
            if (timeRatio > 0.6) stars = 3;
            else if (timeRatio > 0.3) stars = 2;

            // Handle Victory
            if (this.gameType === "LEVEL") {
              const newlyUnlocked = StorageManager.unlockLevel(
                this.currentLevel + 1,
              );
              StorageManager.saveLevelStars(this.currentLevel, stars);
              if (newlyUnlocked) {
                this.effects.triggerFlash(100); // Visual feedback for unlock
              }
            }

            // Wait for name entry after a small delay
            setTimeout(() => {
              const name = prompt(
                `恭喜通关 (${stars}星)！请输入名字保存成绩：`,
                this.playerName,
              );
              if (name) {
                this.playerName = name;
                localStorage.setItem("linklink_player_name", name);
              }
              StorageManager.saveScore(
                this.playerName,
                this.score,
                this.gameType === "LEVEL"
                  ? `Level ${this.currentLevel}`
                  : this.mode,
                this.gameType,
              );
            }, 500);
          } else if (!this.board.hasSolution()) {
            this.board.shuffle();
          }
        } else {
          this.selected = [r, c];
        }
      }
    } else if (["VICTORY", "GAMEOVER", "PAUSED"].includes(this.state)) {
      this.setupMainMenu();
    }
  }

  bindEvents() {
    this.canvas.addEventListener("mousedown", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.handleInput(x, y);
    });

    document.addEventListener("mousemove", (e) => {
      const x = e.clientX;
      const y = e.clientY;
      this.parallax.targetX = x / window.innerWidth - 0.5;
      this.parallax.targetY = y / window.innerHeight - 0.5;
    });

    document.addEventListener("mouseleave", () => {
      this.parallax.targetX = 0;
      this.parallax.targetY = 0;
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "p" || e.key === "Escape") this.togglePause();
      if (e.key === "r") this.mode && this.startGame(this.mode);
      if (e.key === "m") this.setupMainMenu();
      if (e.key === "h" && this.state === "PLAYING") {
        const hint = this.board.findHint();
        if (hint) this.selected = hint[0];
      }
      if (e.key === "s" && this.state === "PLAYING") this.board.shuffle();
    });
  }

  update() {
    const now = Date.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.background.update();
    if (this.state === "PLAYING") {
      this.timeLeft -= (now - this.lastTick) / 1000;
      this.lastTick = now;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.state = "GAMEOVER";
      }
    }
    this.effects.update();
    this.updateParallax(dt);
  }

  updateParallax(dt) {
    const rate = 1 - Math.pow(0.001, Math.max(0, dt) / 320);
    this.parallax.currentX +=
      (this.parallax.targetX - this.parallax.currentX) * rate;
    this.parallax.currentY +=
      (this.parallax.targetY - this.parallax.currentY) * rate;

    const x = -this.parallax.currentX * this.parallax.maxShiftX;
    const y = -this.parallax.currentY * this.parallax.maxShiftY;

    const bgWall = document.getElementById("bg-wall");
    if (bgWall) {
      bgWall.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(1.06)`;
    }
  }

  draw() {
    if (
      [
        "MENU",
        "DIFFICULTY_SELECT",
        "LEVEL_SELECT",
        "LEADERBOARD",
        "SETTINGS",
        "HELP",
      ].includes(this.state)
    ) {
    } else {
      this.ctx.clearRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
      this.drawGameScreen();
    }
  }

  drawGameScreen() {
    // HUD
    UIHelper.drawPanel(this.ctx, 50, 20, WINDOW_WIDTH - 100, 80, 22);
    this.ctx.fillStyle = COLORS.TEXT;
    this.ctx.font =
      '650 22px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    this.ctx.textAlign = "left";

    let typeStr =
      this.gameType === "BASIC"
        ? "基本"
        : this.gameType === "CASUAL"
          ? "休闲"
          : `关卡 ${this.currentLevel}`;
    this.ctx.fillText(`得分: ${this.score}`, 100, 70);
    this.ctx.fillText(`时间: ${Math.ceil(this.timeLeft)}s`, 350, 70);
    this.ctx.fillText(`模式: ${typeStr} (${this.mode})`, 650, 70);

    // Combo Display
    if (this.comboCount > 1) {
      this.ctx.save();
      this.ctx.fillStyle = "#FF4500";
      this.ctx.font = "italic bold 32px Arial";
      this.ctx.fillText(`${this.comboCount} COMBO!`, WINDOW_WIDTH / 2, 140);
      this.ctx.restore();
    }

    // Board
    const boardW = (this.board.cols + 2) * this.board.cellSize;
    const boardH = (this.board.rows + 2) * this.board.cellSize;
    const offsetX = (WINDOW_WIDTH - boardW) / 2;
    const offsetY = (WINDOW_HEIGHT - boardH) / 2 + 40;

    UIHelper.drawPanel(
      this.ctx,
      offsetX + this.board.cellSize - 10,
      offsetY + this.board.cellSize - 10,
      boardW - 2 * this.board.cellSize + 20,
      boardH - 2 * this.board.cellSize + 20,
      26,
    );

    for (let r = 1; r <= this.board.rows; r++) {
      for (let c = 1; c <= this.board.cols; c++) {
        const val = this.board.grid[r][c];
        if (val !== 0) {
          const x = offsetX + c * this.board.cellSize + 4;
          const y = offsetY + r * this.board.cellSize + 4;
          const size = this.board.cellSize - 8;

          this.ctx.fillStyle = BLOCK_COLORS[(val - 1) % BLOCK_COLORS.length];
          UIHelper.drawRoundedRect(this.ctx, x, y, size, size, 10);

          if (
            this.selected &&
            this.selected[0] === r &&
            this.selected[1] === c
          ) {
            this.ctx.strokeStyle = COLORS.HIGHLIGHT;
            this.ctx.lineWidth = 4;
            UIHelper.drawRoundedRect(
              this.ctx,
              x,
              y,
              size,
              size,
              10,
              false,
              true,
            );
          }
        }
      }
    }

    this.effects.draw(this.ctx);

    if (["PAUSED", "GAMEOVER", "VICTORY"].includes(this.state)) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      this.ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);

      const popupW = 400,
        popupH = 300;
      UIHelper.drawPanel(
        this.ctx,
        (WINDOW_WIDTH - popupW) / 2,
        (WINDOW_HEIGHT - popupH) / 2,
        popupW,
        popupH,
        30,
      );

      this.ctx.textAlign = "center";
      const msgs = { PAUSED: "已暂停", VICTORY: "胜利!", GAMEOVER: "游戏结束" };
      this.ctx.fillStyle =
        this.state === "GAMEOVER" ? COLORS.DANGER : COLORS.ACCENT;
      this.ctx.font =
        '800 46px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      this.ctx.fillText(
        msgs[this.state],
        WINDOW_WIDTH / 2,
        WINDOW_HEIGHT / 2 - 20,
      );

      this.ctx.fillStyle = COLORS.TEXT;
      this.ctx.font =
        '18px system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      const subMsg = this.state === "PAUSED" ? "按 P 键继续" : "点击返回主菜单";
      this.ctx.fillText(subMsg, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 + 60);
    }

    // Controls Help
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(
      "P: 暂停 | H: 提示 | S: 洗牌 | R: 重置 | M: 菜单",
      WINDOW_WIDTH / 2,
      WINDOW_HEIGHT - 30,
    );
  }

  gameLoop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.gameLoop());
  }
}

new Game();
