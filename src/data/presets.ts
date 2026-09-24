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

export const createConsistencyConfig = (lang: Language): JevEvaluationConfig => {
  const isZh = lang === 'zh';
  return {
    systemInstruction: isZh
      ? '比较 baseline.text 与 scanned.text 的法律及商业含义。只忽略不改变含义的 OCR 错字和排版差异；不得忽略金额、日期、主体、权责或条款的增删变化。只判断可观察到的文本差异，不推断修改人或动机。'
      : 'Compare the legal and commercial meaning of baseline.text and scanned.text. Ignore only OCR and formatting noise that cannot change meaning. Do not ignore changed amounts, dates, parties, rights, duties, or missing clauses. Judge observable textual differences without inferring who made them or why.',
    questions: [
      {
        id: 'substantive_match',
        title: isZh ? '实质条款一致' : 'Substantive terms match',
        type: 'noul',
        instruction: isZh
          ? '忽略不改变含义的 OCR 和排版差异后，`baseline.text` 与 `scanned.text` 中的合同条款是否具有相同的法律和商业含义？'
          : 'Ignoring OCR and formatting differences that do not change meaning, do the terms in `baseline.text` and `scanned.text` have the same legal and commercial meaning?',
        noulPrompt: isZh ? '所有实质条款相同' : 'All substantive terms match',
        noulFalsePrompt: isZh ? '至少一项实质条款被改变、增加或删去' : 'At least one substantive term changed, was added, or was removed',
        weight: 1,
      },
      {
        id: 'human_edit_signs',
        title: isZh ? '疑似人为修改迹象' : 'Signs of deliberate editing',
        type: 'noul',
        instruction: isZh
          ? '与 `baseline.text` 相比，`scanned.text` 是否出现疑似人为修改的文本迹象：实质条款被新增、删除或替换，且不能合理解释为无害 OCR 错字或排版差异？只判断可观察迹象，不推断修改人或动机。'
          : 'Compared with `baseline.text`, does `scanned.text` show signs of deliberate editing: substantive terms added, removed, or replaced in a way that harmless OCR or formatting differences cannot explain? Judge observable signs only, not the editor or motive.',
        noulPrompt: isZh ? '存在不能用 OCR 噪声解释的实质修改迹象' : 'There are substantive edit signs that OCR noise cannot explain',
        noulFalsePrompt: isZh ? '不存在此类迹象' : 'There are no such signs',
        invertForConsistency: true,
        weight: 1,
      },
      {
        id: 'difference_type',
        title: isZh ? '差异类别' : 'Difference type',
        type: 'choice',
        instruction: isZh
          ? '`scanned.text` 与 `baseline.text` 的差异最符合哪一类？'
          : 'Which category best describes the differences between `scanned.text` and `baseline.text`?',
        choices: isZh
          ? [
              { id: 'same', label: '文本相同或仅有不影响含义的排版差异' },
              { id: 'ocr', label: '存在 OCR 错字，但法律和商业含义没有变化' },
              { id: 'changed', label: '至少一项实质条款被改变、增加或删去' },
              { id: 'unrelated', label: '两段文本明显不对应，无法逐项比较' },
            ]
          : [
              { id: 'same', label: 'Same text or only immaterial formatting differences' },
              { id: 'ocr', label: 'OCR errors with no legal or commercial change' },
              { id: 'changed', label: 'At least one substantive term changed, was added, or was removed' },
              { id: 'unrelated', label: 'The texts are not corresponding content' },
            ],
        consistentChoices: ['same', 'ocr'],
        weight: 1,
      },
      {
        id: 'consistency_degree',
        title: isZh ? '实质一致程度' : 'Degree of substantive consistency',
        type: 'score',
        instruction: isZh
          ? '忽略无害 OCR 噪声后，`scanned.text` 相对 `baseline.text` 的实质一致程度如何？'
          : 'Ignoring harmless OCR noise, how substantively consistent is `scanned.text` with `baseline.text`?',
        minScore: 0,
        maxScore: 4,
        scoreLevels: isZh
          ? [
              { score: 0, label: '内容不对应或核心条款完全不同' },
              { score: 1, label: '多处重要条款发生实质变化' },
              { score: 2, label: '至少一处重要条款发生变化或缺失' },
              { score: 3, label: '实质条款基本一致，但局部仍有不确定性' },
              { score: 4, label: '所有实质条款一致，差异仅为无害 OCR 或排版噪声' },
            ]
          : [
              { score: 0, label: 'Content is unrelated or core terms are entirely different' },
              { score: 1, label: 'Several important terms have substantive changes' },
              { score: 2, label: 'At least one important term changed or is missing' },
              { score: 3, label: 'Terms mostly match but some points remain uncertain' },
              { score: 4, label: 'All substantive terms match; differences are harmless OCR or formatting noise' },
            ],
        weight: 1,
      },
    ],
  };
};

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
    config: createConsistencyConfig('zh'),
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
    config: createConsistencyConfig('zh'),
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
    config: createConsistencyConfig('zh'),
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
    config: createConsistencyConfig('en'),
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
    config: createConsistencyConfig('en'),
  },
];

export const getContractPresets = (lang: Language): PresetScenario[] => {
  return lang === 'en' ? CONTRACT_PRESETS_EN : CONTRACT_PRESETS_ZH;
};

export const CONTRACT_PRESETS = CONTRACT_PRESETS_ZH;
