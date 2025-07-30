// const { v4: uuidv4 } = require('uuid')
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT, USER_POOL, MESSAGE_LIMIT } =
  process.env;
const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { initializeConnection } = require("./initializeConnection");

// SQL conneciton from global variable at lib.js
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  console.log(event);

  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
    },
    body: "",
  };

  // Initialize the database connection if not already initialized
  if (!sqlConnection) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }

  let data;
  try {
    const pathData = event.httpMethod + " " + event.resource;
    switch (pathData) {
      case "POST /agenda": {
        const body = JSON.parse(event.body || "{}");
        const {
          agenda_name,
          metric_name,
          metric_description,
          cognito_id,
          context_documents = [],
          research_observations = [],
        } = body;

        if (!agenda_name || !metric_name) {
          throw new Error(
            "Missing required fields: agenda_name or metric_name"
          );
        }

        // Get user_id
        const userRow = await sqlConnection`
          SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
        `;

        if (!userRow || userRow.length === 0) {
          throw new Error("User not found in users table");
        }

        const user_id = userRow[0].user_id;

        // Insert agenda
        const agendaResult = await sqlConnection`
          INSERT INTO research_agenda (user_id, agenda_name, metric_name, metric_description)
          VALUES (${user_id}, ${agenda_name}, ${metric_name}, ${metric_description})
          RETURNING id_research_agenda
        `;

        const agenda_id = agendaResult[0].id_research_agenda;

        // Insert context documents
        for (const doc of context_documents) {
          const { document_name, file_path, description } = doc;
          if (!document_name || !file_path) continue;

          await sqlConnection`
            INSERT INTO context_documents (research_agenda_id, document_name, file_path, description)
            VALUES (${agenda_id}, ${document_name}, ${file_path}, ${description})
          `;
        }

        // Insert research observations
        for (const obs of research_observations) {
          const { document_name, file_path } = obs;
          if (!document_name || !file_path) continue;

          await sqlConnection`
          INSERT INTO research_observations (research_agenda_id, document_name, file_path)
          VALUES (${agenda_id}, ${document_name}, ${file_path})
        `;
        }

        response.statusCode = 200;
        response.body = JSON.stringify({
          message:
            "Agenda, context documents, and observations saved successfully",
          agenda_id,
          context_docs_inserted: context_documents.length,
          observations_inserted: research_observations.length,
        });
        break;
      }

      case "GET /agendas": {
        const cognito_id = event.requestContext?.authorizer?.userId;

        if (!cognito_id) {
          throw new Error("Missing user ID");
        }

        // Get user_id
        const userRow = await sqlConnection`
    SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
  `;

        if (!userRow || userRow.length === 0) {
          throw new Error("User not found in users table");
        }

        const user_id = userRow[0].user_id;

        // Get all agendas for the user
        const agendas = await sqlConnection`
    SELECT * FROM research_agenda WHERE user_id = ${user_id}
    ORDER BY id_research_agenda DESC
  `;

        response.body = JSON.stringify(agendas);
        break;
      }

      case "POST /agenda/{agenda_id}/context-document": {
        const agenda_id = event.pathParameters?.agenda_id;
        const body = JSON.parse(event.body || "{}");
        const { document_name, file_path, description, upload_status } = body;

        await sqlConnection`
    INSERT INTO context_documents (research_agenda_id, document_name, file_path, description, upload_status)
    VALUES (${agenda_id}, ${document_name}, ${file_path}, ${description}, ${upload_status})
  `;

        response.body = JSON.stringify({ message: "Document saved" });
        break;
      }
      case "POST /agenda/{agenda_id}/research-observation": {
        const agenda_id = event.pathParameters?.agenda_id;
        const body = JSON.parse(event.body || "{}");
        const { document_name, file_path } = body;

        await sqlConnection`
    INSERT INTO research_observations (research_agenda_id, document_name, file_path)
    VALUES (${agenda_id}, ${document_name}, ${file_path})
  `;

        response.body = JSON.stringify({ message: "Observation saved" });
        break;
      }

      case "GET /agenda/{agenda_id}": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const agenda_id = event.pathParameters?.agenda_id;

        if (!cognito_id) {
          throw new Error("Missing user ID");
        }

        if (!agenda_id) {
          throw new Error("Missing agenda ID");
        }

        // Get user_id
        const userRow = await sqlConnection`
    SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
  `;

        if (!userRow || userRow.length === 0) {
          throw new Error("User not found in users table");
        }

        const user_id = userRow[0].user_id;

        // Get specific agenda with related documents and observations
        const agenda = await sqlConnection`
    SELECT * FROM research_agenda 
    WHERE id_research_agenda = ${agenda_id} AND user_id = ${user_id}
  `;

        if (!agenda || agenda.length === 0) {
          throw new Error("Agenda not found or access denied");
        }

        // Get context documents
        const contextDocs = await sqlConnection`
    SELECT * FROM context_documents 
    WHERE research_agenda_id = ${agenda_id}
  `;

        // Get research observations
        const observations = await sqlConnection`
    SELECT * FROM research_observations 
    WHERE research_agenda_id = ${agenda_id}
  `;

        response.body = JSON.stringify({
          ...agenda[0],
          context_documents: contextDocs,
          research_observations: observations,
        });
        break;
      }

      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 400;
    response.headers = {
      "Access-Control-Allow-Headers":
        "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
    };
    console.log(error);
    response.body = JSON.stringify(error.message);
  }
  console.log(response);

  return response;
};
