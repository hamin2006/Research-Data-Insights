const { initializeConnection } = require("./initializeConnection.js");
const {
  CognitoIdentityProviderClient,
  AdminListGroupsForUserCommand,
  AdminGetUserCommand,
  AdminAddUserToGroupCommand,
  AdminRemoveUserFromGroupCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
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
    // Get user groups from Cognito
    const userGroupsCommand = new AdminListGroupsForUserCommand({
      UserPoolId: userPoolId,
      Username: userName,
    });
    const userGroupsResponse = await client.send(userGroupsCommand);
    const cognitoRoles = userGroupsResponse.Groups.map(
      (group) => group.GroupName
    );

    // Get user attributes
    const userAttributesCommand = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: userName,
    });
    const userAttributesResponse = await client.send(userAttributesCommand);

    const emailAttr = userAttributesResponse.UserAttributes.find(
      (attr) => attr.Name === "email"
    );
    const email = emailAttr ? emailAttr.Value : null;

    // Retrieve roles from the database
    const dbUser = await sqlConnection`
      SELECT roles FROM "users"
      WHERE user_email = ${email};
    `;

    const dbRoles = dbUser[0]?.roles || [];

    // Handle role synchronization between Cognito and DB
    if (cognitoRoles.includes("admin") || cognitoRoles.includes("researcher")) {
      // If Cognito has admin or researcher, make sure DB matches
      const roleToSync = cognitoRoles.includes("admin")
        ? "admin"
        : "researcher";

      if (!dbRoles.includes(roleToSync)) {
        await sqlConnection`
          UPDATE "users"
          SET roles = array_append(roles, ${roleToSync})
          WHERE user_email = ${email};
        `;
        console.log(`DB role updated to include ${roleToSync}`);
      }
    } else if (cognitoRoles.some((role) => ["member"].includes(role))) {
      const cognitoNonPrivilegedRole = cognitoRoles.find((role) =>
        ["member"].includes(role)
      );

      if (dbRoles.includes("admin") || dbRoles.includes("researcher")) {
        // If DB has privileged role but Cognito doesn't, update DB role to match Cognito
        await sqlConnection`
          UPDATE "users"
          SET roles = ${[cognitoNonPrivilegedRole]}
          WHERE user_email = ${email};
        `;
      } else if (dbRoles.length && dbRoles[0] !== cognitoNonPrivilegedRole) {
        // If DB role doesn't match Cognito and isn't privileged, update Cognito to match DB
        const removeFromGroupCommand = new AdminRemoveUserFromGroupCommand({
          UserPoolId: userPoolId,
          Username: userName,
          GroupName: cognitoNonPrivilegedRole,
        });
        const addToGroupCommand = new AdminAddUserToGroupCommand({
          UserPoolId: userPoolId,
          Username: userName,
          GroupName: dbRoles[0],
        });

        await client.send(removeFromGroupCommand);
        await client.send(addToGroupCommand);
      }
    }

    return event;
  } catch (err) {
    console.error(err);
    return event;
  }
};
