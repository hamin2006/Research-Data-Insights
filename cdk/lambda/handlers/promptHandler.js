const { initializeConnection } = require("./initializeConnection");
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;

let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
    },
    body: "",
  };

  if (!sqlConnection) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }

  try {
    const pathData = event.httpMethod + " " + event.resource;
    const cognito_id = event.requestContext?.authorizer?.userId;

    if (!cognito_id) {
      throw new Error("Missing user ID");
    }

    switch (pathData) {
      case "GET /agenda/{agenda_id}/prompts": {
        const agenda_id = event.pathParameters?.agenda_id;
        
        const prompts = await sqlConnection`
          SELECT * FROM research_agenda_prompts 
          WHERE research_agenda_id = ${agenda_id}
          ORDER BY prompt_type, created_at DESC
        `;

        response.body = JSON.stringify(prompts);
        break;
      }

      case "POST /agenda/{agenda_id}/prompts": {
        const agenda_id = event.pathParameters?.agenda_id;
        const body = JSON.parse(event.body || "{}");
        const { prompt_type, prompt_text, is_default = false } = body;

        if (!prompt_type || !prompt_text) {
          throw new Error("Missing required fields: prompt_type or prompt_text");
        }

        const result = await sqlConnection`
          INSERT INTO research_agenda_prompts (research_agenda_id, prompt_type, prompt_text, is_default)
          VALUES (${agenda_id}, ${prompt_type}, ${prompt_text}, ${is_default})
          RETURNING *
        `;

        response.body = JSON.stringify(result[0]);
        break;
      }

      case "PUT /agenda/{agenda_id}/prompts/{prompt_id}": {
        const agenda_id = event.pathParameters?.agenda_id;
        const prompt_id = event.pathParameters?.prompt_id;
        const body = JSON.parse(event.body || "{}");
        const { prompt_text, is_default } = body;

        const result = await sqlConnection`
          UPDATE research_agenda_prompts 
          SET prompt_text = ${prompt_text}, is_default = ${is_default}, updated_at = now()
          WHERE id_research_agenda_prompt = ${prompt_id} AND research_agenda_id = ${agenda_id}
          RETURNING *
        `;

        response.body = JSON.stringify(result[0]);
        break;
      }

      case "DELETE /agenda/{agenda_id}/prompts/{prompt_id}": {
        const agenda_id = event.pathParameters?.agenda_id;
        const prompt_id = event.pathParameters?.prompt_id;

        await sqlConnection`
          DELETE FROM research_agenda_prompts 
          WHERE id_research_agenda_prompt = ${prompt_id} AND research_agenda_id = ${agenda_id}
        `;

        response.body = JSON.stringify({ message: "Prompt deleted successfully" });
        break;
      }

      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 400;
    response.headers = {
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
    };
    response.body = JSON.stringify(error.message);
  }

  return response;
};
