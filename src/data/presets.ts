import { JevEvaluationConfig } from '../types/jev';
import { Language } from '../i18n/translations';

export interface PresetScenario {
  id: string;
  name: string;
  badge: '需人工Review' | '自动通过' | 'Manual Review' | 'Auto-Pass';
  badgeColor: string;
  description: string;
  titleA: string;
  textA: string;
  titleB: string;
  textB: string;
  config: JevEvaluationConfig;
}

export const CONTRACT_PRESETS_ZH: PresetScenario[] = [
  {
    id: 'case_tampered_amount',
    name: '案例一：金额与违约金被恶意改动 (实质性篡改 ⚠️)',
    badge: '需人工Review',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: '合同采购总价少写了一个0（150万变15万），违约金由千分之五暗改缩水为万分之五，同时混杂部分扫描OCR形近字错别，系统敏锐捕获实质篡改。',
    titleA: '原始基准合同 (电子底稿)',
    textA: `设备采购与维保服务协议

第一条 合同价款与支付方式
1.1 本协议项下设备采购总金额为人民币 1,500,000 元（大写：人民币壹佰伍拾万元整）。
1.2 甲方应于本协议签署生效之日起 5 个工作日内，向乙方指定招商银行账户支付首期款项 30%，即人民币 450,000 元整。
1.3 设备到场完成初验合格后支付 60%，余款 10% 作为质保金，在质保期满 1 年后付清。

第二条 交付期限与交付地点
2.1 乙方应于 2026 年 11 月 30 日前将全部硬件设备运抵甲方指定数据中心并完成机架部署。
2.2 如乙方无故延迟交付超过 10 个工作日，甲方有权单方面解除本协议并追究乙方违约赔偿责任。

第三条 违约责任与争议解决
3.1 任何一方逾期履行付款或交付义务的，每逾期一日，应按照未履行业务金额的千分之五（0.5%）向守约方支付违约金。
3.2 因本合同引起的任何争议，双方应友好协商；协商不成的，应向甲方所在地有管辖权的人民法院提起诉讼。`,
    titleB: '回传扫描件 (OCR 识别文本)',
    textB: `设备采购与维保服务协议

第一条 合同价款与支付方式
1.1 本协议项下设备采购总金额为人民币 150,000 元（大写：人民币壹拾伍万元整）。
1.2 甲方应于本协议签署生效之日起 5 个工作日内，向乙方指定招商银行账户支付首期款项 30%，即人民币 45,000 元整。
1.3 设备到场完成初验合格后支付 60%，余款 10% 作为质保金，在质保期满 1 年后付清。

第二条 交付期限与交付地点
2.1 乙方应于 2026 年 11 月 30 日前将全部硬件设备运抵甲方指定数据中心并完成机架部署。
2.2 如乙方无故延迟交付超过 10 个工作目，甲方有权单方面解除本协议并追究乙方违约赔偿责任。

第三条 违约责任与争议解决
3.1 任何一方逾期履行付款或交付义务的，每逾期一日，应按照未履行业务金额的万分之五（0.05%）向守约方支付违约金。
3.2 因本合同引起的任何争议，双方应友好协商；协商不成的，应向乙方所在地有管辖权的人民法院提起诉讼。`,
    config: {
      systemInstruction: `作为资深法务合规审计与合同风控专家，请严格遵循 Jev 原子化评测标准，对比原始基准合同与扫描件 OCR 识别文本。
首要任务是严密甄别差异的性质：
1. 坚决区分【实质性篡改】（如改动金额数字、交付期限、违约金比例、管辖法院、单方责任排除等）与【OCR识别噪声】（如形近字'日/目'、'己/已'、多余空格换行、全半角标点）。
2. 若存在任何实质性篡改或法律权责重大变更，审查结论必须判定为【需人工Review】并列举疑点。
3. 若无实质性篡改且文本一致率 >= 85%，差异全部属于无实质法律影响的 OCR 字符瑕疵，判定为【自动通过】。`,
      questions: [
        {
          id: 'has_substantive_tampering',
          title: '是否存在实质性条款篡改？ (Substantive Tampering)',
          type: 'noul',
          instruction: '判断 OCR 文本中是否包含对金额、账号、交付时限、违约责任比例或管辖法院等关键法律实质条款的主观恶意或重大篡改。如仅仅为轻微OCR错别字（如日变目、标点符号），则判定为 false。',
          noulPrompt: '是否存在实质性法律/数值/权责篡改？',
          weight: 2.0,
        },
        {
          id: 'review_decision',
          title: '审核流向决策 (Audit Action Decision)',
          type: 'choice',
          instruction: '根据篡改与噪声识别结果给出自动化工作流决策：若无实质性差异仅有OCR噪声且一致率达标则 auto_pass；若检测出任何实质性金额或条款篡改则 require_human_review。',
          choices: [
            { id: 'auto_pass', label: '🟢 自动通过 (仅含轻微OCR噪声，一致性极高)' },
            { id: 'require_human_review', label: '🔴 需人工 Review (检出金额/权责实质篡改，必须人工介入)' },
            { id: 'rejected', label: '⛔ 建议直接驳回 (多处核心条款严重恶意篡改)' },
          ],
          weight: 2.5,
        },
        {
          id: 'amount_and_number_integrity',
          title: '核心金额与关键数值完整性',
          type: 'noul',
          instruction: '检查两份文本中所有的金额数字、百分比、日期、银行账号是否 100% 绝对一致无变更。',
          noulPrompt: '所有金额与数值是否绝对吻合？',
          weight: 1.8,
        },
        {
          id: 'ocr_noise_ratio',
          title: '差异中 OCR 字符识别噪声占比',
          type: 'score',
          instruction: '评估两份文本的所有差异点中，有多少比例属于OCR识别引擎造成的错别字、标点瑕疵或空格错位（5分表示差异基本全是良性OCR噪音，1分表示差异主要为恶意实质性修改）。',
          minScore: 1,
          maxScore: 5,
          scoreLevels: [
            { score: 1, label: '1分 - 几乎全是实质性篡改，无良性噪声' },
            { score: 3, label: '3分 - 篡改与OCR噪声混杂并存' },
            { score: 5, label: '5分 - 差异全部属于纯OCR字符噪声，不影响法律效力' },
          ],
          weight: 1.2,
        },
      ],
    },
  },
  {
    id: 'case_pure_ocr_noise',
    name: '案例二：纯 OCR 识别扫描噪声 (一致性极高，自动通过 🟢)',
    badge: '自动通过',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: '合同扫描后由于纸张褶皱与字迹，OCR 将“合同”误识为“合间”、“日”误识为“目”、多了半角空格，但所有金额（500,000元）、账号、违约责任一字不差，系统判定一致性极高，免人工直接自动通过。',
    titleA: '原始基准合同 (电子底稿)',
    textA: `技术咨询与企业培训服务合同

甲方：华兴智能科技股份有限公司
乙方：博远企业管理咨询（北京）有限责任公司

第一条 服务内容与交付成果
1. 乙方为甲方定制提供为期 6 个月的人工智能产业政策分析与技术架构培训服务。
2. 乙方承诺于合同生效后每月末向甲方提交当期培训评估报告及技术分析白皮书。

第二条 费用结算
1. 合同总费用为人民币 500,000 元（大写：人民币伍拾万元整）。
2. 款项分两期支付，首期 60% 即 300,000 元于合同签订后 7 个工作日内支付。
3. 尾款 40% 即 200,000 元于结项验收合格后 10 个工作日内结清。

第三条 知识产权归属
培训过程中由乙方编制的基础讲义知识产权归乙方所有；甲方定制开发的数据集与业务模型知识产权归甲方独家所有。`,
    titleB: '回传扫描件 (OCR 识别文本)',
    textB: `技术咨询与企业培训服务合间

甲方：华兴智能科技股份有限公司
乙方：博远企业管理咨询 (北京) 有限责任公司

第一条 服务内容与交付成果
1. 乙方为甲方定制提供为期 6 个月的人工智能产业政策分析与技术架构培训服务。
2. 乙方承诺于合间生效后每月末向甲方提交当期培训评估报告及技术分析白皮书。

第二条 费用结算
1. 合同总费用为人民币 500,000 元 (大写：人民币伍拾万元整) 。
2. 款项分两期支付，首期 60% 即 300,000 元于合同签订后 7 个工作目内支付。
3. 尾款 40% 即 200,000 元于结项验收合格后 10 个工作目内结清。

第三条 知识产权归属
培训过程中由乙方编制的基础讲义知识产权归乙方所有；甲方定制开发的数据集与业务模型知识产权归甲方独家所有。`,
    config: {
      systemInstruction: `作为法务合同审查引擎，请核验扫描识别件是否存在实质篡改。识别并区分良性 OCR 字符噪声（如“合间/合同”、“目/日”、括号全半角空格）与法律实质篡改。如若无实质权利变更且文本一致率 >= 85%，判定为【自动通过】。`,
      questions: [
        {
          id: 'has_substantive_tampering',
          title: '是否存在实质性条款篡改？ (Substantive Tampering)',
          type: 'noul',
          instruction: '判断是否有任何条款、金额、权利义务被篡改。仅有形近字（合间/合同、目/日、全半角空格）视为无篡改 (false)。',
          noulPrompt: '是否存在实质性篡改？',
          weight: 2.0,
        },
        {
          id: 'review_decision',
          title: '审核流向决策 (Audit Action Decision)',
          type: 'choice',
          instruction: '决策流向：无实质篡改且属于纯OCR噪声则返回 auto_pass；有实质变动则 require_human_review。',
          choices: [
            { id: 'auto_pass', label: '🟢 自动通过 (仅含轻微OCR噪声，一致性极高)' },
            { id: 'require_human_review', label: '🔴 需人工 Review (检出实质篡改)' },
          ],
          weight: 2.5,
        },
        {
          id: 'ocr_noise_ratio',
          title: 'OCR 噪声良性程度',
          type: 'score',
          instruction: '差异是否全部为 OCR 扫描噪点。5分表示完全为字符形近噪声，对合同法律效力与权利义务零实质影响。',
          minScore: 1,
          maxScore: 5,
          scoreLevels: [
            { score: 1, label: '1分 - 存在严重篡改' },
            { score: 5, label: '5分 - 纯OCR噪点，无任何法律实质影响' },
          ],
          weight: 1.5,
        },
      ],
    },
  },
  {
    id: 'case_liability_clause_deleted',
    name: '案例三：免责与解约条款被暗中删改 (隐蔽法律风险 ⚠️)',
    badge: '需人工Review',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: '回传扫描件中，对方暗中删除了乙方赔偿上限限制并删除了甲方单方解除合同权利，此类文字极度隐蔽，必须触发人工法务审查复核。',
    titleA: '原始基准合同 (电子底稿)',
    textA: `软件系统授权与实施许可协议

第四条 实施周期与验收标准
4.1 乙方应当自收到甲方首期款之日起 45 日内完成系统私有化部署并交付上线。
4.2 验收测试周期为 15 个自然日，若发现二级及以上严重缺陷，乙方须在 48 小时内完成热修复。

第五条 责任限制与解除合同
5.1 除故意或重大过失外，乙方因本协议承担的全部赔偿责任上限不超过甲方已支付总金额的 50%。
5.2 若乙方逾期交付系统超过 30 日，甲方有权书面通知立即无责解除本合同，并要求乙方全额退还已付款项并支付合同总额 20% 的违约金。`,
    titleB: '回传扫描件 (OCR 识别文本)',
    textB: `软件系统授权与实施许可协议

第四条 实施周期与验收标准
4.1 乙方应当自收到甲方首期款之日起 45 日内完成系统私有化部署并交付上线。
4.2 验收测试周期为 15 个自然目，若发现二级及以上严重缺陷，乙方须在 48 小时内完成修复。

第五条 责任限制与解除合同
5.1 乙方因本协议承担的全部赔偿责任上限不设限制。
5.2 双方若遇履行困难应优先继续协商推进，任一方均不得单方面解除本合同。`,
    config: {
      systemInstruction: `作为资深法务合规审计专家，重点核对免责条款、赔偿上限以及解除权是否被暗中单方改动。发现任何免责变动或解除权被剥夺，必须标记为实质性篡改并要求人工 Review。`,
      questions: [
        {
          id: 'has_substantive_tampering',
          title: '是否存在实质性条款篡改？ (Substantive Tampering)',
          type: 'noul',
          instruction: '是否删改了免责上限（50%改无限）、取消了甲方单方解除权？若是，则属于实质性篡改 (true)。',
          noulPrompt: '是否存在免责或解除权实质篡改？',
          weight: 2.0,
        },
        {
          id: 'review_decision',
          title: '审核流向决策 (Audit Action Decision)',
          type: 'choice',
          instruction: '针对核心责任条款改动给出处理建议。',
          choices: [
            { id: 'auto_pass', label: '🟢 自动通过 (仅OCR噪声)' },
            { id: 'require_human_review', label: '🔴 需人工 Review (免责/责任条款被单方篡改)' },
            { id: 'rejected', label: '⛔ 建议直接驳回' },
          ],
          weight: 2.5,
        },
      ],
    },
  },
];

export const CONTRACT_PRESETS_EN: PresetScenario[] = [
  {
    id: 'case_tampered_amount',
    name: 'Case 1: Total Price & Penalty Altered (Substantive Tampering ⚠️)',
    badge: 'Manual Review',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Total contract amount was reduced by a factor of 10 ($1,500,000 to $150,000), late penalty reduced from 0.5% to 0.05%, and dispute jurisdiction changed, mixed with benign OCR noise.',
    titleA: 'Original Baseline Contract (Draft)',
    textA: `EQUIPMENT PURCHASE AND MAINTENANCE AGREEMENT

Section 1. Contract Price and Payment Terms
1.1 The total purchase price for all equipment under this Agreement is USD $1,500,000 (One Million Five Hundred Thousand Dollars).
1.2 Buyer shall pay an initial deposit of 30%, amounting to USD $450,000, within five (5) business days following the execution of this Agreement.
1.3 60% shall be payable upon preliminary inspection and delivery acceptance, and the remaining 10% warranty retention shall be settled one (1) year thereafter.

Section 2. Delivery Schedule and Location
2.1 Seller shall deliver all hardware equipment to Buyer's designated data center by November 30, 2026.
2.2 If Seller fails to deliver for more than ten (10) business days without justification, Buyer shall be entitled to terminate this Agreement unilaterally.

Section 3. Default Liabilities and Dispute Resolution
3.1 In the event of overdue payment or delivery, the defaulting party shall pay liquidated damages equal to 0.5% of the delayed sum per day.
3.2 Any dispute arising from this Agreement shall be subject to the exclusive jurisdiction of the state and federal courts located in New York County, New York.`,
    titleB: 'Scanned Copy (OCR Extracted Text)',
    textB: `EQUIPMENT PURCHASE AND MAINTENANCE AGREEMENT

Section 1. Contract Price and Payment Terms
1.1 The total purchase price for all equipment under this Agreement is USD $150,000 (One Hundred Fifty Thousand Dollars).
1.2 Buyer shall pay an initial deposit of 30%, amounting to USD $45,000, within five (5) business days following the execution of this Agreement.
1.3 60% shall be payable upon preliminary inspection and delivery acceptance, and the remaining 10% warranty retention shall be settled one (1) year thereafter.

Section 2. Delivery Schedule and Location
2.1 Seller shall deliver all hardware equipment to Buyer's designated data center by November 30, 2026.
2.2 If Seller fails to deliver for more than 1O business days without justification, Buyer shall be entitled to terminate this Agreement unilaterally.

Section 3. Default Liabilities and Dispute Resolution
3.1 In the event of overdue payment or delivery, the defaulting party shall pay liquidated damages equal to 0.05% of the delayed sum per day.
3.2 Any dispute arising from this Agreement shall be subject to the exclusive jurisdiction of the state and federal courts located in Wilmington, Delaware.`,
    config: {
      systemInstruction: `As a senior legal compliance and contract risk auditor, evaluate the original baseline draft against the OCR scanned text following Jev atomic standards.
Your top priority is distinguishing:
1. Substantive tampering (alterations to monetary amounts, payment schedule, liquidated damages rate, jurisdiction, unilateral termination rights).
2. Benign OCR noise (optical character confusion like '1O' vs '10', punctuation, spaces, hyphenation).
Policy:
- If ANY substantive tampering is found: require_human_review.
- If no substantive tampering and consistency >= 85%: auto_pass.`,
      questions: [
        {
          id: 'has_substantive_tampering',
          title: 'Is there substantive clause tampering? (Substantive Tampering)',
          type: 'noul',
          instruction: 'Determine whether the scanned copy contains substantive alterations to price, payment milestones, penalties, or jurisdiction. Benign optical typos alone evaluate to false.',
          noulPrompt: 'Does substantive legal/financial tampering exist?',
          weight: 2.0,
        },
        {
          id: 'review_decision',
          title: 'Audit Workflow Routing Decision',
          type: 'choice',
          instruction: 'Workflow decision based on tampering vs noise: auto_pass if benign OCR noise only & consistency >= 85%; require_human_review if substantive alteration detected.',
          choices: [
            { id: 'auto_pass', label: '🟢 Auto Pass (Benign OCR noise only, consistency >= 85%)' },
            { id: 'require_human_review', label: '🔴 Require Human Review (Substantive tampering detected)' },
            { id: 'rejected', label: '⛔ Direct Rejection (Severe fraudulent modifications)' },
          ],
          weight: 2.5,
        },
        {
          id: 'amount_and_number_integrity',
          title: 'Monetary Amounts & Numerical Integrity',
          type: 'noul',
          instruction: 'Verify whether all monetary sums, percentages, dates, and account details match 100% between drafts.',
          noulPrompt: 'Are all monetary amounts and numbers 100% identical?',
          weight: 1.8,
        },
        {
          id: 'ocr_noise_ratio',
          title: 'Proportion of Benign OCR Noise',
          type: 'score',
          instruction: 'Rate how much of the detected differences are purely benign optical recognition noise (5 = pure OCR artifacts with zero legal effect; 1 = primarily malicious tampering).',
          minScore: 1,
          maxScore: 5,
          scoreLevels: [
            { score: 1, label: '1 - Primarily malicious tampering' },
            { score: 3, label: '3 - Mixed tampering and OCR noise' },
            { score: 5, label: '5 - Completely benign OCR optical noise' },
          ],
          weight: 1.2,
        },
      ],
    },
  },
  {
    id: 'case_pure_ocr_noise',
    name: 'Case 2: Pure OCR Scan Noise (High Consistency, Auto-Pass 🟢)',
    badge: 'Auto-Pass',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Scanning artifacts introduced typographical noise ("Agreenent", "ConsuItlng", double spacing), but all contract prices ($500,000), milestone payments, and rights are 100% intact. High consistency triggers auto-pass.',
    titleA: 'Original Baseline Contract (Draft)',
    textA: `TECHNICAL CONSULTING AND TRAINING SERVICES AGREEMENT

Party A: Apex Intelligence Technologies Inc.
Party B: Horizon Advisory & Management LLC

Clause 1. Scope of Services and Deliverables
1.1 Party B shall provide customized artificial intelligence technology and architecture training services for a period of six (6) months.
1.2 Party B agrees to submit a monthly training progress report and technical analysis whitepaper at the end of each calendar month.

Clause 2. Fees and Payment Schedule
2.1 The total fee under this Agreement is USD $500,000 (Five Hundred Thousand Dollars).
2.2 Payment shall be in two installments: 60% ($300,000) within seven (7) business days following agreement signing.
2.3 The final 40% ($200,000) shall be payable within ten (10) business days following final milestone acceptance.

Clause 3. Intellectual Property Ownership
Pre-existing courseware belongs to Party B; customized models and datasets developed specifically for Party A shall be the exclusive property of Party A.`,
    titleB: 'Scanned Copy (OCR Extracted Text)',
    textB: `TECHNICAL CONSULTING AND TRAINING SERVICES AGREENENT

Party A: Apex Intelligence Technologies Inc.
Party B: Horizon Advisory & Management LLC

Clause 1. Scope of Services and Deliverables
1.1 Party B shall provide customized artificial intelligence technology and architecture training services for a period of six (6) months.
1.2 Party B agrees to submit a monthly training progress report and technical analysis whitepaper at the end of each calendar month.

Clause 2. Fees and Payment Schedule
2.1 The total fee under this Agreement is USD $500,000 (Five Hundred Thousand Dollars) .
2.2 Payment shall be in two installments: 60% ($300,000) within seven (7) buslness days following agreenent signing.
2.3 The final 40% ($200,000) shall be payable within ten (10) buslness days following final milestone acceptance.

Clause 3. Intellectual Property Ownership
Pre-existing courseware belongs to Party B; customized models and datasets developed specifically for Party A shall be the exclusive property of Party A.`,
    config: {
      systemInstruction: `As a legal contract auditor, inspect whether the scanned OCR draft contains substantive alterations. Distinguish benign optical noise ('Agreenent/Agreement', 'buslness/business', extra spacing) from legal modifications. If no substantive change and consistency >= 85%, assign auto_pass.`,
      questions: [
        {
          id: 'has_substantive_tampering',
          title: 'Is there substantive clause tampering? (Substantive Tampering)',
          type: 'noul',
          instruction: 'Check if any business terms, amounts, or rights are modified. Typographical scan noise evaluates to false.',
          noulPrompt: 'Is there substantive clause tampering?',
          weight: 2.0,
        },
        {
          id: 'review_decision',
          title: 'Audit Workflow Routing Decision',
          type: 'choice',
          instruction: 'Routing decision: return auto_pass if benign noise only and consistency >= 85%; return require_human_review if substantive alteration detected.',
          choices: [
            { id: 'auto_pass', label: '🟢 Auto Pass (Benign noise only, consistency >= 85%)' },
            { id: 'require_human_review', label: '🔴 Require Human Review (Substantive tampering detected)' },
          ],
          weight: 2.5,
        },
        {
          id: 'ocr_noise_ratio',
          title: 'Benign Character Noise Degree',
          type: 'score',
          instruction: 'Are differences purely optical character scan noise? 5 = completely optical noise with zero legal impact.',
          minScore: 1,
          maxScore: 5,
          scoreLevels: [
            { score: 1, label: '1 - Severe tampering present' },
            { score: 5, label: '5 - Pure OCR noise, zero legal impact' },
          ],
          weight: 1.5,
        },
      ],
    },
  },
];

export const getContractPresets = (lang: Language): PresetScenario[] => {
  return lang === 'en' ? CONTRACT_PRESETS_EN : CONTRACT_PRESETS_ZH;
};

export const CONTRACT_PRESETS = CONTRACT_PRESETS_ZH;
