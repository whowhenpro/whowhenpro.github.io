// ─── Sunburst hierarchy (lifted from figures/stats/d3_sunburst/sunburst.html) ───
const HIER_DATA = {
  name: "root",
  children: [
    {
      name: "Text", mod: "Text", children: [
        { name: "QA", children: [
          { name: "GAIA", value: 302 }, { name: "SimpleQA", value: 509 },
          { name: "MMLU Pro", value: 371 }, { name: "KramaBench", value: 82 }
        ]},
        { name: "Math & Sci.", children: [
          { name: "GPQA", value: 143 }, { name: "MATH", value: 448 }, { name: "SciBench", value: 555 }
        ]},
        { name: "Coding", children: [
          { name: "BigCodeBench", value: 195 }, { name: "HumanEval", value: 18 }, { name: "LCB Pro", value: 129 }
        ]},
        { name: "Data Sci.", children: [
          { name: "DABench", value: 327 }, { name: "DACode", value: 306 }, { name: "DataBench", value: 818 },
          { name: "DSQA", value: 830 }, { name: "TableBench", value: 913 }
        ]},
        { name: "Embodied", children: [{ name: "ALFWorld", value: 311 }] }
      ]
    },
    {
      name: "Image", mod: "Image", children: [
        { name: "Chart & Doc", children: [
          { name: "ChartQA Pro", value: 679 }, { name: "CharXiv", value: 1055 },
          { name: "EvoChart", value: 668 }, { name: "MMMU Pro", value: 107 }
        ]},
        { name: "MM Search", children: [
          { name: "MMSearch", value: 831 }, { name: "MMSearch+", value: 261 }, { name: "BrowseComp", value: 298 }
        ]},
        { name: "GUI & Web", children: [
          { name: "OSWorld", value: 628 }, { name: "WebVoyager", value: 626 }
        ]}
      ]
    },
    {
      name: "Video", mod: "Video", children: [
        { name: "Video QA", children: [{ name: "LVBench", value: 1353 }] }
      ]
    }
  ]
};

// ─── Headline leaderboard (Table 1 of paper) ───
// One unified record per model across all three modalities.
// `image`/`video` are null when the model does not support that modality
// (rendered as "—"). Best / second-best per column are computed in results.js.
const LEADERBOARD = {
  metrics: [
    { key: "agent", label: "Agent", desc: "Accuracy of identifying the responsible agent (multi-agent traces only)." },
    { key: "step",  label: "Step",  desc: "Exact-match accuracy of localizing the first decisive error step." },
    { key: "error", label: "Error", desc: "Macro-F1 over failure-mode classes." },
    { key: "joint", label: "Joint", desc: "Fraction of traces with Agent, Step and Error all correct." }
  ],
  modalities: [
    { key: "text",  label: "Text"  },
    { key: "image", label: "Image" },
    { key: "video", label: "Video" }
  ],
  rows: [
    { section: "Closed-source models" },
    { model: "GPT-5.4",           logo: "openai",
      text:  { agent: 55.7, step: 72.3, error: 15.3, joint: 21.3 },
      image: { agent: 67.7, step: 65.2, error: 26.5, joint: 30.2 },
      video: { agent: 85.1, step: 60.5, error: 33.8, joint: 21.6 } },
    { model: "Claude Sonnet 4.6", logo: "anthropic",
      text:  { agent: 54.9, step: 69.8, error: 19.1, joint: 22.4 },
      image: { agent: 67.5, step: 63.8, error: 29.5, joint: 29.6 },
      video: { agent: 79.8, step: 64.4, error: 37.4, joint: 26.4 } },
    { model: "Gemini 3 Flash",    logo: "google",
      text:  { agent: 52.1, step: 71.2, error: 16.2, joint: 17.3 },
      image: { agent: 62.5, step: 63.9, error: 26.0, joint: 29.6 },
      video: { agent: 74.4, step: 59.8, error: 40.0, joint: 23.0 } },
    { model: "Grok 4.1",          logo: "xai",
      text:  { agent: 51.1, step: 65.9, error: 18.6, joint: 19.9 },
      image: { agent: 67.7, step: 60.5, error: 21.4, joint: 26.4 },
      video: { agent: 70.1, step: 53.4, error: 36.7, joint: 23.8 } },
    { section: "Open-weight models" },
    { model: "gpt-oss-120b",      logo: "openai",
      text:  { agent: 48.4, step: 63.9, error: 10.8, joint: 16.2 },
      image: null, video: null },
    { model: "GLM-5",             logo: "zai",
      text:  { agent: 54.9, step: 71.1, error: 22.2, joint: 25.3 },
      image: null, video: null },
    { model: "DeepSeek-V4-Pro",   logo: "deepseek",
      text:  { agent: 52.0, step: 68.7, error: 16.6, joint: 17.5 },
      image: null, video: null },
    { model: "Gemma 4",           logo: "google",
      text:  { agent: 52.8, step: 68.4, error: 16.1, joint: 17.1 },
      image: { agent: 69.0, step: 62.6, error: 19.1, joint: 24.3 },
      video: { agent: 71.5, step: 58.7, error: 35.7, joint: 27.7 } },
    { model: "Llama-4 Maverick",  logo: "meta",
      text:  { agent: 51.9, step: 66.7, error: 20.6, joint: 16.5 },
      image: { agent: 61.0, step: 54.9, error: 20.6, joint: 19.0 },
      video: { agent: 79.8, step: 59.5, error: 36.4, joint: 30.4 } },
    { model: "Qwen3.5-122B",      logo: "qwen",
      text:  { agent: 57.5, step: 73.9, error: 17.0, joint: 21.6 },
      image: { agent: 70.4, step: 60.9, error: 21.8, joint: 24.5 },
      video: { agent: 74.9, step: 60.3, error: 35.2, joint: 16.1 } }
  ]
};
