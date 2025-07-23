const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { CognitoJwtVerifier } = require("aws-jwt-verify");

const secretsManager = new SecretsManagerClient();
let { SM_COGNITO_CREDENTIALS } = process.env;

const responseStruct = {
    "principalId": "yyyyyyyy",
    "policyDocument": {
        "Version": "2012-10-17",
        "Statement": []
    },
    "context": {}
};

let jwtVerifier;

async function initializeConnection() {
    try {
        const getSecretValueCommand = new GetSecretValueCommand({ SecretId: SM_COGNITO_CREDENTIALS });
        const secretResponse = await secretsManager.send(getSecretValueCommand);
        const credentials = JSON.parse(secretResponse.SecretString);

        jwtVerifier = CognitoJwtVerifier.create({
            userPoolId: credentials.VITE_COGNITO_USER_POOL_ID,
            tokenUse: "id",
            groups: ['admin', 'techadmin'],
            clientId: credentials.VITE_COGNITO_USER_POOL_CLIENT_ID,
        });
    } catch (error) {
        console.error("Error initializing JWT verifier:", error);
        throw new Error("Failed to initialize JWT verifier");
    }
}

exports.handler = async (event) => {
    if (!jwtVerifier) {
        await initializeConnection();
    }

    const accessToken = event.authorizationToken.toString();

    try {
        const payload = await jwtVerifier.verify(accessToken);
        const parts = event.methodArn.split('/');
        const resource = parts.slice(0, 2).join('/') + '*';
        
        responseStruct["principalId"] = payload.sub;
        responseStruct["policyDocument"]["Statement"].push({
            "Action": "execute-api:Invoke",
            "Effect": "Allow",
            "Resource": resource
        });
        responseStruct["context"] = {
            "userId": payload.sub
        };

        return responseStruct;
    } catch (error) {
        console.error("Authorization error:", error);
        throw new Error("Unauthorized");
    }
};