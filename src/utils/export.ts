import { ComparisonReport } from '../types/jev';
import { Language } from '../i18n/translations';

export function generateMarkdownReport(report: ComparisonReport, lang: Language = 'zh'): string {
  const { titleA, titleB, textA, textB, summary, items, timestamp, tamperingDetails } = report;

  const isZh = lang === 'zh';
  const isAutoPass = summary.contractDecision === 'auto_pass';

  const decisionBadge = isAutoPass
    ? (isZh ? '🟢 【Jev 判定：自动通过】' : '🟢 [Jev Decision: Auto-Pass]')
    : summary.contractDecision === 'require_human_review'
    ? (isZh ? '🔴 【Jev 判定：需人工 Review】' : '🔴 [Jev Decision: Manual Review Required]')
    : (isZh ? '⛔ 【Jev 判定：驳回】' : '⛔ [Jev Decision: Rejected]');

  let md = `# ${isZh ? '合同比对与篡改审查报告 (Contract Audit & Tampering Report)' : 'Contract Comparison & Anti-Tampering Audit Report'}
*${isZh ? '审查生成时间' : 'Generated'}: ${timestamp}*

---

## 1. ${isZh ? '核心审查裁决结论' : 'Executive Audit Findings'}
- **${isZh ? '审查决策建议' : 'Audit Recommendation'}**: **${decisionBadge}**
- **${isZh ? '基准底稿合同' : 'Baseline Contract'}**: ${titleA}
- **${isZh ? '回传扫描/OCR件' : 'Scanned Copy (OCR)'}**: ${titleB}
- **${isZh ? 'Jev 指标判定一致率' : 'Jev Metric Agreement'}**: **${summary.consistencyRate ?? 0}%**

> **${isZh ? '审核裁定理由' : 'Audit Rationale'}**: ${summary.decisionReason || summary.summaryText}

### ${isZh ? '核心发现与风险提示' : 'Key Findings & Risk Warnings'}
${summary.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

---

## 2. ${isZh ? '差异明细与篡改风险清单' : 'Difference & Risk Checklist'}

| # | ${isZh ? '条款位置' : 'Clause'} | ${isZh ? '差异属性' : 'Type'} | ${isZh ? '风险等级' : 'Risk'} | ${isZh ? '类别' : 'Category'} | ${isZh ? '原文底稿' : 'Baseline Text'} | ${isZh ? 'OCR 扫描件' : 'Scanned Text'} | ${isZh ? '审计分析与影响' : 'Audit Analysis & Impact'} |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- | :--- |
`;

  if (tamperingDetails && tamperingDetails.length > 0) {
    tamperingDetails.forEach((d, idx) => {
      const typeTag = d.type === 'tampering'
        ? (isZh ? '🔴 实质篡改' : '🔴 Tampering')
        : d.type === 'suspicious'
        ? (isZh ? '🟡 存疑' : '🟡 Suspicious')
        : (isZh ? '⚪ OCR噪声' : '⚪ OCR Noise');
      const riskTag = d.riskLevel === 'critical' ? 'Critical' : d.riskLevel === 'high' ? 'High' : d.riskLevel === 'medium' ? 'Medium' : 'Low';
      md += `| ${idx + 1} | **${d.clauseTitle}** | ${typeTag} | ${riskTag} | ${d.riskCategory} | \`${d.originalText}\` | \`${d.ocrText}\` | ${d.analysis.replace(/\|/g, '\\|')} |\n`;
    });
  } else {
    md += `| - | ${isZh ? 'Jev 未返回结构化差异明细' : 'No structured difference details returned by Jev'} | - | - | - | - | - | - |\n`;
  }

  md += `\n---\n\n## 3. ${isZh ? 'Jev 原子指标判定表 (System One Rubric)' : 'Jev Atomic Evaluation Rubric'}\n\n`;
  md += `| ${isZh ? '指标名称' : 'Metric'} | ${isZh ? '类型' : 'Type'} | ${titleA} | ${titleB} | ${isZh ? '变化裁定' : 'Verdict'} | ${isZh ? '判定论据' : 'Reasoning'} |\n`;
  md += `| :--- | :---: | :--- | :--- | :---: | :--- |\n`;

  for (const item of items) {
    const q = item.question;
    const aA = item.answerA;
    const aB = item.answerB;

    let resA = '-';
    let resB = '-';

    if (q.type === 'noul') {
      resA = `${aA.noulResult?.value ? 'True' : 'False'} (${Math.round((aA.noulResult?.probability || 0) * 100)}%)`;
      resB = `${aB.noulResult?.value ? 'True' : 'False'} (${Math.round((aB.noulResult?.probability || 0) * 100)}%)`;
    } else if (q.type === 'choice') {
      resA = `${aA.choiceResult?.selectedLabel || aA.choiceResult?.selectedId || '-'}`;
      resB = `${aB.choiceResult?.selectedLabel || aB.choiceResult?.selectedId || '-'}`;
    } else if (q.type === 'score') {
      resA = `${aA.scoreResult?.score || 0} / ${q.maxScore || 5}`;
      resB = `${aB.scoreResult?.score || 0} / ${q.maxScore || 5}`;
    }

    const verdictLabel =
      item.verdict === 'diverged'
        ? (isZh ? '⚠️ 产生分歧/存在风险' : '⚠️ Diverged')
        : item.verdict === 'preferred_a'
        ? (isZh ? '基准底稿占优' : 'Preferred A')
        : (isZh ? '保持一致' : 'Identical');

    md += `| **${q.title}** | \`${q.type}\` | ${resA} | ${resB} | ${verdictLabel} | ${item.deltaSummary.replace(/\|/g, '\\|')} |\n`;
  }

  md += `\n---\n\n## 4. ${isZh ? '原始合同文本留档' : 'Archived Contract Texts'}\n\n`;
  md += `### ${titleA} (${isZh ? '原始基准' : 'Baseline'})\n\`\`\`\n${textA}\n\`\`\`\n\n`;
  md += `### ${titleB} (${isZh ? 'OCR扫描回传件' : 'Scanned Copy'})\n\`\`\`\n${textB}\n\`\`\`\n`;

  return md;
}

export function generateHtmlReport(report: ComparisonReport, lang: Language = 'zh'): string {
  const { titleA, titleB, summary, timestamp, diffs, tamperingDetails } = report;
  const isZh = lang === 'zh';
  const isAutoPass = summary.contractDecision === 'auto_pass';

  const decisionBadgeHtml = isAutoPass
    ? `<div style="background:#ffffff; border:1px solid #cbd5e1; border-left:4px solid #16a34a; padding:16px 20px; border-radius:8px; margin-bottom:24px;">
        <div style="font-size:18px; font-weight:600; color:#0f172a;">
          ${isZh ? '🟢 Jev 工作流结论：【自动通过】' : '🟢 Jev Workflow Decision: Auto-Pass'}
        </div>
        <p style="margin:8px 0 0 0; font-size:13px; color:#475569;">${summary.decisionReason}</p>
       </div>`
    : `<div style="background:#ffffff; border:1px solid #cbd5e1; border-left:4px solid #dc2626; padding:16px 20px; border-radius:8px; margin-bottom:24px;">
        <div style="font-size:18px; font-weight:600; color:#0f172a;">
          ${isZh ? '🔴 Jev 工作流结论：【人工 Review】' : '🔴 Jev Workflow Decision: Manual Review Required'}
        </div>
        <p style="margin:8px 0 0 0; font-size:13px; color:#475569;">${summary.decisionReason}</p>
       </div>`;

  const tamperingRowsHtml = (tamperingDetails || [])
    .map((d, i) => {
      const isTampered = d.type === 'tampering';
      const badge = isTampered
        ? `<span style="font-weight:600; font-size:12px; color:#dc2626;">${isZh ? '[实质篡改]' : '[Tampering]'}</span>`
        : `<span style="font-weight:500; font-size:12px; color:#64748b;">${isZh ? '[OCR噪点]' : '[OCR Noise]'}</span>`;

      return `
      <tr>
        <td style="text-align:center; font-weight:600; color:#64748b;">${i + 1}</td>
        <td>
          <div style="font-weight:600; color:#0f172a;">${d.clauseTitle}</div>
          <div style="font-size:11px; color:#64748b;">${d.riskCategory}</div>
        </td>
        <td style="text-align:center;">${badge}</td>
        <td style="font-family:monospace; font-size:12px; color:#334155; background:#f8fafc;">${d.originalText}</td>
        <td style="font-family:monospace; font-size:12px; color:#0f172a; background:${isTampered ? '#fef2f2' : '#f8fafc'};">${d.ocrText}</td>
        <td style="font-size:12.5px; color:#334155;">${d.analysis}</td>
      </tr>
      `;
    })
    .join('');

  const diffHighlightHtml = diffs
    .map((d) => {
      const escaped = d.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
      if (d.added) {
        return `<span style="background:#bbf7d0; color:#14532d; text-decoration:none; padding:1px 3px; border-radius:3px;">${escaped}</span>`;
      }
      if (d.removed) {
        return `<span style="background:#fecaca; color:#7f1d1d; text-decoration:line-through; padding:1px 3px; border-radius:3px;">${escaped}</span>`;
      }
      return escaped;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="${isZh ? 'zh-CN' : 'en'}">
<head>
  <meta charset="UTF-8">
  <title>${isZh ? '合同比对与篡改审查报告' : 'Contract Audit & Tampering Report'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 32px 16px; margin: 0; }
    .container { max-width: 1100px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    h1 { font-size: 22px; margin-top: 0; color: #0f172a; font-weight: 700; }
    h2 { font-size: 15px; color: #0f172a; margin-top: 28px; font-weight: 600; padding-bottom: 6px; border-bottom: 1px solid #e2e8f0; }
    .meta-bar { font-size: 12px; color: #64748b; margin-bottom: 20px; }
    .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .stat-card { background: #ffffff; border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; }
    .stat-title { font-size: 11px; color: #64748b; }
    .stat-val { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; font-weight: 600; color: #475569; font-size: 12px; }
    .diff-box { background: #0f172a; color: #f8fafc; border-radius: 8px; padding: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; line-height: 1.8; white-space: pre-wrap; word-break: break-word; }
    @media print {
      body { background: #fff; padding: 0; }
      .container { box-shadow: none; padding: 0; border: none; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
      <div>
        <h1>${isZh ? '合同比对与防篡改审查报告' : 'Contract Comparison & Anti-Tampering Audit Report'}</h1>
        <div class="meta-bar">${isZh ? '生成时间' : 'Generated'}: ${timestamp} | ${isZh ? '评测规范' : 'Standard'}: TypeSafe Jev System One</div>
      </div>
      <button class="no-print" onclick="window.print()" style="padding:7px 14px; background:#0f172a; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:12px; font-weight:500;">
        ${isZh ? '打印 / 导出 PDF' : 'Print / Export PDF'}
      </button>
    </div>

    ${decisionBadgeHtml}

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-title">${isZh ? 'Jev 指标判定一致率' : 'Jev Metric Agreement'}</div>
        <div class="stat-val">${summary.consistencyRate ?? 0}%</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">${isZh ? '审查放行判定' : 'Audit Decision'}</div>
        <div class="stat-val" style="font-size:14px; margin-top:8px;">
          ${isAutoPass ? (isZh ? '🟢 准予自动通过' : '🟢 Auto-Pass Approved') : (isZh ? '🔴 需人工 Review' : '🔴 Manual Review Required')}
        </div>
      </div>
    </div>

    <h2>${isZh ? '1. 差异明细清单' : '1. Difference & Tampering Checklist'}</h2>
    <table>
      <thead>
        <tr>
          <th style="width:36px; text-align:center;">#</th>
          <th style="width:160px;">${isZh ? '条款位置与类别' : 'Clause & Category'}</th>
          <th style="width:90px; text-align:center;">${isZh ? '差异属性' : 'Type'}</th>
          <th style="width:220px;">${titleA}</th>
          <th style="width:220px;">${titleB}</th>
          <th>${isZh ? '差异判定说明' : 'Audit Findings & Rationale'}</th>
        </tr>
      </thead>
      <tbody>
        ${tamperingRowsHtml}
      </tbody>
    </table>

    <h2>${isZh ? '2. 全文高亮比对' : '2. Full-Text Word-by-Word Diff'}</h2>
    <div style="margin-bottom:8px; font-size:12px; color:#64748b;">
      <span style="background:#bbf7d0; color:#14532d; padding:2px 6px; border-radius:3px; margin-right:8px;">${isZh ? '+ 扫描回传件变动/新增' : '+ Added / Changed in scanned copy'}</span>
      <span style="background:#fecaca; color:#7f1d1d; text-decoration:line-through; padding:2px 6px; border-radius:3px;">${isZh ? '- 原文电子底稿' : '- Baseline draft removed'}</span>
    </div>
    <div class="diff-box">
      ${diffHighlightHtml}
    </div>

    <div style="margin-top:36px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:11px; color:#94a3b8; text-align:center;">
      ${isZh ? '本报告由 AI 合同比对与防篡改审查工具基于 TypeSafe Jev System One 规范自动生成' : 'Generated by AI Contract Comparison & Anti-Tampering Audit Engine (TypeSafe Jev System One Standard)'}
    </div>
  </div>
</body>
</html>`;
}

export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
