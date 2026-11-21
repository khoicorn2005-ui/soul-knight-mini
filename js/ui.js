// Quản lý toàn bộ giao diện HUD trong trận đấu trên Canvas (960x576) theo phong cách retro pixel Soul Knight.

const PANEL_BG = 'rgba(16, 18, 28, 0.85)';
const PANEL_BORDER = '#3a415a';

/**
 * Tính độ mờ cho một khung HUD để tự động làm mờ khi nhân vật di chuyển lại gần.
 * @param {{ x: number, y: number } | null} player
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @param {number} [padding=32]
 * @returns {number}
 */
export function getPanelAlpha(player, rect, padding = 32) {
  if (!player) {
    return 0.92;
  }

  const near =
    player.x >= rect.x - padding &&
    player.x <= rect.x + rect.w + padding &&
    player.y >= rect.y - padding &&
    player.y <= rect.y + rect.h + padding;

  return near ? 0.25 : 0.92;
}

/**
 * Vẽ chữ kèm bóng tối 1px để dễ đọc trên các thanh màu sáng.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} [color='#f5f7fa']
 */
function drawShadowText(ctx, text, x, y, color = '#f5f7fa') {
  ctx.fillStyle = '#0b0d15';
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/**
 * Quản lý vẽ 5 cụm HUD chính và các thông báo nổi trên Canvas.
 */
export class GameHUD {
  /**
   * Tính độ mờ độc lập cho một khung HUD theo vị trí nhân vật.
   * @param {{ x: number, y: number } | null} player
   * @param {{ x: number, y: number, w: number, h: number }} rect
   * @param {number} [padding=32]
   * @returns {number}
   */
  getPanelAlpha(player, rect, padding = 32) {
    return getPanelAlpha(player, rect, padding);
  }

  /**
   * Vẽ toàn bộ HUD và các thông báo nổi trong trạng thái chơi hiện tại.
   * @param {CanvasRenderingContext2D} ctx
   * @param {{
   *   player: object,
   *   aimSystem?: object | null,
   *   currentRoomIndex?: number,
   *   roomLabel?: string,
   *   waveText?: string,
   *   roomCleared?: boolean,
   *   boss?: object | null,
   *   roomBannerText?: string,
   *   roomBannerTimer?: number,
   *   toastMessage?: string,
   *   toastTimer?: number,
   * }} state
   */
  draw(ctx, state) {
    if (!state || !state.player) {
      return;
    }

    const {
      player,
      aimSystem = null,
      currentRoomIndex = 0,
      roomLabel = '1-1',
      waveText = '',
      roomCleared = false,
      boss = null,
      roomBannerText = '',
      roomBannerTimer = 0,
      toastMessage = '',
      toastTimer = 0,
    } = state;

    this.#drawSurvivalPanel(ctx, player);
    this.#drawFloorPanel(
      ctx,
      player,
      currentRoomIndex,
      roomLabel,
      waveText,
      roomCleared,
      boss,
    );

    if (boss && boss.active) {
      this.#drawBossBar(ctx, player, boss);
    }

    this.#drawDashAndAimPanel(ctx, player, aimSystem);
    this.#drawWeaponsPanel(ctx, player);

    if (roomBannerTimer > 0 && roomBannerText) {
      this.#drawRoomBanner(ctx, roomBannerText, roomBannerTimer);
    }
    if (toastTimer > 0 && toastMessage) {
      this.#drawToast(ctx, toastMessage, toastTimer);
    }
  }

  #drawPanelFrame(ctx, rect, borderColor = PANEL_BORDER, lineWidth = 1) {
    ctx.fillStyle = PANEL_BG;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lineWidth;
    const inset = lineWidth > 1 ? 1 : 0.5;
    ctx.strokeRect(
      rect.x + inset,
      rect.y + inset,
      rect.w - inset * 2,
      rect.h - inset * 2,
    );
  }

  #drawSurvivalPanel(ctx, player) {
    const rect = { x: 12, y: 10, w: 200, h: 68 };

    ctx.save();
    ctx.globalAlpha = this.getPanelAlpha(player, rect);
    this.#drawPanelFrame(ctx, rect);

    const iconX = rect.x + 12;
    const barX = rect.x + 26;
    const barW = 166;
    const barH = 14;

    // 1. Thanh Máu (HP)
    const hpY = rect.y + 6;
    this.#drawHeartIcon(ctx, iconX, hpY + 2);
    this.#drawMeterBar(
      ctx,
      barX,
      hpY,
      barW,
      barH,
      player.hp / Math.max(1, player.maxHp),
      '#ef5350',
      '#ff8a80',
      `HP  ${player.hp}/${player.maxHp}`,
    );

    // 2. Thanh Giáp (Shield) + đường tiến trình mảnh 2px báo nhịp tự hồi sau 4 giây
    const shY = rect.y + 25;
    this.#drawShieldIcon(ctx, iconX, shY + 2);
    const shieldRegenActive = player.shieldRegenFlash > 0;
    this.#drawMeterBar(
      ctx,
      barX,
      shY,
      barW,
      barH,
      player.shield / Math.max(1, player.maxShield),
      shieldRegenActive ? '#81d4fa' : '#cfd8dc',
      shieldRegenActive ? '#e1f5fe' : '#eceff1',
      `SH  ${player.shield}/${player.maxShield}`,
    );

    if (player.shield < player.maxShield) {
      const regenLineY = shY + barH + 1;
      const delayRatio =
        player.shieldRegenDelay > 0
          ? Math.max(0, Math.min(1, 1 - player.shieldRegenDelay / 4.0))
          : Math.max(0, Math.min(1, player.shieldRegenTick ?? 0));
      ctx.fillStyle = '#182032';
      ctx.fillRect(barX, regenLineY, barW, 2);
      ctx.fillStyle = player.shieldRegenDelay > 0 ? '#81d4fa' : '#4fc3f7';
      ctx.fillRect(barX, regenLineY, Math.round(barW * delayRatio), 2);
    }

    // 3. Thanh Năng lượng (Energy)
    const enY = rect.y + 46;
    this.#drawEnergyIcon(ctx, iconX, enY + 2);
    this.#drawMeterBar(
      ctx,
      barX,
      enY,
      barW,
      barH,
      player.energy / Math.max(1, player.maxEnergy),
      '#29b6f6',
      '#81d4fa',
      `EN  ${player.energy}/${player.maxEnergy}`,
    );

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  #drawFloorPanel(
    ctx,
    player,
    currentRoomIndex,
    roomLabel,
    waveText,
    roomCleared,
    boss,
  ) {
    const rect = { x: 744, y: 10, w: 204, h: 60 };
    const isBossRoom = currentRoomIndex === 3;
    const bossAlive = Boolean(isBossRoom && boss && boss.active);

    ctx.save();
    ctx.globalAlpha = this.getPanelAlpha(player, rect);
    this.#drawPanelFrame(ctx, rect);

    const centerX = rect.x + rect.w / 2;

    // Dòng trên: tên tầng hiện tại
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleColor = isBossRoom
      ? bossAlive
        ? '#ff5252'
        : '#ffd54f'
      : '#fff8e1';
    drawShadowText(ctx, `TẦNG ${roomLabel}`, centerX, rect.y + 11, titleColor);

    // Dòng giữa: 4 ô vuông nhỏ đại diện 4 phòng nối nhau bằng vạch ngang
    const nodeSize = 12;
    const nodeGap = 14;
    const totalNodesW = nodeSize * 4 + nodeGap * 3;
    const startX = Math.round(centerX - totalNodesW / 2);
    const nodeY = rect.y + 23;

    for (let i = 0; i < 4; i++) {
      const nx = startX + i * (nodeSize + nodeGap);

      if (i < 3) {
        ctx.fillStyle = i < currentRoomIndex ? '#66bb6a' : '#434b66';
        ctx.fillRect(nx + nodeSize, nodeY + 5, nodeGap, 2);
      }

      if (i < currentRoomIndex) {
        ctx.fillStyle = '#66bb6a';
        ctx.fillRect(nx, nodeY, nodeSize, nodeSize);
        ctx.strokeStyle = '#a5d6a7';
        ctx.lineWidth = 1;
        ctx.strokeRect(nx + 0.5, nodeY + 0.5, nodeSize - 1, nodeSize - 1);
      } else if (i === currentRoomIndex) {
        ctx.fillStyle = roomCleared ? '#2e4d36' : '#332b16';
        ctx.fillRect(nx, nodeY, nodeSize, nodeSize);
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 2;
        ctx.strokeRect(nx + 1, nodeY + 1, nodeSize - 2, nodeSize - 2);
      } else {
        ctx.fillStyle = '#232738';
        ctx.fillRect(nx, nodeY, nodeSize, nodeSize);
        ctx.strokeStyle = '#464e69';
        ctx.lineWidth = 1;
        ctx.strokeRect(nx + 0.5, nodeY + 0.5, nodeSize - 1, nodeSize - 1);
      }

      // Ô thứ 4 có chấm đỏ nhỏ báo phòng Boss
      if (i === 3) {
        ctx.fillStyle = '#ff1744';
        ctx.fillRect(nx + 4, nodeY + 4, 4, 4);
      }
    }

    // Dòng dưới: trạng thái chiến đấu gọn rõ
    ctx.font = 'bold 11px monospace';
    let statusColor = '#ffcdd2';
    if (waveText === 'ĐÃ DỌN SẠCH') {
      statusColor = '#64ffda';
    } else if (waveText === 'ĐÃ HẠ BOSS') {
      statusColor = '#ffd54f';
    } else if (waveText === 'ĐANG ĐẤU BOSS') {
      statusColor = '#ff8a80';
    }
    drawShadowText(ctx, waveText, centerX, rect.y + 49, statusColor);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  #drawBossBar(ctx, player, boss) {
    const rect = { x: 310, y: 12, w: 340, h: 42 };
    const centerX = rect.x + rect.w / 2;

    ctx.save();
    ctx.globalAlpha = this.getPanelAlpha(player, rect);
    this.#drawPanelFrame(ctx, rect, '#ffd54f', 1);

    const title = boss.isEnraged
      ? `${boss.name} [CUỒNG NỘ]`
      : boss.name;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawShadowText(
      ctx,
      title,
      centerX,
      rect.y + 11,
      boss.isEnraged ? '#ff7043' : '#ffd54f',
    );

    const barX = rect.x + 10;
    const barY = rect.y + 21;
    const barW = rect.w - 20;
    const barH = 15;
    const ratio = Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp)));
    const fillW = Math.round((barW - 2) * ratio);

    ctx.fillStyle = '#120d16';
    ctx.fillRect(barX, barY, barW, barH);

    if (fillW > 0) {
      ctx.fillStyle = boss.isEnraged ? '#ff1744' : '#d32f2f';
      ctx.fillRect(barX + 1, barY + 1, fillW, barH - 2);
      ctx.fillStyle = boss.isEnraged ? '#ff8a80' : '#ef5350';
      ctx.fillRect(barX + 1, barY + 1, fillW, 3);
    }

    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

    ctx.font = 'bold 10px monospace';
    drawShadowText(
      ctx,
      `${boss.hp} / ${boss.maxHp}`,
      centerX,
      barY + barH / 2 + 0.5,
      '#ffffff',
    );

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  #drawDashAndAimPanel(ctx, player, aimSystem) {
    const rect = { x: 12, y: 514, w: 206, h: 50 };
    const innerX = rect.x + 8;
    const innerW = rect.w - 16;

    ctx.save();
    ctx.globalAlpha = this.getPanelAlpha(player, rect);
    this.#drawPanelFrame(ctx, rect);

    // Nửa trên: thanh hồi chiêu kỹ năng Lướt (Space)
    const dashReady = player.dashCooldown <= 0;
    const dashRatio = dashReady
      ? 1
      : 1 - player.dashCooldown / Math.max(0.001, player.dashMaxCooldown);
    const dashLabel = dashReady
      ? 'DASH [Space]: Sẵn sàng'
      : `DASH [Space]: ${player.dashCooldown.toFixed(1)}s`;

    this.#drawMeterBar(
      ctx,
      innerX,
      rect.y + 7,
      innerW,
      16,
      dashRatio,
      dashReady ? '#26a69a' : '#546e7a',
      dashReady ? '#4db6ac' : '#78909c',
      dashLabel,
    );

    // Nửa dưới: chế độ ngắm hiện tại
    const aimY = rect.y + 27;
    const aimH = 16;
    const isAutoAim = Boolean(aimSystem?.autoAim);
    const accentColor = isAutoAim ? '#ff7043' : '#29b6f6';
    const aimLabel = isAutoAim ? 'AIM: AUTO-LOCK [T]' : 'AIM: CHUỘT [T]';

    ctx.fillStyle = '#121624';
    ctx.fillRect(innerX, aimY, innerW, aimH);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(innerX + 0.5, aimY + 0.5, innerW - 1, aimH - 1);

    // Chấm màu báo trạng thái bên trái nhãn ngắm
    ctx.fillStyle = accentColor;
    ctx.fillRect(innerX + 6, aimY + 5, 6, 6);

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawShadowText(
      ctx,
      aimLabel,
      innerX + innerW / 2 + 4,
      aimY + aimH / 2 + 0.5,
      isAutoAim ? '#ffccbc' : '#e1f5fe',
    );

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  #drawWeaponsPanel(ctx, player) {
    const rect = { x: 684, y: 510, w: 264, h: 54 };

    ctx.save();
    ctx.globalAlpha = this.getPanelAlpha(player, rect);
    this.#drawPanelFrame(ctx, rect);

    const weapons = player.weaponSystem?.weapons ?? [];
    const currentIndex = player.weaponSystem?.currentIndex ?? 0;
    const slotW = 123;
    const slotH = 42;
    const slotGap = 6;
    const startX = rect.x + 6;
    const slotY = rect.y + 6;

    for (let i = 0; i < 2; i++) {
      const weapon = weapons[i];
      const slotX = startX + i * (slotW + slotGap);
      const isActive = i === currentIndex;

      ctx.fillStyle = isActive ? '#2a2416' : '#151826';
      ctx.fillRect(slotX, slotY, slotW, slotH);

      ctx.strokeStyle = isActive ? '#ffd54f' : '#3a415a';
      ctx.lineWidth = isActive ? 2 : 1;
      const inset = isActive ? 1 : 0.5;
      ctx.strokeRect(
        slotX + inset,
        slotY + inset,
        slotW - inset * 2,
        slotH - inset * 2,
      );

      // Số thứ tự ô [1] / [2]
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isActive ? '#ffd54f' : '#78909c';
      ctx.fillText(`[${i + 1}]`, slotX + 4, slotY + 4);

      if (!weapon) {
        continue;
      }

      // Khối màu nhỏ đại diện màu thân và đầu đạn của vũ khí
      const swatchX = slotX + 27;
      const swatchY = slotY + 6;
      ctx.fillStyle = '#0d0f18';
      ctx.fillRect(swatchX - 1, swatchY - 1, 22, 8);
      ctx.fillStyle = weapon.bodyColor ?? '#b0bec5';
      ctx.fillRect(swatchX, swatchY, 16, 6);
      ctx.fillStyle = weapon.bulletColor ?? '#ffeb3b';
      ctx.fillRect(swatchX + 16, swatchY + 1, 4, 4);

      // Chi phí năng lượng (0 EN màu xanh lá, >0 EN màu xanh dương)
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      const costColor = weapon.energyCost === 0 ? '#66bb6a' : '#29b6f6';
      drawShadowText(
        ctx,
        `${weapon.energyCost} EN`,
        slotX + slotW - 5,
        slotY + 4,
        costColor,
      );

      // Tên vũ khí
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      drawShadowText(
        ctx,
        weapon.name,
        slotX + slotW / 2,
        slotY + 30,
        isActive ? '#fff8e1' : '#b0bec5',
      );
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  #drawMeterBar(ctx, x, y, w, h, ratio, fillColor, highlightColor, label) {
    const clamped = Math.max(0, Math.min(1, ratio));
    const fillW = Math.round((w - 2) * clamped);

    ctx.fillStyle = '#101420';
    ctx.fillRect(x, y, w, h);

    if (fillW > 0) {
      ctx.fillStyle = fillColor;
      ctx.fillRect(x + 1, y + 1, fillW, h - 2);
      ctx.fillStyle = highlightColor;
      ctx.fillRect(x + 1, y + 1, fillW, 3);
    }

    ctx.strokeStyle = '#3a415a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawShadowText(ctx, label, x + w / 2, y + h / 2 + 0.5, '#ffffff');
  }

  #drawHeartIcon(ctx, x, y) {
    ctx.fillStyle = '#141824';
    ctx.fillRect(x - 1, y - 1, 11, 10);
    ctx.fillStyle = '#ef5350';
    ctx.fillRect(x + 1, y, 3, 3);
    ctx.fillRect(x + 5, y, 3, 3);
    ctx.fillRect(x, y + 2, 9, 3);
    ctx.fillRect(x + 1, y + 5, 7, 2);
    ctx.fillRect(x + 3, y + 7, 3, 1);
    ctx.fillStyle = '#ffcdd2';
    ctx.fillRect(x + 1, y + 1, 2, 1);
  }

  #drawShieldIcon(ctx, x, y) {
    ctx.fillStyle = '#141824';
    ctx.fillRect(x, y - 1, 9, 11);
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(x + 1, y, 7, 6);
    ctx.fillRect(x + 2, y + 6, 5, 2);
    ctx.fillRect(x + 3, y + 8, 3, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 2, y + 1, 2, 4);
  }

  #drawEnergyIcon(ctx, x, y) {
    ctx.fillStyle = '#141824';
    ctx.fillRect(x, y - 1, 9, 11);
    ctx.fillStyle = '#29b6f6';
    ctx.fillRect(x + 4, y, 4, 3);
    ctx.fillRect(x + 1, y + 3, 7, 2);
    ctx.fillRect(x + 3, y + 5, 4, 2);
    ctx.fillRect(x + 2, y + 7, 2, 2);
    ctx.fillStyle = '#e1f5fe';
    ctx.fillRect(x + 4, y + 1, 2, 2);
  }

  #drawRoomBanner(ctx, text, timer) {
    const canvasW = ctx.canvas?.width ?? 960;
    const canvasH = ctx.canvas?.height ?? 576;
    const alpha = Math.min(1, timer / 0.45);
    const centerX = canvasW / 2;
    const centerY = Math.round(canvasH * 0.3);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText
      ? ctx.measureText(text).width
      : text.length * 16;
    const boxW = Math.ceil(textWidth) + 44;
    const boxH = 44;

    ctx.fillStyle = 'rgba(10, 12, 20, 0.84)';
    ctx.fillRect(centerX - boxW / 2, centerY - boxH / 2, boxW, boxH);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      centerX - boxW / 2 + 1,
      centerY - boxH / 2 + 1,
      boxW - 2,
      boxH - 2,
    );

    ctx.fillStyle = '#fff8e1';
    ctx.fillText(text, centerX, centerY + 1);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  #drawToast(ctx, message, timer) {
    const canvasW = ctx.canvas?.width ?? 960;
    const alpha = Math.min(1, timer / 0.35);
    const centerX = canvasW / 2;
    const y = 70;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText
      ? ctx.measureText(message).width
      : message.length * 8;
    const boxW = Math.ceil(textWidth) + 24;
    const boxH = 26;

    ctx.fillStyle = 'rgba(12, 16, 28, 0.88)';
    ctx.fillRect(centerX - boxW / 2, y - boxH / 2, boxW, boxH);
    ctx.strokeStyle = '#4fc3f7';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      centerX - boxW / 2 + 0.5,
      y - boxH / 2 + 0.5,
      boxW - 1,
      boxH - 1,
    );

    ctx.fillStyle = '#e0f7fa';
    ctx.fillText(message, centerX, y + 0.5);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

/**
 * Đổi số giây thành chuỗi thời gian dạng "MM:SS".
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Quản lý 4 lớp phủ màn hình HTML (Start Menu, Pause, Victory, Game Over) và bảng thống kê.
 */
export class ScreenManager {
  /**
   * @param {{
   *   onStart?: () => void,
   *   onResume?: () => void,
   *   onRestart?: () => void,
   *   onMainMenu?: () => void,
   * }} [callbacks={}]
   */
  constructor(callbacks = {}) {
    this.callbacks = callbacks;

    const getEl = (id) =>
      typeof document !== 'undefined' ? document.getElementById(id) : null;

    this.screens = {
      MENU: getEl('screen-menu'),
      PAUSED: getEl('screen-pause'),
      VICTORY: getEl('screen-victory'),
      GAME_OVER: getEl('screen-gameover'),
    };

    this.statEls = {
      victoryTime: getEl('victory-time'),
      victoryKills: getEl('victory-kills'),
      victoryWeapon: getEl('victory-weapon'),
      gameoverRoom: getEl('gameover-room'),
      gameoverKills: getEl('gameover-kills'),
      gameoverTime: getEl('gameover-time'),
    };

    this.#bindButton(getEl('btn-start'), () => this.callbacks.onStart?.());
    this.#bindButton(getEl('btn-resume'), () => this.callbacks.onResume?.());
    this.#bindButton(getEl('btn-pause-restart'), () =>
      this.callbacks.onRestart?.(),
    );
    this.#bindButton(getEl('btn-pause-menu'), () =>
      this.callbacks.onMainMenu?.(),
    );
    this.#bindButton(getEl('btn-victory-restart'), () =>
      this.callbacks.onRestart?.(),
    );
    this.#bindButton(getEl('btn-victory-menu'), () =>
      this.callbacks.onMainMenu?.(),
    );
    this.#bindButton(getEl('btn-gameover-restart'), () =>
      this.callbacks.onRestart?.(),
    );
    this.#bindButton(getEl('btn-gameover-menu'), () =>
      this.callbacks.onMainMenu?.(),
    );
  }

  /**
   * Định dạng số giây sang "MM:SS".
   * @param {number} seconds
   * @returns {string}
   */
  formatTime(seconds) {
    return formatTime(seconds);
  }

  /**
   * Ẩn toàn bộ lớp phủ rồi hiển thị đúng màn hình theo trạng thái game và cập nhật thống kê.
   * @param {'MENU' | 'PLAYING' | 'PAUSED' | 'VICTORY' | 'GAME_OVER'} state
   * @param {{ time?: number, kills?: number, roomLabel?: string, weaponName?: string }} [stats={}]
   */
  showScreen(state, stats = {}) {
    for (const screenEl of Object.values(this.screens)) {
      screenEl?.classList.add('hidden');
    }

    if (state === 'PLAYING') {
      if (
        typeof document !== 'undefined' &&
        typeof document.activeElement?.blur === 'function'
      ) {
        document.activeElement.blur();
      }
      return;
    }

    if (state === 'VICTORY') {
      if (this.statEls.victoryTime) {
        this.statEls.victoryTime.textContent = formatTime(stats.time ?? 0);
      }
      if (this.statEls.victoryKills) {
        this.statEls.victoryKills.textContent = String(stats.kills ?? 0);
      }
      if (this.statEls.victoryWeapon) {
        this.statEls.victoryWeapon.textContent =
          stats.weaponName ?? 'Súng Lục';
      }
    } else if (state === 'GAME_OVER') {
      if (this.statEls.gameoverRoom) {
        this.statEls.gameoverRoom.textContent = stats.roomLabel ?? '1-1';
      }
      if (this.statEls.gameoverKills) {
        this.statEls.gameoverKills.textContent = String(stats.kills ?? 0);
      }
      if (this.statEls.gameoverTime) {
        this.statEls.gameoverTime.textContent = formatTime(stats.time ?? 0);
      }
    }

    this.screens[state]?.classList.remove('hidden');
  }

  #bindButton(button, handler) {
    if (!button || typeof button.addEventListener !== 'function') {
      return;
    }
    button.addEventListener('click', () => {
      if (typeof button.blur === 'function') {
        button.blur();
      }
      handler();
    });
  }
}
