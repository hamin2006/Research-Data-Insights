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

        await sqlConnection`
    INSERT INTO research_agenda_prompts (research_agenda_id, prompt_type, prompt_text, is_default)
    SELECT ${agenda_id}, 'general_rag', prompt_text, false
    FROM research_agenda_prompts 
    WHERE research_agenda_id IS NULL AND prompt_type = 'general_rag' AND is_default = true
    LIMIT 1
  `;

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

        // Get all agendas where user is owner OR collaborator
        const agendas = await sqlConnection`
    SELECT DISTINCT ra.* 
    FROM research_agenda ra
    LEFT JOIN agenda_collaborators ac ON ra.id_research_agenda = ac.research_agenda_id
    WHERE ra.user_id = ${user_id} OR ac.user_id = ${user_id}
    ORDER BY ra.id_research_agenda DESC
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
        const { document_name, file_path, upload_status } = body;

        await sqlConnection`
    INSERT INTO research_observations (research_agenda_id, document_name, file_path, upload_status)
    VALUES (${agenda_id}, ${document_name}, ${file_path}, ${upload_status}  )
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

        // Check if user is owner OR collaborator
        const accessCheck = await sqlConnection`
    SELECT ra.* FROM research_agenda ra
    LEFT JOIN agenda_collaborators ac ON ra.id_research_agenda = ac.research_agenda_id
    WHERE ra.id_research_agenda = ${agenda_id} 
    AND (ra.user_id = ${user_id} OR ac.user_id = ${user_id})
    LIMIT 1
  `;

        if (!accessCheck || accessCheck.length === 0) {
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
          ...accessCheck[0],
          context_documents: contextDocs,
          research_observations: observations,
        });
        break;
      }

      case "GET /agenda/{agenda_id}/ai-settings": {
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

        // Check if user is owner OR collaborator
        const accessCheck = await sqlConnection`
    SELECT ra.* FROM research_agenda ra
    LEFT JOIN agenda_collaborators ac ON ra.id_research_agenda = ac.research_agenda_id
    WHERE ra.id_research_agenda = ${agenda_id} 
    AND (ra.user_id = ${user_id} OR ac.user_id = ${user_id})
    LIMIT 1
  `;

        if (!accessCheck || accessCheck.length === 0) {
          throw new Error("Agenda not found or access denied");
        }

        const settings = await sqlConnection`
    SELECT hyperparameter_settings, scoring_models, scoring_method FROM research_agenda 
    WHERE id_research_agenda = ${agenda_id}
  `;

        response.body = JSON.stringify({
          ...settings[0],
        });
        break;
      }

      case "PATCH /agenda/{agenda_id}/ai-settings": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const agenda_id = event.pathParameters?.agenda_id;
        const body = JSON.parse(event.body || "{}");
        const { hyperparameter_settings, selected_models, scoring_method } =
          body;

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

        // Check if user is owner OR collaborator
        const accessCheck = await sqlConnection`
    SELECT ra.* FROM research_agenda ra
    LEFT JOIN agenda_collaborators ac ON ra.id_research_agenda = ac.research_agenda_id
    WHERE ra.id_research_agenda = ${agenda_id} 
    AND (ra.user_id = ${user_id} OR ac.user_id = ${user_id})
    LIMIT 1
  `;

        if (!accessCheck || accessCheck.length === 0) {
          throw new Error("Agenda not found or access denied");
        }

        await sqlConnection`
          UPDATE research_agenda 
          SET hyperparameter_settings = ${hyperparameter_settings},
              scoring_models = ${selected_models},
              scoring_method = ${scoring_method}
          WHERE id_research_agenda = ${agenda_id}
        `;

        response.body = JSON.stringify({
          message: "AI settings updated successfully",
          hyperparameter_settings,
        });
        break;
      }

      case "GET /agenda/{agenda_id}/collaborators": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const agenda_id = event.pathParameters?.agenda_id;

        if (!cognito_id) {
          throw new Error("Missing user ID");
        }

        const collaborators = await sqlConnection`
    SELECT ac.*, u.first_name, u.last_name, u.user_email, u.roles,
           added_by_user.first_name as added_by_first_name, 
           added_by_user.last_name as added_by_last_name
    FROM agenda_collaborators ac
    JOIN users u ON ac.user_id = u.user_id
    LEFT JOIN users added_by_user ON ac.added_by = added_by_user.user_id
    WHERE ac.research_agenda_id = ${agenda_id}
    ORDER BY ac.added_at DESC
  `;

        response.body = JSON.stringify(collaborators);
        break;
      }

      case "POST /agenda/{agenda_id}/collaborators": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const agenda_id = event.pathParameters?.agenda_id;
        const body = JSON.parse(event.body || "{}");
        const { user_email } = body;

        if (!cognito_id || !user_email) {
          throw new Error("Missing required fields");
        }

        // Get the user who is adding the collaborator
        const adderRow = await sqlConnection`
    SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
  `;

        // Get the user to be added as collaborator
        const userRow = await sqlConnection`
    SELECT user_id FROM users WHERE user_email = ${user_email}
  `;

        if (!userRow || userRow.length === 0) {
          throw new Error("User not found");
        }

        const result = await sqlConnection`
    INSERT INTO agenda_collaborators (research_agenda_id, user_id, added_by)
    VALUES (${agenda_id}, ${userRow[0].user_id}, ${adderRow[0].user_id})
    RETURNING *
  `;

        response.body = JSON.stringify(result[0]);
        break;
      }

      case "DELETE /agenda/{agenda_id}/collaborators/{collaborator_id}": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const agenda_id = event.pathParameters?.agenda_id;
        const collaborator_id = event.pathParameters?.collaborator_id;

        if (!cognito_id) {
          throw new Error("Missing user ID");
        }

        await sqlConnection`
    DELETE FROM agenda_collaborators 
    WHERE id_agenda_collaborator = ${collaborator_id} AND research_agenda_id = ${agenda_id}
  `;

        response.body = JSON.stringify({
          message: "Collaborator removed successfully",
        });
        break;
      }

      // Add these cases to your switch statement:

      case "GET /agenda/{agenda_id}/sessions": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const agenda_id = event.pathParameters?.agenda_id;

        if (!cognito_id) {
          throw new Error("Missing user ID");
        }

        const userRow = await sqlConnection`
    SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
  `;

        const sessions = await sqlConnection`
    SELECT id_chat_session, session_name, created_at, updated_at
    FROM chat_sessions 
    WHERE research_agenda_id = ${agenda_id} AND user_id = ${userRow[0].user_id}
    ORDER BY updated_at DESC
  `;

        response.body = JSON.stringify(sessions);
        break;
      }

      case "POST /agenda/{agenda_id}/sessions": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const agenda_id = event.pathParameters?.agenda_id;
        const body = JSON.parse(event.body || "{}");
        const { session_name } = body;

        const userRow = await sqlConnection`
    SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
  `;

        const result = await sqlConnection`
    INSERT INTO chat_sessions (research_agenda_id, user_id, session_name)
    VALUES (${agenda_id}, ${userRow[0].user_id}, ${session_name})
    RETURNING id_chat_session, session_name, created_at
  `;

        response.body = JSON.stringify(result[0]);
        break;
      }

      case "DELETE /agenda/{agenda_id}": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const agenda_id = event.pathParameters?.agenda_id;

        if (!cognito_id) {
          throw new Error("Missing user ID");
        }

        // Get user_id and verify ownership
        const userRow = await sqlConnection`
    SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
  `;

        if (!userRow || userRow.length === 0) {
          throw new Error("User not found");
        }

        const user_id = userRow[0].user_id;

        // Verify user owns the agenda
        const agendaCheck = await sqlConnection`
    SELECT id_research_agenda FROM research_agenda 
    WHERE id_research_agenda = ${agenda_id} AND user_id = ${user_id}
  `;

        if (!agendaCheck || agendaCheck.length === 0) {
          throw new Error("Agenda not found or access denied");
        }

        // Delete in correct order to avoid foreign key violations
        await sqlConnection`DELETE FROM user_interactions WHERE research_agenda_id = ${agenda_id}`;
        await sqlConnection`DELETE FROM chat_sessions WHERE research_agenda_id = ${agenda_id}`;
        await sqlConnection`DELETE FROM context_documents WHERE research_agenda_id = ${agenda_id}`;
        await sqlConnection`DELETE FROM research_observations WHERE research_agenda_id = ${agenda_id}`;
        await sqlConnection`DELETE FROM agenda_collaborators WHERE research_agenda_id = ${agenda_id}`;
        await sqlConnection`DELETE FROM research_agenda_prompts WHERE research_agenda_id = ${agenda_id}`;
        await sqlConnection`DELETE FROM research_agenda WHERE id_research_agenda = ${agenda_id}`;

        response.body = JSON.stringify({
          message: "Agenda deleted successfully",
        });
        break;
      }

      case "GET /agenda/{agenda_id}/sessions/{session_id}/messages": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const { agenda_id, session_id } = event.pathParameters;

        const userRow = await sqlConnection`
    SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
  `;

        const interactions = await sqlConnection`
    SELECT ui.query_text, ui.response_text, ui.timestamp
    FROM user_interactions ui
    JOIN chat_sessions cs ON ui.chat_session_id = cs.id_chat_session
    WHERE cs.id_chat_session = ${session_id} 
    AND cs.user_id = ${userRow[0].user_id} 
    AND cs.research_agenda_id = ${agenda_id}
    ORDER BY ui.timestamp ASC
  `;

        const messages = [];
        interactions.forEach((row, index) => {
          messages.push({
            id: index * 2 + 1,
            content: row.query_text,
            sender: "user",
            timestamp: row.timestamp,
          });
          if (row.response_text) {
            messages.push({
              id: index * 2 + 2,
              content: row.response_text,
              sender: "ai",
              timestamp: row.timestamp,
            });
          }
        });

        response.body = JSON.stringify(messages);
        break;
      }

      case "GET /agenda/{agenda_id}/research-observation/{observation_id}/individual-responses": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const { agenda_id, observation_id } = event.pathParameters;

        if (!cognito_id) {
          throw new Error("Missing user ID");
        }

        if (!agenda_id || !observation_id) {
          throw new Error("Missing agenda ID or observation ID");
        }

        // Get user_id
        const userRow = await sqlConnection`
          SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
        `;

        if (!userRow || userRow.length === 0) {
          throw new Error("User not found in users table");
        }

        const user_id = userRow[0].user_id;

        // Check if user has access to the agenda (owner or collaborator)
        const accessCheck = await sqlConnection`
          SELECT ra.* FROM research_agenda ra
          LEFT JOIN agenda_collaborators ac ON ra.id_research_agenda = ac.research_agenda_id
          WHERE ra.id_research_agenda = ${agenda_id} 
          AND (ra.user_id = ${user_id} OR ac.user_id = ${user_id})
          LIMIT 1
        `;

        if (!accessCheck || accessCheck.length === 0) {
          throw new Error("Agenda not found or access denied");
        }

        // Verify the observation belongs to this agenda
        const observationCheck = await sqlConnection`
          SELECT id_research_observations FROM research_observations 
          WHERE id_research_observations = ${observation_id} 
          AND research_agenda_id = ${agenda_id}
        `;

        if (!observationCheck || observationCheck.length === 0) {
          throw new Error(
            "Research observation not found or doesn't belong to this agenda"
          );
        }

        // Get all individual responses for this observation
        const individualResponses = await sqlConnection`
          SELECT 
            ir.id_individual_response,
            ir.observation_id,
            ir.research_agenda_id,
            ir.response_text,
            ir.response_order,
            ir.score,
            ir.metadata,
            ir.created_at,
            ir.updated_at,
            ir.file_path,
            ro.document_name,
            ro.metric_score as observation_metric_score
          FROM individual_responses ir
          INNER JOIN research_observations ro 
            ON ir.observation_id = ro.id_research_observations
          WHERE ir.observation_id = ${observation_id}
          ORDER BY ir.created_at ASC, ir.response_order ASC
        `;

        response.body = JSON.stringify(individualResponses);
        break;
      }

      case "DELETE /agenda/{agenda_id}/context-document/{context_document_id}": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const { agenda_id, context_document_id } = event.pathParameters;

        if (!cognito_id) {
          throw new Error("Missing user ID");
        }

        if (!agenda_id || !context_document_id) {
          throw new Error("Missing agenda ID or context document ID");
        }

        // Get user_id
        const userRow = await sqlConnection`
          SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
        `;

        if (!userRow || userRow.length === 0) {
          throw new Error("User not found in users table");
        }

        const user_id = userRow[0].user_id;

        // Check if user has access to the agenda (owner or collaborator)
        const accessCheck = await sqlConnection`
          SELECT ra.* FROM research_agenda ra
          LEFT JOIN agenda_collaborators ac ON ra.id_research_agenda = ac.research_agenda_id
          WHERE ra.id_research_agenda = ${agenda_id} 
          AND (ra.user_id = ${user_id} OR ac.user_id = ${user_id})
          LIMIT 1
        `;

        if (!accessCheck || accessCheck.length === 0) {
          throw new Error("Agenda not found or access denied");
        }

        // Verify the context document belongs to this agenda and delete it
        const deleteResult = await sqlConnection`
          DELETE FROM context_documents 
          WHERE id_context_doc = ${context_document_id} 
          AND research_agenda_id = ${agenda_id}
          RETURNING id_context_doc
        `;

        if (!deleteResult || deleteResult.length === 0) {
          throw new Error(
            "Context document not found or doesn't belong to this agenda"
          );
        }

        response.body = JSON.stringify({
          message: "Context document deleted successfully",
          deleted_id: context_document_id,
        });
        break;
      }

      case "DELETE /agenda/{agenda_id}/research-observation/{observation_id}": {
        const cognito_id = event.requestContext?.authorizer?.userId;
        const { agenda_id, observation_id } = event.pathParameters;

        if (!cognito_id) {
          throw new Error("Missing user ID");
        }

        if (!agenda_id || !observation_id) {
          throw new Error("Missing agenda ID or observation ID");
        }

        // Get user_id
        const userRow = await sqlConnection`
          SELECT user_id FROM users WHERE cognito_id = ${cognito_id}
        `;

        if (!userRow || userRow.length === 0) {
          throw new Error("User not found in users table");
        }

        const user_id = userRow[0].user_id;

        // Check if user has access to the agenda (owner or collaborator)
        const accessCheck = await sqlConnection`
          SELECT ra.* FROM research_agenda ra
          LEFT JOIN agenda_collaborators ac ON ra.id_research_agenda = ac.research_agenda_id
          WHERE ra.id_research_agenda = ${agenda_id} 
          AND (ra.user_id = ${user_id} OR ac.user_id = ${user_id})
          LIMIT 1
        `;

        if (!accessCheck || accessCheck.length === 0) {
          throw new Error("Agenda not found or access denied");
        }

        // Delete related individual responses first (cascade)
        await sqlConnection`
          DELETE FROM individual_responses 
          WHERE observation_id = ${observation_id}
        `;

        // Verify the research observation belongs to this agenda and delete it
        const deleteResult = await sqlConnection`
          DELETE FROM research_observations 
          WHERE id_research_observations = ${observation_id} 
          AND research_agenda_id = ${agenda_id}
          RETURNING id_research_observations
        `;

        if (!deleteResult || deleteResult.length === 0) {
          throw new Error(
            "Research observation not found or doesn't belong to this agenda"
          );
        }

        response.body = JSON.stringify({
          message: "Research observation deleted successfully",
          deleted_id: observation_id,
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
