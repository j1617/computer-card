/**
 * Computer Card - Home Assistant Lovelace Custom Card
 * Version: 1.2.1
 * Description: Display computer status (name, IP, MAC, power state, power consumption)
 * Compatible with HA 2024.x+ grid layout and visibility features
 * v1.2.1: Add toggle_entity support with confirmation dialog
 */

console.info(
  '%c COMPUTER-CARD %c v1.2.1 ',
  'color: #3b82f6; font-weight: bold; background: #eff6ff; padding: 2px 6px; border-radius: 3px 0 0 3px;',
  'color: white; background: #3b82f6; padding: 2px 6px; border-radius: 0 3px 3px 0;'
);

class ComputerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static getStubConfig() {
    return {
      title: '电脑状态',
      display_mode: 'vertical',
      columns: 2,
      entities: []
    };
  }

  setConfig(config) {
    if (!config.entities || config.entities.length === 0) {
      console.warn('[Computer Card] 未配置电脑实体');
    }

    this.config = {
      title: '电脑状态',
      display_mode: 'vertical',
      columns: 2,
      entities: config.entities || [],
      background_color: 'var(--ha-card-background, #ffffff)',
      text_color: 'var(--primary-text-color, #1e293b)',
      secondary_color: 'var(--secondary-text-color, #64748b)',
      ...config
    };

    this._entityCount = this._getEntityCount();
    this._updateCard();
  }

  set hass(hass) {
    this._hass = hass;
    // 只在数据变化时才重新渲染，避免鼠标悬停闪烁
    if (this._dataChanged()) {
      this._updateCard();
    }
  }

  _dataChanged() {
    if (!this._hass || !this.config) return true;
    const entities = this._getComputerEntities();
    const newHash = JSON.stringify(entities.map(e => ({
      on: e.is_on, ip: e.ip, mac: e.mac, power: e.power, daily: e.daily, monthly: e.monthly
    })));
    if (newHash === this._lastDataHash) return false;
    this._lastDataHash = newHash;
    return true;
  }

  connectedCallback() {
    this._injectGlobalStyles();
    this._updateCard();
  }

  _injectGlobalStyles() {
    if (document.getElementById('computer-card-global-styles')) return;
    const style = document.createElement('style');
    style.id = 'computer-card-global-styles';
    style.textContent = `
      .computer-card-confirm-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        animation: fadeIn 0.2s ease-out;
      }
      .computer-card-confirm-dialog {
        background: var(--ha-card-background, #fff);
        border-radius: 16px;
        padding: 24px;
        max-width: 320px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        animation: slideUp 0.3s ease-out;
      }
      .computer-card-confirm-message {
        font-size: 16px;
        text-align: center;
        margin-bottom: 24px;
        color: var(--primary-text-color, #1e293b);
      }
      .computer-card-confirm-buttons {
        display: flex;
        gap: 12px;
      }
      .computer-card-confirm-btn {
        flex: 1;
        padding: 12px 16px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .computer-card-confirm-btn:hover {
        opacity: 0.9;
      }
      .computer-card-confirm-cancel {
        background: var(--secondary-card-background, #f1f5f9);
        color: var(--primary-text-color, #1e293b);
      }
      .computer-card-confirm-ok {
        background: #3b82f6;
        color: white;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  _getEntityCount() {
    if (this.config.entities && this.config.entities.length > 0) {
      return this.config.entities.length;
    }
    return 0;
  }

  getCardSize() {
    const count = this._entityCount || 1;
    if (this.config.display_mode === 'horizontal') {
      const cols = this.config.columns || 2;
      const rows = Math.ceil(count / cols);
      return Math.max(rows * 2, 2);
    }
    return Math.min(count * 2 + 1, 6);
  }

  getGridOptions() {
    return {
      columns: this.config.display_mode === 'horizontal' ? 12 : 6,
      rows: this.getCardSize()
    };
  }

  getLayoutOptions() {
    return {
      type: 'grid',
      ...this.getGridOptions()
    };
  }

  _getState(entityId) {
    if (!entityId || !this._hass) return null;
    return this._hass.states[entityId] || null;
  }

  _isIpAddress(value) {
    return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value);
  }

  _isMacAddress(value) {
    return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(value);
  }

  _getDeviceIcon(deviceType) {
    const icons = {
      desktop: '🖥️',
      laptop: '💻',
      server: '🗄️',
      nas: '💽',
      tablet: '📱',
      mini_pc: '📦',
      all_in_one: '🖥️',
      default: '💻'
    };
    return icons[deviceType] || icons.default;
  }

  _formatNumber(value, decimals = 1) {
    if (value === null || value === undefined) return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    return decimals > 0 ? num.toFixed(decimals) : num.toString();
  }

  _formatEnergy(value) {
    if (value === null || value === undefined) return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    return num.toFixed(2);
  }

  _buildComputerItem(entityConfig) {
    const switchEntity = entityConfig.switch_entity || entityConfig.entity;
    const switchState = this._getState(switchEntity);

    if (!switchState) return null;

    const isOn = switchState.state === 'on' || switchState.state === 'home';
    const friendlyName = entityConfig.name ||
                         switchState.attributes.friendly_name ||
                         switchEntity.replace('switch.', '').replace('binary_sensor.', '').replace(/_/g, ' ');

    let ipAddress = null;
    if (entityConfig.ip_entity) {
      if (this._isIpAddress(entityConfig.ip_entity)) {
        ipAddress = entityConfig.ip_entity;
      } else {
        const ipState = this._getState(entityConfig.ip_entity);
        if (ipState) ipAddress = ipState.state;
      }
    }
    if (!ipAddress && switchState.attributes.ip_address) {
      ipAddress = switchState.attributes.ip_address;
    }

    let macAddress = null;
    if (entityConfig.mac_entity) {
      if (this._isMacAddress(entityConfig.mac_entity)) {
        macAddress = entityConfig.mac_entity;
      } else {
        const macState = this._getState(entityConfig.mac_entity);
        if (macState) macAddress = macState.state;
      }
    }
    if (!macAddress && switchState.attributes.mac_address) {
      macAddress = switchState.attributes.mac_address;
    }

    let power = null, daily = null, monthly = null;
    const powerState = this._getState(entityConfig.power_entity);
    if (powerState) power = powerState.state;

    const dailyState = this._getState(entityConfig.daily_energy_entity);
    if (dailyState) daily = dailyState.state;

    const monthlyState = this._getState(entityConfig.monthly_energy_entity);
    if (monthlyState) monthly = monthlyState.state;

    const hasPowerInfo = power !== null || daily !== null || monthly !== null;

    // 开关实体（可选，用于控制开关机）
    const toggleEntity = entityConfig.toggle_entity || null;
    const hasToggle = !!toggleEntity;

    return {
      switch_entity: switchEntity,
      name: friendlyName,
      is_on: isOn,
      device_type: entityConfig.device_type || 'default',
      ip: ipAddress,
      mac: macAddress,
      power, daily, monthly,
      has_power_info: hasPowerInfo,
      toggle_entity: toggleEntity,
      has_toggle: hasToggle
    };
  }

  _getComputerEntities() {
    if (!this._hass) return [];

    const entities = [];
    const seen = new Set();

    if (this.config.entities && Array.isArray(this.config.entities) && this.config.entities.length > 0) {
      for (const entityConfig of this.config.entities) {
        const item = this._buildComputerItem(entityConfig);
        if (item && !seen.has(item.switch_entity)) {
          entities.push(item);
          seen.add(item.switch_entity);
        }
      }
    }

    this._entityCount = entities.length;
    return entities;
  }

  _getTotalPower(entities) {
    let total = 0;
    for (const entity of entities) {
      if (entity.power !== null) {
        const val = parseFloat(entity.power);
        if (!isNaN(val)) total += val;
      }
    }
    return total > 0 ? total : null;
  }

  _createComputerItem(entity) {
    const { is_on, name, device_type, ip, mac, power, daily, monthly, has_power_info, toggle_entity, has_toggle } = entity;
    const icon = this._getDeviceIcon(device_type);
    const statusColor = is_on ? 'var(--success-color, #22c55e)' : 'var(--error-color, #ef4444)';
    const statusText = is_on ? '运行中' : '已关机';

    const ipDisplay = ip ? ip : '--';
    const macDisplay = mac ? mac.toUpperCase() : '--';

    // 用 data-copy 属性存储要复制的值不用 inline onclick
    const ipAttr = ip ? `data-copy="${ip}"` : '';
    const macAttr = mac ? `data-copy="${mac.toUpperCase()}"` : '';

    // 开关按钮（如果有 toggle_entity）
    let toggleHtml = '';
    if (has_toggle && toggle_entity) {
      const targetState = is_on ? 'off' : 'on';
      const btnLabel = is_on ? '关机' : '开机';
      const btnClass = is_on ? 'toggle-off' : 'toggle-on';
      toggleHtml = `
        <div class="toggle-section">
          <button class="toggle-btn ${btnClass}" data-entity="${toggle_entity}" data-action="${targetState}" data-name="${name}">
            ${btnLabel}
          </button>
        </div>
      `;
    }

    let powerSection = '';
    if (has_power_info) {
      const powerDisplay = power !== null ? `${this._formatNumber(power, 0)} W` : '--';
      const dailyDisplay = daily !== null ? `${this._formatEnergy(daily)} kWh` : '--';
      const monthlyDisplay = monthly !== null ? `${this._formatEnergy(monthly)} kWh` : '--';

      powerSection = `
        <div class="power-section">
          <div class="power-item">
            <span class="power-icon">⚡</span>
            <span class="power-value">${powerDisplay}</span>
            <span class="power-label">实时功率</span>
          </div>
          <div class="power-item">
            <span class="power-label">今日用电</span>
            <span class="power-value daily">${dailyDisplay}</span>
          </div>
          <div class="power-item">
            <span class="power-label">本月用电</span>
            <span class="power-value monthly">${monthlyDisplay}</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="computer-item ${is_on ? 'on' : 'off'}">
        <div class="computer-header">
          <div class="computer-icon">${icon}</div>
          <div class="computer-info">
            <div class="computer-name">${name}</div>
            <div class="computer-status" style="color: ${statusColor};">
              <span class="status-dot" style="background: ${statusColor};"></span>
              ${statusText}
            </div>
          </div>
        </div>
        <div class="computer-details">
          <div class="detail-row">
            <span class="detail-label">IP地址</span>
            <span class="detail-value copyable" ${ipAttr} title="点击复制">${ipDisplay}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">MAC地址</span>
            <span class="detail-value mac copyable" ${macAttr} title="点击复制">${macDisplay}</span>
          </div>
        </div>
        ${powerSection}
        ${toggleHtml}
      </div>
    `;
  }

  // 绑定复制事件（Shadow DOM 内不支持 inline onclick）
  _bindCopyEvents() {
    const copyables = this.shadowRoot.querySelectorAll('.copyable[data-copy]');
    copyables.forEach(el => {
      el.addEventListener('click', async () => {
        const text = el.getAttribute('data-copy');
        if (!text) return;
        const original = el.textContent;
        let copied = false;
        // ��案1: clipboard API
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch {
          // 方案2: textarea fallback
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            copied = document.execCommand('copy');
            document.body.removeChild(ta);
          } catch {
            // ignore
          }
        }
        if (copied) {
          el.textContent = '已复制!';
          el.classList.add('copied');
          setTimeout(() => {
            el.textContent = original;
            el.classList.remove('copied');
          }, 1200);
        }
      });
    });
  }

  // 绑定开关按钮事件
  _bindToggleEvents() {
    const toggleBtns = this.shadowRoot.querySelectorAll('.toggle-btn[data-entity]');
    toggleBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const entity = btn.getAttribute('data-entity');
        const action = btn.getAttribute('data-action');
        const name = btn.getAttribute('data-name');
        const targetState = action === 'on' ? '开启' : '关闭';
        const confirmed = await this._showConfirmDialog(`${targetState} "${name}"？`);
        if (confirmed) {
          this._updateState(entity, action);
        }
      });
    });
  }

  _updateState(entityId, newState) {
    this._hass.callService('homeassistant', 'turn_' + newState, {
      entity_id: entityId
    });
  }

  // 确认对话框
  _showConfirmDialog(message) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'computer-card-confirm-overlay';
      overlay.innerHTML = `
        <div class="computer-card-confirm-dialog">
          <div class="computer-card-confirm-message">${message}</div>
          <div class="computer-card-confirm-buttons">
            <button class="computer-card-confirm-btn computer-card-confirm-cancel">取消</button>
            <button class="computer-card-confirm-btn computer-card-confirm-ok">确认</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const cancelBtn = overlay.querySelector('.computer-card-confirm-cancel');
      const okBtn = overlay.querySelector('.computer-card-confirm-ok');
      const close = (result) => {
        overlay.remove();
        resolve(result);
      };

      cancelBtn.addEventListener('click', () => close(false));
      okBtn.addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
    });
  }

  _updateCard() {
    if (!this.config) return;

    const entities = this._getComputerEntities();
    const { background_color, text_color, secondary_color, title, display_mode, columns } = this.config;

    const totalCount = entities.length;
    const onCount = entities.filter(e => e.is_on).length;
    const offCount = totalCount - onCount;

    const totalPower = this._getTotalPower(entities);
    const totalPowerDisplay = totalPower !== null ? `${totalPower} W` : '';

    let bodyHtml = entities.length > 0
      ? entities.map(e => this._createComputerItem(e)).join('')
      : '<div class="empty-state">未配置电脑实体</div>';

    let statsHtml = '';
    if (totalCount > 0) {
      statsHtml = `
        <div class="stats-bar">
          ${totalPowerDisplay ? `
            <div class="stat-item stat-power">
              <span class="stat-icon">⚡</span>
              <span class="stat-label">总功率</span>
              <span class="stat-value stat-power-value">${totalPowerDisplay}</span>
            </div>
          ` : ''}
          <div class="stat-item stat-on"><span class="stat-dot"></span><span class="stat-label">运行中</span><span class="stat-value">${onCount}</span></div>
          <div class="stat-item stat-off"><span class="stat-dot"></span><span class="stat-label">已关机</span><span class="stat-value">${offCount}</span></div>
        </div>
      `;
    }

    const isHorizontal = display_mode === 'horizontal';
    const gridClass = isHorizontal ? 'horizontal' : 'vertical';

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          background: ${background_color};
          border-radius: var(--ha-card-border-radius, 16px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 12px rgba(0,0,0,0.08));
          padding: 16px;
          overflow: hidden;
        }
        .card-title {
          font-size: 18px;
          font-weight: 600;
          color: ${text_color};
          margin: 0 0 16px 0;
        }
        .stats-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: var(--secondary-card-background, var(--ha-card-background, #f8fafc));
          border-radius: 8px;
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: ${secondary_color};
        }
        .stat-icon {
          font-size: 14px;
        }
        .stat-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #94a3b8;
        }
        .stat-on .stat-dot { background: #22c55e; }
        .stat-off .stat-dot { background: #ef4444; }
        .stat-power-value {
          font-weight: 600;
          color: ${text_color};
        }
        .computers-grid.horizontal {
          display: grid;
          grid-template-columns: repeat(${columns || 2}, 1fr);
          gap: 12px;
        }
        .computers-grid.vertical {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .computer-item {
          padding: 16px;
          border-radius: 12px;
          background: var(--secondary-card-background, var(--ha-card-background, #f8fafc));
          border-left: 3px solid #94a3b8;
        }
        .computer-item.on {
          border-left-color: #22c55e;
        }
        .computer-item.off {
          border-left-color: #ef4444;
        }
        .computer-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .computer-icon {
          font-size: 28px;
        }
        .computer-info {
          flex: 1;
        }
        .computer-name {
          font-size: 15px;
          font-weight: 600;
          color: ${text_color};
        }
        .computer-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          margin-top: 2px;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .computer-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .detail-label {
          color: ${secondary_color};
        }
        .detail-value {
          color: ${text_color};
          font-family: ui-monospace, monospace;
          font-size: 12px;
        }
        .detail-value.copyable {
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .detail-value.copyable:hover {
          background: var(--secondary-card-background, #e2e8f0);
        }
        .detail-value.copyable.copied {
          color: #22c55e;
          font-weight: 500;
        }
        .power-section {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid var(--divider-color, #e2e8f0);
          margin-top: 4px;
        }
        .power-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          flex: 1;
          min-width: 70px;
        }
        .power-icon {
          font-size: 14px;
        }
        .power-value {
          font-size: 14px;
          font-weight: 600;
          color: ${text_color};
        }
        .power-value.daily {
          color: #f59e0b;
        }
        .power-value.monthly {
          color: #8b5cf6;
        }
        .power-label {
          font-size: 10px;
          color: ${secondary_color};
          text-align: center;
        }
        .toggle-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--divider-color, #e2e8f0);
        }
        .toggle-btn {
          width: 100%;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.1s;
        }
        .toggle-btn:hover {
          opacity: 0.9;
        }
        .toggle-btn:active {
          transform: scale(0.98);
        }
        .toggle-btn.toggle-on {
          background: #22c55e;
          color: white;
        }
        .toggle-btn.toggle-off {
          background: #ef4444;
          color: white;
        }
        .empty-state {
          text-align: center;
          padding: 32px;
          color: ${secondary_color};
          font-size: 14px;
        }
      </style>

      <ha-card>
        <div class="card-title">${title}</div>
        ${statsHtml}
        <div class="computers-grid ${gridClass}">
          ${bodyHtml}
        </div>
      </ha-card>
    `;

    this._bindCopyEvents();
    this._bindToggleEvents();
  }
}

if (!customElements.get('computer-card')) {
  customElements.define('computer-card', ComputerCard);
}

// Register under both names for backwards compatibility
if (!customElements.get('computer-status-card')) {
  customElements.define('computer-status-card', ComputerCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'computer-card',
  name: '电脑状态卡片',
  description: '显示电脑状态，支持 IP/MAC 复制，支持远程开关机',
});