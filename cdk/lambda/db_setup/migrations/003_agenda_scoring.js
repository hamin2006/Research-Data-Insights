exports.up = (pgm) => {
  pgm.addColumn("research_agenda", {
    scoring_models: {
      type: "jsonb",
      default: '["meta.llama3-8b-instruct-v1:0"]',
    },
    scoring_method: {
      type: "text",
      default: "Mean",
    },
  });
};
