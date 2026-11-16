<div align="center">

<sub><b>TECHNICAL REFERENCE · MODEL ARCHITECTURES</b></sub>

# 大模型 Attention 架构与技术路线对照

**Attention Architectures in Chinese LLMs · A Route Atlas**

11 组国产大模型如何给注意力减负：
<br>
混合线性、滑动窗口与动态稀疏。
<br>
*How 11 Chinese LLM families make attention cheaper: hybrid linear, sliding-window and dynamic sparse attention.*

[![在线访问 Live](https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF%E8%AE%BF%E9%97%AE%20Live-meetrust.github.io-ffb347?style=flat-square&labelColor=111723)](https://meetrust.github.io/attention-architectures/) [![Deploy](https://github.com/meetrust/attention-architectures/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/meetrust/attention-architectures/actions/workflows/deploy-pages.yml)

[机制 Mechanisms](#机制图谱--mechanism-map) · [概览 Overview](#概览--overview) · [页面内容 Contents](#页面内容--contents) · [本地运行 Run locally](#本地运行--run-locally) · [数据说明 Data notes](#数据说明--data-notes)

</div>

## 机制图谱 · Mechanism map

| 机制 Mechanism | 组数 Families |
|---|---|
| ![LIN](https://img.shields.io/badge/LIN-%20-6248cc?style=flat-square&labelColor=111723)<br>线性注意力<br><sub>Linear attention</sub> | 用过 **5** · 最新 **4**<br><sub>used 5 · latest 4</sub> |
| ![WIN](https://img.shields.io/badge/WIN-%20-096b4a?style=flat-square&labelColor=111723)<br>滑动 / 局部窗口<br><sub>Sliding or local window</sub> | 用过 **4** · 最新 **4**<br><sub>used 4 · latest 4</sub> |
| ![SPA](https://img.shields.io/badge/SPA-%20-a8430c?style=flat-square&labelColor=111723)<br>稀疏注意力<br><sub>Sparse attention</sub> | 用过 **7** · 最新 **7**<br><sub>used 7 · latest 7</sub> |
| ![FULL](https://img.shields.io/badge/FULL-%20-56637a?style=flat-square&labelColor=111723)<br>全注意力 / 全局层<br><sub>Full attention or global layers</sub> | 用过 **8** · 最新 **4**<br><sub>used 8 · latest 4</sub> |
| ![REUSE](https://img.shields.io/badge/REUSE-%20-a82d83?style=flat-square&labelColor=111723)<br>跨层复用<br><sub>Cross-layer reuse</sub> | 用过 **4** · 最新 **3**<br><sub>used 4 · latest 3</sub> |
| ![KVC](https://img.shields.io/badge/KVC-%20-0a5fae?style=flat-square&labelColor=111723)<br>KV 压缩<br><sub>KV compression</sub> | 用过 **1** · 最新 **1**<br><sub>used 1 · latest 1</sub> |
| ![SSM](https://img.shields.io/badge/SSM-%20-7a5a00?style=flat-square&labelColor=111723)<br>状态空间（SSM）<br><sub>State space model</sub> | 用过 **1** · 最新 **0**<br><sub>used 1 · latest 0</sub> |

<sub>“用过”是任一版本用到该机制的组数，“最新”是最新版本仍在使用的组数，共 11 组。颜色与页面一致。</sub><br>
<sub>"Used" counts the families where any version uses the mechanism, "latest" those whose newest version still does, out of 11. Colours match the page.</sub>

## 概览 · Overview

把《大模型 Attention 架构与技术路线对照》做成一张可以交互的网页：11 组国产大模型、22 个模型版本，各自用了哪些注意力机制，又沿着什么路线演进。

页面把同一份原表拆成三种视图：路线迁移图看演进方向，架构图鉴逐个版本看原文架构、重复单元和参考文献，层序条码逐层画出原文给出层数的 4 个版本。可以按机制筛选、最多 3 组并排对比，也可以用 Ctrl / Command + K 快速定位。

An interactive version of the reference table *Attention Architectures and Technical Routes of Large Models*: 11 Chinese LLM families and 22 model versions, which attention mechanisms each one uses, and how their routes evolve.

The page turns the same table into three views: a route map for the direction of change, an explorer with each version's architecture, repeating unit and references, and layer-by-layer barcodes for the 4 versions whose depth the table gives. You can filter by mechanism, compare up to 3 families side by side, or jump anywhere with Ctrl / Command + K.

| **11** | **22** | **22** |
|:---:|:---:|:---:|
| 组模型<br><sub>model families</sub> | 个模型版本<br><sub>model versions</sub> | 篇参考资料<br><sub>references</sub> |

## 页面内容 · Contents

- **00 首屏**：三类主路线、关键数字，以及 FIG.01 注意力读取范围示意。<br><sub>Hero: the three main routes, key numbers and FIG.01, a schematic of what each token reads.</sub>
- **01 技术路线迁移**：11 组模型的版本演进，可按机制高亮；FIG.02 路线迁移、FIG.03 机制出现次数。<br><sub>Routes: how each family's route changed, highlighted by mechanism; FIG.02 route map and FIG.03 mechanism counts.</sub>
- **02 架构图鉴**：搜索、筛选，逐个版本查看原文架构、重复单元与参考文献，并加入对比。<br><sub>Explorer: search, filter, read each version's architecture, repeating unit and sources, and add it to a comparison.</sub>
- **03 层序对照**：Kimi K3、GLM-5.3-Flash、Step 3.5 Flash、MiMo-V2-Flash 的逐层条码，即 FIG.04。<br><sub>Layer stacks: FIG.04, layer-by-layer barcodes for Kimi K3, GLM-5.3-Flash, Step 3.5 Flash and MiMo-V2-Flash.</sub>
- **04 原表对照**：与原文逐字一致的表格。<br><sub>Source table: the original table, word for word.</sub>
- **05 参考资料**：22 篇官方文档、模型仓库与论文。<br><sub>Sources: 22 official docs, model repositories and papers.</sub>

## 本地运行 · Run locally

需要 Node.js 22.18 或更高版本。

Requires Node.js 22.18 or later.

```bash
npm ci
npm run dev        # 开发预览 · dev server at http://localhost:5173/
npm run build      # 构建到 dist/ · build into dist/
npm run check      # 数据自检 · check layer counts and references
```

## 项目结构 · Structure

```
src/data.ts                  唯一数据源 · single source of the page data
src/components/              页面各节 · page sections
src/tight-surface/           Tight Surface 设计 token 与组件样式 · design tokens and component styles
src/kumo-ts/                 Kumo 适配层 · Kumo adapter for Tight Surface
scripts/check-data.mjs       数据自检 · data self-check
scripts/readme-tables.mjs    生成本文件的表格 · generates the tables in this README
scripts/inline-artifact.mjs  生成单文件版本 · builds the single-file version
tools/                       页面检查脚本 · page QA scripts
```

## 数据说明 · Data notes

架构描述、技术路线与参考文献取自原文《大模型 Attention 架构与技术路线对照》，核对于 2026-11-16；其中 MiMo-V2-Flash 的层数按官方 README 更正为 8 组、40 个 SWA 层 + 8 个 Global 层。机制分类和 4 份层序条码是按原文整理出来的，绘制规则写在页面 FIG.04 下方；FIG.01 只是示意，不代表任何模型的真实参数。

Architecture descriptions, routes and references come from the source table, checked on 2026-11-16; the MiMo-V2-Flash layer counts are corrected against its official README to 8 blocks, 40 SWA plus 8 global layers. The mechanism classes and the 4 layer barcodes are derived from that text, with the drawing rules stated under FIG.04; FIG.01 is a schematic, not any model's real parameters.

## 同系列 · Companion projects

[《大模型可视化学习指南》](https://github.com/meetrust/llm-visual-guide)与[《斯坦福 AI 课程地图》](https://github.com/meetrust/stanford-ai-courses)：同一设计系列 Tight Surface 的另外两张页面。

[LLM Visual Guide](https://github.com/meetrust/llm-visual-guide) and [Stanford AI Course Map](https://github.com/meetrust/stanford-ai-courses): two companion pages in the same Tight Surface design series.
