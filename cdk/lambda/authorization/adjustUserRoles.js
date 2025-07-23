const { initializeConnection } = require("./initializeConnection.js");
const { CognitoIdentityProviderClient, AdminListGroupsForUserCommand, AdminGetUserCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand } = require("@aws-sdk/client-cognito-identity-provider");
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
    const cognitoRoles = userGroupsResponse.Groups.map(group => group.GroupName);

    // Get user attributes
    const userAttributesCommand = new AdminGetUserCommand({
      UserPoolId: userPoolId,
      Username: userName,
    });
    const userAttributesResponse = await client.send(userAttributesCommand);

    const emailAttr = userAttributesResponse.UserAttributes.find(attr => attr.Name === 'email');
    const email = emailAttr ? emailAttr.Value : null;

    // Retrieve roles from the database
    const dbUser = await sqlConnection`
      SELECT role FROM "users"
      WHERE email = ${email};
    `;
    
    const dbRole = dbUser[0]?.role || [];

    // Handle role synchronization between Cognito and DB
    if (cognitoRoles.includes('admin')) {
      // If Cognito has admin, make sure DB is also admin
      if (!dbRole.includes('admin')) {
        await sqlConnection`
          UPDATE "users"
          SET role = array_append(roles, 'admin')
          WHERE email = ${email};
        `;
        console.log('DB role updated to include admin');
      }
    } else if (cognitoRoles.some(role => ['member'].includes(role))) {
      const cognitoNonAdminRole = cognitoRoles.find(role => ['member'].includes(role));
      
      if (dbRole.includes('admin')) {
        // If DB has admin but Cognito is not admin, update DB role to match Cognito
        await sqlConnection`
          UPDATE "users"
          SET role = ${[cognitoNonAdminRole]}
          WHERE email = ${email};
        `;
      } else if (dbRole.length && dbRole[0] !== cognitoNonAdminRole) {
        // If DB role doesn't match Cognito and isn't admin, update Cognito to match DB
        const removeFromGroupCommand = new AdminRemoveUserFromGroupCommand({
          UserPoolId: userPoolId,
          Username: userName,
          GroupName: cognitoNonAdminRole,
        });
        const addToGroupCommand = new AdminAddUserToGroupCommand({
          UserPoolId: userPoolId,
          Username: userName,
          GroupName: dbRole[0],
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