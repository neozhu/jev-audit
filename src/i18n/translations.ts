export type Language = 'zh' | 'en';

export interface Translations {
  common: {
    confirm: string;
    cancel: string;
    save: string;
    close: string;
    delete: string;
    edit: string;
    copy: string;
    copied: string;
    loading: string;
    chars: string;
    clear: string;
    paste: string;
    upload: string;
    all: string;
  };
  header: {
    appTitle: string;
    appSubtitle: string;
    jevConnected: string;
    jevEngine: string;
    loadPresets: string;
    reset: string;
    apiConfig: string;
    language: string;
  };
  input: {
    titleA: string;
    titleB: string;
    placeholderA: string;
    placeholderB: string;
    swapTooltip: string;
    chars: string;
    clear: string;
    paste: string;
    importTxt: string;
    fileImported: string;
    pasted: string;
    clipboardError: string;
  };
  rubric: {
    title: string;
    atomicCount: string;
    aiExtract: string;
    addQuestion: string;
    rawJson: string;
    systemInstruction: string;
    systemInstructionHint: string;
    systemInstructionPlaceholder: string;
    saveInstruction: string;
    instructionSaved: string;
    emptyQuestions: string;
    booleanType: string;
    choiceType: string;
    scoreType: string;
    weight: string;
    prompt: string;
    choices: string;
    scoreRange: string;
  };
  execute: {
    ready: string;
    executing: string;
    runAudit: string;
    auditing: string;
  };
  results: {
    autoPassTitle: string;
    tamperingTitle: string;
    lowConsistencyTitle: string;
    consistencyRate: string;
    passedThreshold: string;
    belowThreshold: string;
    ruleNotice: string;
    tamperingCount: string;
    ocrNoiseCount: string;
    copyVerdict: string;
    copied: string;
    exportReport: string;
    diffListTitle: string;
    diffListSubtitle: string;
    filterAll: string;
    filterTampering: string;
    filterNoise: string;
    tagTampering: string;
    tagNoise: string;
    markReview: string;
    reviewed: string;
    baselineDraft: string;
    ocrDraft: string;
    findingRationale: string;
    noTamperingFound: string;
    noFilteredItems: string;
    fullDiffTitle: string;
    fullDiffAdded: string;
    fullDiffRemoved: string;
    jevRawTitle: string;
    engineArch: string;
    stateAInference: string;
    stateBInference: string;
    verdictIdentical: string;
    verdictDiverged: string;
    verdictPreferredA: string;
    verdictImprovedB: string;
    confidence: string;
    probability: string;
    score: string;
    reasoning: string;
    evidenceQuotes: string;
    reportCopied: string;
  };
  aiModal: {
    title: string;
    subtitle: string;
    scenarioHint: string;
    scenario1Title: string;
    scenario1Prompt: string;
    scenario2Title: string;
    scenario2Prompt: string;
    scenario3Title: string;
    scenario3Prompt: string;
    scenario4Title: string;
    scenario4Prompt: string;
    inputLabel: string;
    inputPlaceholder: string;
    inputTip: string;
    topicLabel: string;
    topicPlaceholder: string;
    generateBtn: string;
    generatingBtn: string;
    generatedSuccess: string;
    architectureHint: string;
    sysInstructionLabel: string;
    appendBtn: string;
    replaceBtn: string;
    footerSpec: string;
    errorTip: string;
  };
  questionModal: {
    addTitle: string;
    editTitle: string;
    typeLabel: string;
    noulDesc: string;
    choiceDesc: string;
    scoreDesc: string;
    idLabel: string;
    titleLabel: string;
    titlePlaceholder: string;
    instructionLabel: string;
    instructionPlaceholder: string;
    noulPromptLabel: string;
    noulPromptPlaceholder: string;
    weightLabel: string;
    choicesLabel: string;
    addChoice: string;
    scoreRangeLabel: string;
    minScore: string;
    maxScore: string;
    saveBtn: string;
    cancelBtn: string;
    optionIdPlaceholder: string;
    optionLabelPlaceholder: string;
  };
  apiModal: {
    title: string;
    subtitle: string;
    nativeTitle: string;
    nativeDesc: string;
    keyLabel: string;
    keyPlaceholder: string;
    statusLabel: string;
    saveKey: string;
    keySaved: string;
    openaiTitle: string;
    openaiDesc: string;
  };
}

export const translations: Record<Language, Translations> = {
  zh: {
    common: {
      confirm: '确认',
      cancel: '取消',
      save: '保存',
      close: '关闭',
      delete: '删除',
      edit: '编辑',
      copy: '复制',
      copied: '已复制',
      loading: '加载中...',
      chars: '字符数',
      clear: '清空',
      paste: '粘贴',
      upload: '导入',
      all: '全部',
    },
    header: {
      appTitle: 'AI 合同比对与防篡改审查工具',
      appSubtitle: 'Jev 评估合同实质一致性 · 得分超过 90% 自动通过',
      jevConnected: 'TypeSafe Jev (已连接)',
      jevEngine: 'Jev 评测引擎',
      loadPresets: '载入测试合同案例',
      reset: '重置',
      apiConfig: 'API 配置',
      language: '语言',
    },
    input: {
      titleA: '原始基准合同 (底稿)',
      titleB: '回传扫描件 (OCR文本)',
      placeholderA: '在此输入或粘贴原始基准合同内容...',
      placeholderB: '在此输入或粘贴回传扫描件 OCR 识别文本...',
      swapTooltip: '交换文本 A 与 文本 B',
      chars: '字符数',
      clear: '清空',
      paste: '粘贴',
      importTxt: '导入 .txt',
      fileImported: '已成功导入文件内容',
      pasted: '已从剪贴板粘贴',
      clipboardError: '无法读取剪贴板内容',
    },
    rubric: {
      title: 'Jev 评测指标与指令维护 (Evaluation Questions & Rubric)',
      atomicCount: '项原子指标',
      aiExtract: '智能提炼审查指标',
      addQuestion: '添加 Jev 问题',
      rawJson: 'JSON',
      systemInstruction: '全局评测指令 / System Instruction',
      systemInstructionHint: '设定 Jev 评估引擎的角色准则与边界',
      systemInstructionPlaceholder: '输入全局评测系统指令...',
      saveInstruction: '保存指令',
      instructionSaved: '已更新全局指令',
      emptyQuestions: '暂无评测指标，请点击上方“添加 Jev 问题”或“智能提炼审查指标”配置。',
      booleanType: '布尔判定',
      choiceType: '分类流向',
      scoreType: '等级评分',
      weight: '权重',
      prompt: '判定题干',
      choices: '选项',
      scoreRange: '分值区间',
    },
    execute: {
      ready: '就绪，等待 Jev 比较两份合同的实质含义',
      executing: 'Jev 正在判断合同实质一致性...',
      runAudit: '启动合同比对与篡改审查',
      auditing: '正在比对审查中...',
    },
    results: {
      autoPassTitle: '准予自动放行（免人工审核）',
      tamperingTitle: '需人工 Review（检出实质性篡改）',
      lowConsistencyTitle: '需人工 Review（Jev 工作流结论）',
      consistencyRate: 'Jev 指标判定一致率',
      passedThreshold: '(超过 90%)',
      belowThreshold: '(不超过 90%)',
      ruleNotice: '结论来源：TypeSafe Jev 原生结果',
      tamperingCount: '实质篡改',
      ocrNoiseCount: '扫描噪点',
      copyVerdict: '复制结论',
      copied: '已复制',
      exportReport: '导出报告 (HTML/PDF)',
      diffListTitle: '比对差异清单',
      diffListSubtitle: '· 红色标记为实质性篡改，灰色为扫描形近字噪声',
      filterAll: '全部',
      filterTampering: '仅看篡改',
      filterNoise: '仅看OCR噪点',
      tagTampering: '[实质篡改]',
      tagNoise: '[OCR噪点]',
      markReview: '标记复核',
      reviewed: '已复核',
      baselineDraft: '原始电子底稿（标准件）:',
      ocrDraft: '回传扫描件（OCR提取）:',
      findingRationale: '判定说明:',
      noTamperingFound: '太好了！未检测出任何实质性篡改条款。',
      noFilteredItems: '没有符合条件的差异项。',
      fullDiffTitle: '全文逐字高亮比对 (通读审查)',
      fullDiffAdded: '+ 变动/新增',
      fullDiffRemoved: '- 原文底稿',
      jevRawTitle: 'Jev 底层评测数据 (原子问题与推断)',
      engineArch: '底层 Jev 引擎架构',
      stateAInference: '状态 A 推断 (底稿)',
      stateBInference: '状态 B 推断 (扫描件)',
      verdictIdentical: '一致 (Identical)',
      verdictDiverged: '分歧 (Diverged)',
      verdictPreferredA: '底稿更优 (Preferred A)',
      verdictImprovedB: '回传件改优 (Improved B)',
      confidence: '置信度',
      probability: '概率',
      score: '分值',
      reasoning: '推断理由',
      evidenceQuotes: '佐证引用',
      reportCopied: '【合同比对与防篡改审查结论】',
    },
    aiModal: {
      title: '智能定制评测指标与指令',
      subtitle: '描述您的业务审查要求，AI 将自动提炼符合 Jev 规范的原子化评测指标与指令',
      scenarioHint: '快速选择或参考审查场景：',
      scenario1Title: '采购与供应链合同',
      scenario1Prompt: '重点核查设备采购单价、总价、付款节点百分比，以及供方延迟交付违约金比例是否有变动。',
      scenario2Title: '保密协议 (NDA) 审核',
      scenario2Prompt: '核查保密义务期限是否被擅自缩短、违约赔偿金限额是否被下调、司法管辖法院是否被修改。',
      scenario3Title: '租赁与不动产协议',
      scenario3Prompt: '核查月租金金额、免租期条款、押金退还条件以及单方提前解约的免责条款是否被篡改。',
      scenario4Title: '服务与委托开发协议',
      scenario4Prompt: '严密核查知识产权归属条款、项目阶段验收标准、以及是否新增单方扣减服务费的条款。',
      inputLabel: '自然语言审查诉求描述',
      inputPlaceholder: '例如：需要严格审查支付节点是否被延后、是否有新增单方解约权、违约金比例是否被下调...',
      inputTip: '描述越具体，提炼出的原子指标判定逻辑越严密。',
      topicLabel: '合同类型 / 行业标签 (可选)',
      topicPlaceholder: '例如：软件采购合同、劳动合同、战略合作协议',
      generateBtn: '提炼 Jev 评测指标与指令',
      generatingBtn: '正在分析并提炼指标...',
      generatedSuccess: '已提炼',
      architectureHint: '遵循独立状态求值与类型化架构',
      sysInstructionLabel: '全局评测指令 (System Instruction)',
      appendBtn: '追加到现有指标',
      replaceBtn: '应用并替换指标列表',
      footerSpec: '遵循 TypeSafe Jev System One 原子评测规范与合同防篡改标准',
      errorTip: '生成失败，请重试。',
    },
    questionModal: {
      addTitle: '添加 Jev 评测问题',
      editTitle: '编辑 Jev 评测问题',
      typeLabel: '问题类型 (Jev Question Type)',
      noulDesc: '输出布尔值(true/false)及其概率置信度，适合关键条款有无判断。',
      choiceDesc: '从预设选项中选取分类并输出概率分布，适合业务流向判定。',
      scoreDesc: '数字评分标尺，适合对整体相似度或噪声占比进行量化评级。',
      idLabel: '唯一标识 (ID)',
      titleLabel: '指标名称 (Title)',
      titlePlaceholder: '例如：合同实质一致性',
      instructionLabel: '评测指令 (Instruction for Evaluator)',
      instructionPlaceholder: '指导评估引擎如何推断该指标...',
      noulPromptLabel: '布尔判定题干 (Noul Prompt)',
      noulPromptPlaceholder: '例如：两份合同的实质含义一致',
      weightLabel: '指标权重 (Weight)',
      choicesLabel: '分类预设选项 (Choices)',
      addChoice: '添加选项',
      scoreRangeLabel: '分值区间与等级',
      minScore: '最低分',
      maxScore: '最高分',
      saveBtn: '保存问题',
      cancelBtn: '取消',
      optionIdPlaceholder: '选项ID (如 opt_pass)',
      optionLabelPlaceholder: '选项标签文本 (如 自动通过)',
    },
    apiModal: {
      title: 'TypeSafe Jev API 引擎接入配置',
      subtitle: '支持使用 TypeSafe 官方原生 API 或 OpenAI 规范引擎驱动',
      nativeTitle: '官方 TypeSafe Jev 原生接口',
      nativeDesc: '通过官方 System One REST API 对文本 A 与文本 B 进行并行独立状态求值。',
      keyLabel: 'TypeSafe API Key',
      keyPlaceholder: 'jev_sk_...',
      statusLabel: '连接状态',
      saveKey: '保存 API Key',
      keySaved: '已保存 API Key',
      openaiTitle: 'GPT 问题生成器',
      openaiDesc: '配置 OPENAI_API_KEY 后可使用 GPT 生成 Jev 原子问题；GPT 不参与合同比对。',
    },
  },
  en: {
    common: {
      confirm: 'Confirm',
      cancel: 'Cancel',
      save: 'Save',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      copy: 'Copy',
      copied: 'Copied',
      loading: 'Loading...',
      chars: 'chars',
      clear: 'Clear',
      paste: 'Paste',
      upload: 'Upload',
      all: 'All',
    },
    header: {
      appTitle: 'AI Contract Comparison & Anti-Tampering Audit',
      appSubtitle: 'Jev contract consistency · Auto-pass above 90%',
      jevConnected: 'TypeSafe Jev (Connected)',
      jevEngine: 'Jev Audit Engine',
      loadPresets: 'Load Sample Contracts',
      reset: 'Reset',
      apiConfig: 'API Config',
      language: 'Language',
    },
    input: {
      titleA: 'Original Baseline Contract (Draft)',
      titleB: 'Scanned Copy (OCR Text)',
      placeholderA: 'Paste or enter original baseline contract content here...',
      placeholderB: 'Paste or enter scanned contract OCR text here...',
      swapTooltip: 'Swap Text A and Text B',
      chars: 'chars',
      clear: 'Clear',
      paste: 'Paste',
      importTxt: 'Import .txt',
      fileImported: 'File loaded successfully',
      pasted: 'Pasted from clipboard',
      clipboardError: 'Unable to read clipboard content',
    },
    rubric: {
      title: 'Jev Evaluation Rubric & Metrics Maintenance',
      atomicCount: 'atomic metrics',
      aiExtract: 'AI Rubric Generator',
      addQuestion: 'Add Question',
      rawJson: 'JSON',
      systemInstruction: 'Global System Instruction',
      systemInstructionHint: 'Define role boundaries and criteria for the Jev evaluation engine',
      systemInstructionPlaceholder: 'Enter global evaluation system instruction...',
      saveInstruction: 'Save Instruction',
      instructionSaved: 'Global instruction updated',
      emptyQuestions: 'No evaluation metrics configured. Click "Add Question" or "AI Rubric Generator" above.',
      booleanType: 'Boolean',
      choiceType: 'Classification',
      scoreType: 'Score',
      weight: 'Weight',
      prompt: 'Prompt',
      choices: 'Choices',
      scoreRange: 'Score Range',
    },
    execute: {
      ready: 'Ready. Jev will compare the substantive meaning of both contracts',
      executing: 'Comparing contract clauses, distinguishing substantive tampering from OCR noise...',
      runAudit: 'Run Contract Audit & Comparison',
      auditing: 'Auditing Contract...',
    },
    results: {
      autoPassTitle: 'Auto-Pass Approved (No Manual Review Needed)',
      tamperingTitle: 'Manual Review Required (Substantive Tampering Detected)',
      lowConsistencyTitle: 'Manual Review Required (Jev Workflow Decision)',
      consistencyRate: 'Jev Metric Agreement',
      passedThreshold: '(Above 90%)',
      belowThreshold: '(90% or below)',
      ruleNotice: 'Source: native TypeSafe Jev results',
      tamperingCount: 'Substantive Tampering',
      ocrNoiseCount: 'OCR Noise',
      copyVerdict: 'Copy Verdict',
      copied: 'Copied!',
      exportReport: 'Export Report (HTML/PDF)',
      diffListTitle: 'Audit Difference List',
      diffListSubtitle: '· Red highlights substantive alterations, grey indicates OCR typographical noise',
      filterAll: 'All',
      filterTampering: 'Tampering Only',
      filterNoise: 'OCR Noise Only',
      tagTampering: '[Tampering]',
      tagNoise: '[OCR Noise]',
      markReview: 'Mark Reviewed',
      reviewed: 'Reviewed',
      baselineDraft: 'Original Baseline Draft:',
      ocrDraft: 'Scanned Document (OCR):',
      findingRationale: 'Audit Rationale:',
      noTamperingFound: 'Great! No substantive clause tampering was detected.',
      noFilteredItems: 'No differences matching the current filter.',
      fullDiffTitle: 'Full-Text Word-by-Word Diff (Proofreading)',
      fullDiffAdded: '+ Added / Changed',
      fullDiffRemoved: '- Original Baseline',
      jevRawTitle: 'Underlying Jev Evaluation Data (Atomic Inferences)',
      engineArch: 'Underlying Jev Engine Architecture',
      stateAInference: 'State A Inference (Baseline)',
      stateBInference: 'State B Inference (Scanned)',
      verdictIdentical: 'Identical',
      verdictDiverged: 'Diverged',
      verdictPreferredA: 'Preferred A',
      verdictImprovedB: 'Improved B',
      confidence: 'Confidence',
      probability: 'Probability',
      score: 'Score',
      reasoning: 'Reasoning',
      evidenceQuotes: 'Evidence Quotes',
      reportCopied: '【Contract Comparison & Anti-Tampering Verdict】',
    },
    aiModal: {
      title: 'AI Rubric & Metrics Generator',
      subtitle: 'Describe your audit requirements, and AI will generate atomic Jev evaluation questions',
      scenarioHint: 'Quick sample scenarios:',
      scenario1Title: 'Procurement & Supply Chain',
      scenario1Prompt: 'Check equipment unit price, total price, payment milestone percentages, and delivery delay penalty rates.',
      scenario2Title: 'Non-Disclosure Agreement (NDA)',
      scenario2Prompt: 'Check if confidentiality term is shortened, liability cap is reduced, or governing jurisdiction is altered.',
      scenario3Title: 'Lease & Property Agreement',
      scenario3Prompt: 'Check monthly rent amount, rent-free period, security deposit refund terms, and early termination clauses.',
      scenario4Title: 'IT Services & Software Development',
      scenario4Prompt: 'Check intellectual property ownership, milestone acceptance criteria, and fee withholding rights.',
      inputLabel: 'Natural Language Audit Requirement Description',
      inputPlaceholder: 'e.g. Strictly verify whether payment terms were delayed, unilateral termination rights added, or penalty rates reduced...',
      inputTip: 'More specific descriptions produce more robust atomic evaluation logic.',
      topicLabel: 'Contract Type / Industry (Optional)',
      topicPlaceholder: 'e.g. Software Procurement, Employment Agreement, Strategic Partnership',
      generateBtn: 'Generate Jev Rubric & Metrics',
      generatingBtn: 'Analyzing and generating rubric...',
      generatedSuccess: 'Generated',
      architectureHint: 'Complies with independent state evaluation & typed schema',
      sysInstructionLabel: 'Global System Instruction',
      appendBtn: 'Append to Existing',
      replaceBtn: 'Replace Current Rubric',
      footerSpec: 'Compliant with TypeSafe Jev System One standards and contract anti-tampering rules',
      errorTip: 'Generation failed. Please try again.',
    },
    questionModal: {
      addTitle: 'Add Jev Question',
      editTitle: 'Edit Jev Question',
      typeLabel: 'Question Type',
      noulDesc: 'Outputs boolean (true/false) with probability, ideal for key clause presence/alteration.',
      choiceDesc: 'Selects category from predefined choices with probability distribution, ideal for routing.',
      scoreDesc: 'Numerical rating scale, ideal for overall similarity or noise ratio quantification.',
      idLabel: 'Unique ID',
      titleLabel: 'Metric Title',
      titlePlaceholder: 'e.g. Is there substantive clause tampering?',
      instructionLabel: 'Evaluation Instruction',
      instructionPlaceholder: 'Guide the evaluation engine on how to infer this metric...',
      noulPromptLabel: 'Boolean Prompt (Noul)',
      noulPromptPlaceholder: 'e.g. Both contracts have the same substantive meaning',
      weightLabel: 'Weight',
      choicesLabel: 'Predefined Choices',
      addChoice: 'Add Choice',
      scoreRangeLabel: 'Score Range & Levels',
      minScore: 'Min Score',
      maxScore: 'Max Score',
      saveBtn: 'Save Question',
      cancelBtn: 'Cancel',
      optionIdPlaceholder: 'Choice ID (e.g. opt_pass)',
      optionLabelPlaceholder: 'Choice Label (e.g. Auto Pass)',
    },
    apiModal: {
      title: 'TypeSafe Jev API Integration Config',
      subtitle: 'Powered by official TypeSafe Jev native API or OpenAI specification engine',
      nativeTitle: 'Official TypeSafe Jev Native API',
      nativeDesc: 'Perform parallel independent state evaluation on Text A and Text B via official System One REST API.',
      keyLabel: 'TypeSafe API Key',
      keyPlaceholder: 'jev_sk_...',
      statusLabel: 'Connection Status',
      saveKey: 'Save API Key',
      keySaved: 'API Key Saved',
      openaiTitle: 'GPT Question Generator',
      openaiDesc: 'Configure OPENAI_API_KEY to generate Jev atomic questions; GPT never performs contract comparison.',
    },
  },
};
