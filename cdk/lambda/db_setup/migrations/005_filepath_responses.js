exports.up = (pgm) => {
  pgm.addColumn("individual_responses", {
    file_path: {
      type: "text",
    },
  });
};
