export interface Example {
  id: string;
  name: string;
  source: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "phases",
    name: "Inference phases",
    source: `flowchart LR
  prompt[Prompt submitted] -->|Prefill throughput| first[First output token]
  first -->|Decode throughput| last[Last output token]
`,
  },
  {
    id: "architecture",
    name: "Service architecture",
    source: `flowchart LR
  subgraph devices [Edge devices]
    mac[Macbook<br/>Pipette-client]
    iphone[iPhone<br/>Pipette-client]
    samsung[Samsung S25<br/>Pipette-client]
  end

  subgraph backend [Pipette Backend]
    mgmt[pipette-mgmt<br/>Benchmark catalog + result ingestion]
    scores[pipette-scores<br/>Stateless scoring server]
    calib[pipette-calibration<br/>Offline pipeline]
    db[(Public Benchmarks)]
  end

  mac -->|Fetch benchmark catalog| mgmt
  iphone --> mgmt
  samsung -->|Submit results| mgmt
  mgmt -.->|Send completions for scoring| scores
  scores -->|Return scored results| mgmt
  calib -.->|Publish curated eval datasets| scores
  mgmt -->|Publish benchmark results| db
`,
  },
  {
    id: "request",
    name: "Request lifecycle",
    source: `flowchart TB
  client[Client request] --> gateway[API gateway]
  gateway -->|Authenticated| router[Model router]
  gateway -.->|Rejected| err([401 returned])
  router --> a[Replica A] & b[Replica B]
  a & b --> agg[Response aggregator]
  agg -->|Stream tokens| client
`,
  },
];
