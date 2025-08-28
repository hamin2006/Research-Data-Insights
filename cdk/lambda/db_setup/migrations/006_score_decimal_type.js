exports.up = (pgm) => {
  pgm.sql(`
      ALTER TABLE individual_responses ALTER COLUMN score TYPE DECIMAL(5,2);
    `);
};
