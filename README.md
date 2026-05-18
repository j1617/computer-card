# Home Assistant 电脑状态卡片

HA插件交流QQ群： 754364399

关注公众号【工具箱达人】，里面有详细的使用教程

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://hacs.xyz/)
[![version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/j1617/computer-card)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

一个优雅的 Home Assistant Lovelace 自定义卡片，显示电脑的运行状态、IP地址、MAC地址及用电信息。

**当前版本: v1.0.0**

## 预览效果

### 纵向列表模式（默认）

```
┌─────────────────────────────────────────────┐
│  💻 电脑状态                     3 台设备   │
│                                             │
│  🟢 运行中 2   🔴 已关机 1                  │
│                                             │
│  ┌─────────────────────────────────────┐     │
│  │ 🖥️ 主力台式机                        │     │
│  │    运行中                            │     │
│  │ ┌───────────────────────────────┐   │     │
│  │ │ IP地址    192.168.1.100       │   │     │
│  │ │ MAC地址   AA:BB:CC:DD:EE:FF   │   │     │
│  │ └───────────────────────────────┘   │     │
│  │ ┌─────────────────────────────────┐ │     │
│  │ │ ⚡ 85W   今日 2.35 | 本月 35.20│ │     │
│  │ └─────────────────────────────────┘ │     │
│  └─────────────────────────────────────┘     │
│                                             │
│  🟢 实时更新                              │
└─────────────────────────────────────────────┘
```

### 横向多列模式

```
┌─────────────────────────────────────────────┐
│  💻 电脑状态                     4 台设备   │
│                                             │
│  🟢 运行中 3   🔴 已关机 1                  │
│                                             │
│  ┌─────────────┬─────────────┐              │
│  │ 🖥️ 台式机   │ 💻 笔记本    │              │
│  │ 运行中      │ 运行中       │              │
│  │ 192.168.1.1 │ 192.168.1.2  │              │
│  │ AA:BB:CC:.. │ DD:EE:FF:..  │              │
│  │ ⚡ 85W      │ ⚡ 45W       │              │
│  └─────────────┴─────────────┘              │
│                                             │
│  🟢 实时更新                              │
└─────────────────────────────────────────────┘
```

## 功能特性

- ✅ **运行状态** - 实时显示电脑开启/关闭状态
- 🖥️ **设备图标** - 支持台式机、笔记本、服务器、NAS、平板等图标
- 🌐 **IP地址** - 显示电脑当前IP地址
- 📋 **MAC地址** - 显示电脑MAC地址
- ⚡ **用电信息** - 可选显示实时功率、日用电量、月用电量
- 📱 **多模式显示** - 纵向列表 / 横向Grid布局
- 🎨 **主题适配** - 自动适配HA深色/浅色主题
- 🔧 **HA 2024.x+ 兼容** - 支持Grid布局和可见性功能

## 安装方法

### 方法一：HACS 安装（推荐）

1. 打开 HACS → 前端
2. 点击右下角 "+" 按钮
3. 选择 "自定义仓库"
4. 输入仓库地址: `https://github.com/j1617/computer-card`
5. 选择类别为 "Lovelace"
6. 点击安装

### 方法二：手动安装

1. 将 `computer-card.js` 下载到 Home Assistant 配置目录：
   ```
   /config/www/computer-card.js
   ```

2. 在 Home Assistant 中，进入 **设置 → 仪表板 → 资源**
   或编辑 `configuration.yaml`：
   ```yaml
   lovelace:
     resources:
       - url: /local/computer-card.js
         type: module
   ```

3. 重启 Home Assistant

## 使用方法

### 添加卡片

1. 进入仪表板编辑模式
2. 点击 "添加卡片"
3. 选择 "电脑状态卡片"
4. 配置实体后保存

### YAML 配置示例

#### 单台电脑配置

```yaml
type: custom:computer-card
title: 电脑状态
entities:
  - name: 主力台式机
    switch_entity: switch.desktop_power
    device_type: desktop
    ip_entity: sensor.desktop_ip
    mac_entity: sensor.desktop_mac
    power_entity: sensor.desktop_power_watt
    daily_energy_entity: sensor.desktop_daily_energy
    monthly_energy_entity: sensor.desktop_monthly_energy
```

#### 多台电脑配置（纵向）

```yaml
type: custom:computer-card
title: 家里电脑
display_mode: vertical
entities:
  - name: 主力台式机
    switch_entity: switch.desktop_main
    device_type: desktop
    ip_entity: sensor.desktop_main_ip
    mac_entity: sensor.desktop_main_mac
    power_entity: sensor.desktop_main_power
    daily_energy_entity: sensor.desktop_main_daily
    monthly_energy_entity: sensor.desktop_main_monthly
  - name: 工作笔记本
    switch_entity: switch.laptop_work
    device_type: laptop
    ip_entity: sensor.laptop_work_ip
    mac_entity: sensor.laptop_work_mac
  - name: 家用服务器
    switch_entity: switch.home_server
    device_type: server
    ip_entity: sensor.server_ip
    mac_entity: sensor.server_mac
    power_entity: sensor.server_power
```

#### 多台电脑配置（横向）

```yaml
type: custom:computer-card
title: 家里电脑
display_mode: horizontal
columns: 2
entities:
  - name: 主力台式机
    switch_entity: switch.desktop_main
    device_type: desktop
    ip_entity: sensor.desktop_main_ip
    mac_entity: sensor.desktop_main_mac
  - name: 工作笔记本
    switch_entity: switch.laptop_work
    device_type: laptop
    ip_entity: sensor.laptop_work_ip
  - name: NAS存储
    switch_entity: switch.nas
    device_type: nas
    ip_entity: sensor.nas_ip
    mac_entity: sensor.nas_mac
    power_entity: sensor.nas_power
  - name: 平板电脑
    switch_entity: switch.tablet
    device_type: tablet
    ip_entity: sensor.tablet_ip
```

## 配置选项

### 基础配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | string | 电脑状态 | 卡片标题 |
| `display_mode` | string | vertical | 显示模式：vertical（纵向）/ horizontal（横向）|
| `columns` | number | 2 | 横向模式下的列数 |
| `entities` | list | [] | 电脑实体列表 |

### 电脑实体配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `name` | string | 实体名称 | 电脑名称 |
| `switch_entity` | string | required | 开关/状态实体（必需）|
| `device_type` | string | default | 设备类型：desktop / laptop / server / nas / tablet / mini_pc |
| `ip_entity` | string | null | IP地址传感器 |
| `mac_entity` | string | null | MAC地址传感器 |
| `power_entity` | string | null | 实时功率传感器（W）|
| `daily_energy_entity` | string | null | 日用电量传感器（kWh）|
| `monthly_energy_entity` | string | null | 月用电量传感器（kWh）|

### 设备图标

| device_type | 图标 |
|-------------|------|
| `desktop` | 🖥️ 台式机 |
| `laptop` | 💻 笔记本 |
| `server` | 🗄️ 服务器 |
| `nas` | 💽 NAS |
| `tablet` | 📱 平板 |
| `mini_pc` | 📦 迷你主机 |
| `all_in_one` | 🖥️ 一体机 |

### 样式配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `background_color` | string | var(--ha-card-background) | 卡片背景色 |
| `text_color` | string | var(--primary-text-color) | 主文字颜色 |
| `secondary_color` | string | var(--secondary-text-color) | 次要文字颜色 |

## 用电信息

用电信息是**可选的**：
- 如果配置了 `power_entity`，则显示实时功率
- 如果配置了 `daily_energy_entity`，则显示今日用电
- 如果配置了 `monthly_energy_entity`，则显示本月用电
- 如果都没有配置，则不显示用电区域

## HA 兼容性

### Grid 布局支持

卡片支持 Home Assistant 2024.x+ 的 Grid 布局系统：

- `getCardSize()` - 返回准确的卡片尺寸
- `getGridOptions()` - 响应式Grid配置
- `getLayoutOptions()` - 支持可见性和布局选项

### 主题变量

使用 HA CSS 变量，自动适配深色/浅色主题：

- `--ha-card-background` - 卡片背景
- `--primary-text-color` - 主文字颜色
- `--secondary-text-color` - 次要文字颜色
- `--success-color` - 运行中状态颜色
- `--error-color` - 已关机状态颜色

## 故障排除

### 卡片显示"未配置电脑实体"

确认 `entities` 列表中至少有一个实体配置，且 `switch_entity` 正确。

### IP/MAC地址显示"--"

1. 确认配置了对应的 `ip_entity` 或 `mac_entity`
2. 检查实体状态是否为有效值
3. 部分设备可能将IP/MAC存储在实体的属性中

### 深色主题适配

卡片默认使用 HA 主题变量，会自动适配。如需自定义：

```yaml
type: custom:computer-card
background_color: '#1a1f2e'
text_color: '#f1f5f9'
secondary_color: '#94a3b8'
```

## 项目信息

- **GitHub**: https://github.com/j1617/computer-card
- **版本**: v1.0.0
- **许可证**: MIT

## 许可证

MIT License