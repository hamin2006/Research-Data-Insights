#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DatabaseStack } from "../stacks/database-stack";
import { VpcStack } from "../stacks/vpc-stack";
import { ApiGatewayStack } from "../stacks/api-stack";
import { DBFlowStack } from "../stacks/dbFlow-stack";
import { Aspects } from "aws-cdk-lib";
import { AmplifyStack } from "../stacks/amplify-stack";
import { CICDStack } from "../stacks/cicd-stack";
const app = new cdk.App();
// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true })); // Uncomment this line to enable AWS Solutions checks

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const StackPrefix = app.node.tryGetContext("StackPrefix");
const environment = app.node.tryGetContext("environmentName");
const version = app.node.tryGetContext("versionNumber");
const githubRepo = app.node.tryGetContext("githubRepo");

const vpcStack = new VpcStack(app, `${StackPrefix}-VpcStack`, {
  env,
  stackPrefix: StackPrefix,
});
const dbStack = new DatabaseStack(app, `${StackPrefix}-Database`, vpcStack, {
  env,
});
const cicdStack = new CICDStack(app, `${StackPrefix}-CICD`, {
  env,
  githubRepo: githubRepo,
  environmentName: environment,
  lambdaFunctions: [
    {
      name: "dataIngestion",
      functionName: `${StackPrefix}-Api-DataIngestionLambdaDockerFunc`,
      sourceDir: "cdk/lambda/data_ingestion",
    },
    {
      name: "textGeneration",
      functionName: `${StackPrefix}-Api-TextGenLambdaDockerFunction`,
      sourceDir: "cdk/lambda/text_generation",
    },
  ],
  pathFilters: [
    "cdk/lambda/data_ingestion/**",
    "cdk/lambda/text_generation/**",
  ],
});
const apiStack = new ApiGatewayStack(
  app,
  `${StackPrefix}-Api`,
  dbStack,
  vpcStack,
  {
    env,
    ecrRepositories: cicdStack.ecrRepositories,
  }
);
const dbFlowStack = new DBFlowStack(
  app,
  `${StackPrefix}-DBFlow`,
  vpcStack,
  dbStack,
  apiStack,
  { env }
);
const amplifyStack = new AmplifyStack(app, `${StackPrefix}-Amplify`, apiStack, {
  env,
});

cdk.Tags.of(app).add("app", "Research-Data-Insights");
