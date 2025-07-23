const { initializeConnection } = require("./initializeConnection.js");
const { CognitoIdentityProviderClient, AdminGetUserCommand, AdminAddUserToGroupCommand } = require("@aws-sdk/client-cognito-identity-provider");

const { SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT } = process.env;
let sqlConnection = global.sqlConnection;

exports.handler = async (event) => {
  if (!sqlConnection) {
    await initializeConnection(SM_DB_CREDENTIALS, RDS_PROXY_ENDPOINT);
    sqlConnection = global.sqlConnection;
  }

  const { userName, userPoolId } = event;
  const client = new CognitoIdentityProviderClient();

  try {
    // Get user attributes from Cognito to retrieve the email
    const getUserCommand = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: userName,
    });
    const userAttributesResponse = await client.send(getUserCommand);

    const emailAttr = userAttributesResponse.UserAttributes.find(
      (attr) => attr.Name === "email"
    );
    
    if (!emailAttr) {
      console.error("Email attribute missing from Cognito");
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Email attribute not found in Cognito user",
        }),
      };
    }
    
    const email = emailAttr.Value;

    // Retrieve role from the database
    const dbUser = await sqlConnection`
      SELECT role FROM "users" WHERE email = ${email};
    `;

    const dbRole = dbUser[0]?.role || [];

    // Determine the new Cognito group based on the role
    const newGroupName = dbRole.length > 0 ? dbRole[0] : "member";

    // Add the user to the new group without removing existing groups
    const addUserToGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: userName,
      GroupName: newGroupName,
    });
    await client.send(addUserToGroupCommand);

    return event;
  } catch (err) {
    console.error("Error assigning user to group:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Internal Server Error",
      }),
    };
  }
};