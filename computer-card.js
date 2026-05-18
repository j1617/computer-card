/**
 * Computer Card - Home Assistant Lovelace Custom Card
 * Version: 1.1.3
 * Description: Display computer status (name, IP, MAC, power state, power consumption)
 * Compatible with HA 2024.x+ grid layout and visibility features
 */

console.info(
  '%c COMPUTER-CARD %c v1.1.3 ',
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
    this._updateCard();
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
      grid_columns: this.config.display_mode === 'horizontal' ? 12 : 6,
      grid_rows: this.getCardSize()
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

    return {
      switch_entity: switchEntity,
      name: friendlyName,
      is_on: isOn,
      device_type: entityConfig.device_type || 'default',
      ip: ipAddress,
      mac: macAddress,
      power, daily, monthly,
      has_power_info: hasPowerInfo
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
      if (entity.power !== null && !isNaN(parseFloat(entity.power))) {
        total += parseFloat(entity.power);
      }
    }
    return total > 0 ? total : null;
  }

  _createComputerItem(entity) {
    const { is_on, name, device_type, ip, mac, power, daily, monthly, has_power_info } = entity;
    const icon = this._getDeviceIcon(device_type);
    const statusColor = is_on ? 'var(--success-color, #22c55e)' : 'var(--error-color, #ef4444)';
    const statusText = is_on ? '运行中' : '已关机';

    const ipDisplay = ip ? ip : '--';
    const macDisplay = mac ? mac.toUpperCase() : '--';

    // 用 data-copy 属性存储要复制的值，不用 inline onclick
    const ipAttr = ip ? `data-copy="${ip}"` : '';
    const macAttr = mac ? `data-copy="${mac.toUpperCase()}"` : '';

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
      </div>
    `;
  }

  // 绑定复制事件（Shadow DOM 内不支持 inline onclick）
  _bindCopyEvents() {
    const copyables = this.shadowRoot.querySelectorAll('.copyable[data-copy]');
    copyables.forEach(el => {
      el.addEventListener('click', () => {
        const text = el.getAttribute('data-copy');
        if (!text) return;
        const original = el.textContent;
        navigator.clipboard.writeText(text).then(() => {
          el.textContent = '已复制!';
          el.classList.add('copied');
          setTimeout(() => {
            el.textContent = original;
            el.classList.remove('copied');
          }, 1200);
        }).catch(() => {
          // fallback: 旧浏览器
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          el.textContent = '已复制!';
          el.classList.add('copied');
          setTimeout(() => {
            el.textContent = original;
            el.classList.remove('copied');
          }, 1200);
        });
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

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }

        ha-card {
          background: ${background_color};
          border-radius: var(--ha-card-border-radius, 16px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 12px rgba(0,0,0,0.08));
          overflow: visible;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .card-content {
          padding: 0;
          font-family: var(--paper-font-common-base_-_font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
          color: ${text_color};
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .card-header {
          padding: 18px 20px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 700;
        }

        .title-icon { font-size: 22px; }

        .computer-count {
          background: var(--chip-background-color, #f1f5f9);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          color: ${secondary_color};
        }

        .stats-bar {
          display: flex;
          gap: 12px;
          padding: 12px 20px;
          margin: 14px 20px;
          background: var(--secondary-background-color, #f8fafc);
          border-radius: 12px;
          flex-wrap: wrap;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 60px;
          font-size: 12px;
        }

        .stat-icon { font-size: 14px; }

        .stat-dot { width: 8px; height: 8px; border-radius: 50%; }
        .stat-on .stat-dot { background: var(--success-color, #22c55e); }
        .stat-off .stat-dot { background: var(--error-color, #ef4444); }
        .stat-label { color: ${secondary_color}; }
        .stat-value { font-weight: 700; margin-left: 2px; }

        .stat-power {
          background: var(--primary-color, #3b82f6);
          color: white;
          padding: 6px 12px;
          border-radius: 8px;
          flex: 1.5;
        }
        .stat-power .stat-label { color: rgba(255,255,255,0.9); }
        .stat-power .stat-value { color: white; }
        .stat-power .stat-icon { font-size: 14px; }

        .computer-container {
          padding: 0 12px 12px;
          overflow: visible;
          flex: 1;
          ${display_mode === 'horizontal' ? `display: grid; grid-template-columns: repeat(${columns || 2}, 1fr); gap: 12px;` : ''}
        }

        @media (max-width: 600px) {
          .computer-container { grid-template-columns: 1fr !important; }
        }

        .computer-item {
          background: var(--secondary-background-color, #f8fafc);
          border-radius: 14px;
          padding: 16px;
          transition: all 0.2s ease;
          min-width: 0;
          border-left: 4px solid transparent;
        }

        .computer-item.on { border-left-color: var(--success-color, #22c55e); }
        .computer-item.off { border-left-color: var(--error-color, #ef4444); }

        .computer-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .computer-icon {
          font-size: 32px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--card-background-color, #fff);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .computer-info { flex: 1; min-width: 0; }

        .computer-name {
          font-size: 16px;
          font-weight: 600;
          color: ${text_color};
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .computer-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 500;
          margin-top: 4px;
        }

        .status-dot { width: 8px; height: 8px; border-radius: 50%; }

        .computer-details {
          background: var(--card-background-color, #fff);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }

        .detail-row:not(:last-child) { border-bottom: 1px solid var(--divider-color, #f1f5f9); }

        .detail-label {
          font-size: 12px;
          color: ${secondary_color};
        }

        .detail-value {
          font-size: 13px;
          font-weight: 600;
          font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
        }

        .detail-value.mac { font-size: 11px; }

        .detail-value.copyable {
          cursor: pointer;
          padding: 2px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .detail-value.copyable:hover {
          background: var(--secondary-background-color, #e2e8f0);
        }
        .detail-value.copyable.copied {
          background: var(--success-color, #22c55e);
          color: white;
        }

        .power-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .power-item {
          background: var(--card-background-color, #fff);
          border-radius: 10px;
          padding: 10px 12px;
          text-align: center;
        }

        .power-item:first-child { grid-column: 1 / -1; }

        .power-icon { font-size: 16px; display: block; margin-bottom: 4px; }
        .power-value { font-size: 18px; font-weight: 700; display: block; }
        .power-value.daily { color: #3b82f6; }
        .power-value.monthly { color: #8b5cf6; }
        .power-label { font-size: 10px; color: ${secondary_color}; display: block; margin-top: 2px; }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: ${secondary_color};
          font-size: 14px;
        }

        .card-footer {
          padding: 12px 20px 18px;
          border-top: 1px solid var(--divider-color, #f1f5f9);
          margin-top: auto;
        }

        .update-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: ${secondary_color};
        }

        .update-dot {
          width: 6px;
          height: 6px;
          background: var(--primary-color, #3b82f6);
          border-radius: 50%;
        }
      </style>

      <ha-card>
        <div class="card-content">
          <div class="card-header">
            <div class="card-title"><span class="title-icon">💻</span><span>${title}</span></div>
            <span class="computer-count">${totalCount} 台设备</span>
          </div>
          ${statsHtml}
          <div class="computer-container">${bodyHtml}</div>
          <div class="card-footer">
            <div class="update-info"><span class="update-dot"></span><span>实时更新</span></div>
          </div>
        </div>
      </ha-card>
    `;

    // 渲染后绑定复制事件
    this._bindCopyEvents();
  }
}

if (!customElements.get('computer-card')) {
  customElements.define('computer-card', ComputerCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'computer-card',
  name: '电脑状态卡片',
  description: '显示电脑的运行状态、IP地址、MAC地址及用电信息',
  documentationURL: 'https://github.com/j1617/computer-card',
});