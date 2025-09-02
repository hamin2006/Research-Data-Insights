// const { v4: uuidv4 } = require('uuid')
const { initializeConnection } = require("./initializeConnection");
let { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT, USER_POOL, MESSAGE_LIMIT } =
  process.env;
const {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

// SQL conneciton from global variable at lib.js
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  console.log(event);
  const cognito_id =
    event.requestContext?.authorizer?.userId ||
    event.queryStringParameters?.user_id ||
    null;

  // Check if cognito_id exists before proceeding
  if (!cognito_id) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify({ error: "Missing user ID" }),
    };
  }

  const client = new CognitoIdentityProviderClient();
  const userAttributesCommand = new AdminGetUserCommand({
    UserPoolId: USER_POOL,
    Username: cognito_id,
  });
  const userAttributesResponse = await client.send(userAttributesCommand);

  const emailAttr = userAttributesResponse.UserAttributes.find(
    (attr) => attr.Name === "email"
  );
  const userEmailAttribute = emailAttr ? emailAttr.Value : null;
  // Check for query string parameters

  const queryStringParams = event.queryStringParameters || {};
  const queryEmail = queryStringParams.email;
  const studentEmail = queryStringParams.student_email;
  const userEmail = queryStringParams.user_email;

  const isUnauthorized =
    (queryEmail && queryEmail !== userEmailAttribute) ||
    (studentEmail && studentEmail !== userEmailAttribute) ||
    (userEmail && userEmail !== userEmailAttribute);

  if (isUnauthorized) {
    return {
      statusCode: 401,
      headers: {
        "Access-Control-Allow-Headers":
          "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

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

  // Function to format student full names (lowercase and spaces replaced with "_")
  const formatNames = (name) => {
    return name.toLowerCase().replace(/\s+/g, "_");
  };

  let data;
  try {
    const pathData = event.httpMethod + " " + event.resource;
    switch (pathData) {
      case "POST /user":
        if (event.body) {
          // Parse the JSON body
          const bodyParams = JSON.parse(event.body);
          const { user_email, username, first_name, last_name } = bodyParams;

          const cognitoUserId = event.requestContext.authorizer.userId;
          console.log(event);

          try {
            // Check if the user already exists
            const existingUser = await sqlConnection`
                SELECT * FROM "users"
                WHERE cognito_id = ${cognitoUserId};
            `;

            if (existingUser.length > 0) {
              // Update the existing user's information
              const updatedUser = await sqlConnection`
                    UPDATE "users"
                    SET
                        username = ${username},
                        last_sign_in = CURRENT_TIMESTAMP,
                        time_account_created = CURRENT_TIMESTAMP
                    WHERE cognito_id = ${cognitoUserId}
                    RETURNING *;
                `;
              response.body = JSON.stringify(updatedUser[0]);
            } else {
              // Insert a new user with 'member' role
              console.log("Trying to create A new User");
              console.log(first_name, last_name, user_email, username);
              const newUser = await sqlConnection`
                INSERT INTO "users" (cognito_id, user_email, username, first_name, last_name, time_account_created, roles, last_sign_in)
                VALUES (${cognitoUserId}, ${user_email}, ${username}, ${first_name}, ${last_name}, CURRENT_TIMESTAMP, ARRAY['member'], CURRENT_TIMESTAMP)
                RETURNING *;
              `;

              response.body = JSON.stringify(newUser[0]);
              console.log(newUser);
            }
          } catch (err) {
            response.statusCode = 500;
            console.log(err);
            response.body = JSON.stringify({ error: "Internal server error" });
          }
        } else {
          response.statusCode = 400;
          response.body = JSON.stringify({ error: "User data is required" });
        }
        break;
      case "GET /users":
        try {
          const users = await sqlConnection`
            SELECT * FROM "users"
            ORDER BY time_account_created DESC;
          `;

          response.body = JSON.stringify(users);
        } catch (err) {
          response.statusCode = 500;
          console.log(err);
          response.body = JSON.stringify({ error: "Error retrieving users" });
        }
        break;
      case "GET /user":
        try {
          const user = await sqlConnection`
          SELECT * FROM "users"
          WHERE cognito_id = ${cognito_id};
        `;

          if (user.length === 0) {
            response.statusCode = 404;
            response.body = JSON.stringify({ error: "User not found" });
          } else {
            response.body = JSON.stringify(user[0]);
          }
        } catch (err) {
          response.statusCode = 500;
          console.log(err);
          response.body = JSON.stringify({ error: "Error retrieving user" });
        }
        break;

      case "PATCH /user/{cognito_id}":
        try {
          // Get the target user's cognito_id from path parameters
          const targetCognitoId = event.pathParameters?.cognito_id;

          if (!targetCognitoId) {
            response.statusCode = 400;
            response.body = JSON.stringify({
              error: "Missing cognito_id in path",
            });
            break;
          }

          // Get the user to check if they exist
          const userToUpdate = await sqlConnection`
          SELECT * FROM "users"
          WHERE cognito_id = ${targetCognitoId};
        `;

          console.log(userToUpdate);

          if (userToUpdate.length === 0) {
            response.statusCode = 404;
            response.body = JSON.stringify({ error: "User not found" });
            break;
          }

          // Parse the request body
          const body = JSON.parse(event.body || "{}");
          const { action } = body;

          if (!action || (action !== "add" && action !== "remove")) {
            response.statusCode = 400;
            response.body = JSON.stringify({
              error: "Action must be 'add' or 'remove'",
            });
            break;
          }

          let updatedUser;

          if (action === "add") {
            const userRoles = userToUpdate[0].roles || [];

            if (!userRoles.includes("researcher")) {
              userRoles.push("researcher");
            }

            updatedUser = await sqlConnection`
              UPDATE "users"
              SET roles = ${userRoles}
              WHERE cognito_id = ${targetCognitoId}
              RETURNING *;
            `;
          } else {
            // Remove researcher role if present
            updatedUser = await sqlConnection`
        UPDATE "users"
        SET roles = array_remove(roles, 'researcher')
        WHERE cognito_id = ${targetCognitoId}
        RETURNING *;
      `;
          }

          response.body = JSON.stringify(updatedUser[0]);
        } catch (err) {
          response.statusCode = 500;
          console.log(err);
          response.body = JSON.stringify({ error: "Error updating user role" });
        }
        break;

      default:
        throw new Error(`Unsupported route: "${pathData}"`);
    }
  } catch (error) {
    response.statusCode = 400;
    console.log(error);
    response.body = JSON.stringify(error.message);
  }
  console.log(response);

  return response;
};
