exports.up = (pgm) => {
  pgm.addColumn("research_agenda", {
    hyperparameter_settings: {
      type: "jsonb",
      default: '{ "temperature": 0.4, "topP": 0.95, "topK": 50}',
    },
  });
};
