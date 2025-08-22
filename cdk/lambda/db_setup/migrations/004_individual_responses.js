exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS "individual_responses" (
        "id_individual_response" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "observation_id" uuid REFERENCES research_observations(id_research_observations) ON DELETE CASCADE,
        "research_agenda_id" uuid REFERENCES research_agenda(id_research_agenda) ON DELETE CASCADE,
        "response_text" text NOT NULL,
        "response_order" int,
        "score" int,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp
    );
  `);
};