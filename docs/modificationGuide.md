# Research Data Insights - Project Modification Guide

This guide provides instructions on how to modify and extend the Research Data Insights project. The platform enables intelligent analysis of research data using Large Language Models (LLMs) and provides administrative controls for message limits and system configuration.

## Table of Contents

- [Modifying Colors and Styles](#modifying-colors-and-styles)
- [Customizing User Authentication](#customizing-user-authentication)
- [Extending the API](#extending-the-api)
- [Modifying Frontend Components](#modifying-frontend-components)
- [Configuring LLM Models](#configuring-llm-models)
- [Database Schema Changes](#database-schema-changes)
- [Message Limit Management](#message-limit-management)
- [Data Ingestion Modifications](#data-ingestion-modifications)
- [Scoring Algorithm Customization](#scoring-algorithm-customization)

## Modifying Colors and Styles

The Research Data Insights platform uses a modern CSS-in-JS approach with Tailwind CSS and custom CSS variables for theming.

### Primary Styling Configuration

The main styling configuration is located in `frontend/src/index.css`. The project uses CSS custom properties (variables) for consistent theming across light and dark modes.

**Key Color Variables (Light Mode):**

```css
/* Filepath: ./frontend/src/index.css */
:root {
  --background: oklch(1 0 0); /* Main background */
  --foreground: oklch(0.145 0 0); /* Main text color */
  --primary: oklch(0.205 0 0); /* Primary brand color */
  --primary-foreground: oklch(0.985 0 0); /* Primary text on brand */
  --secondary: oklch(0.97 0 0); /* Secondary elements */
  --accent: oklch(0.97 0 0); /* Accent elements */
  --destructive: oklch(0.577 0.245 27.325); /* Error/delete actions */
  --border: oklch(0.922 0 0); /* Border colors */
  --sidebar: oklch(0.985 0 0); /* Sidebar background */
}
```

**Dark Mode Variables:**

```css
.dark {
  --background: oklch(0.145 0 0); /* Dark background */
  --foreground: oklch(0.985 0 0); /* Light text on dark */
  --primary: oklch(0.922 0 0); /* Primary in dark mode */
  --card: oklch(0.205 0 0); /* Card backgrounds */
  --sidebar: oklch(0.205 0 0); /* Dark sidebar */
}
```

### Component-Specific Styling

Many components use Material-UI (MUI) with custom styling. For example, in the sidebar components:

```jsx
// Example from ResearcherSidebar.jsx
sx={{
  backgroundColor: activeTab === tab ? "rgba(139, 92, 246, 0.7)" : "transparent",
  color: activeTab === tab ? "white" : "text.primary",
  "&:hover": {
    backgroundColor: activeTab === tab ? "rgba(139, 92, 246, 0.8)" : "#F3F4F6",
  },
}}
```

To modify the purple accent color (139, 92, 246), update these values throughout the component files.

## Customizing User Authentication

### Modifying Cognito User Pool Configuration

The user authentication is handled by AWS Cognito. Configuration is in `cdk/stacks/api-stack.ts`:

```typescript
// Locate this section in api-stack.ts
this.userPool = new cognito.UserPool(this, `${id}-pool`, {
  userPoolName: userPoolName,
  signInAliases: {
    email: true,
  },
  selfSignUpEnabled: true,
  autoVerify: {
    email: true,
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: true,
    requireUppercase: true,
    requireDigits: true,
    requireSymbols: false,
  },
});
```

### Customizing Verification Email

To modify the user verification email, update the `userVerification` section in the UserPool configuration:

```typescript
userVerification: {
  emailSubject: "Research Data Insights - Verification Code",
  emailBody: `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .code { background: #f0f0f0; padding: 10px; font-size: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome to Research Data Insights</h1>
          <p>Your verification code is:</p>
          <div class="code">{####}</div>
        </div>
      </body>
    </html>
  `,
  emailStyle: cognito.VerificationEmailStyle.CODE,
},
```

## Extending the API

### Adding New Endpoints

1. **Create Lambda Function**: Add a new Lambda function in `cdk/lambda/handlers/` or create a new handler directory.

```javascript
// Example: cdk/lambda/handlers/newFeatureHandler.js
exports.handler = async (event) => {
  try {
    // Your logic here
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

2. **Update API Stack**: In `cdk/stacks/api-stack.ts`, add the Lambda function:

```typescript
const newFeatureLambda = new lambda.Function(this, "NewFeatureFunction", {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: "newFeatureHandler.handler",
  code: lambda.Code.fromAsset("lambda/handlers"),
  layers: [this.layerList["postgres"], this.layerList["jwt"]],
  environment: {
    RDS_PROXY_ENDPOINT: db.rdsProxyEndpoint,
    // Add other environment variables
  },
});
```

3. **Update OpenAPI Specification**: Modify `OpenAPI_Swagger_Definition.yaml`:

```yaml
paths:
  /new-feature:
    post:
      summary: New feature endpoint
      parameters:
        - name: Authorization
          in: header
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: string
      responses:
        "200":
          description: Success
      x-amazon-apigateway-integration:
        uri:
          Fn::Sub: arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${NewFeatureFunction.Arn}/invocations
        httpMethod: POST
        type: aws_proxy
```

4. **Deploy**: Run `cdk deploy` to update your infrastructure.

## Modifying Frontend Components

### Component Structure

The frontend follows a structured approach with pages and reusable components:

- `frontend/src/pages/`: Main page components
- `frontend/src/components/`: Reusable UI components
- `frontend/src/pages/Member/`: Member-specific pages
- `frontend/src/pages/Researcher/`: Researcher-specific pages

### Adding New Navigation Items

To add new navigation items, modify the appropriate navbar component:

```jsx
// In ResearcherNavbar.jsx, MemberNavbar.jsx, or AdminNavbar.jsx
const navigationItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Agendas", path: "/agendas" },
  { label: "New Feature", path: "/new-feature" }, // Add this line
];
```

### Creating New Page Components

1. Create a new component file:

```jsx
// frontend/src/pages/NewFeature.jsx
import React from "react";
import { Box, Typography } from "@mui/material";

function NewFeature() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        New Feature
      </Typography>
      {/* Your component content */}
    </Box>
  );
}

export default NewFeature;
```

2. Add routing in `App.jsx`:

```jsx
import NewFeature from "./pages/NewFeature";

// In your routing configuration
<Route path="/new-feature" element={<NewFeature />} />;
```

## Configuring LLM Models

### Changing the LLM Model

The LLM configuration is managed through AWS Systems Manager Parameter Store. To change the model:

1. **Update the Parameter in API Stack** (`cdk/stacks/api-stack.ts`):

```typescript
const bedrockLLMParameter = new ssm.StringParameter(
  this,
  "BedrockLLMParameter",
  {
    parameterName: "/RDI/BedrockLLMId",
    description: "Parameter containing the Bedrock LLM ID",
    stringValue: "mistral.mistral-large-2402-v1:0", // Change this
  }
);
```

2. **Update IAM Permissions**:

```typescript
const bedrockPolicyStatement = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ["bedrock:InvokeModel", "bedrock:InvokeEndpoint"],
  resources: [
    "arn:aws:bedrock:" +
      this.region +
      "::foundation-model/mistral.mistral-large-2402-v1:0", // Update this
    "arn:aws:bedrock:" +
      this.region +
      "::foundation-model/amazon.titan-embed-text-v2:0",
  ],
});
```

### Available Models

Common Bedrock model IDs:

- `anthropic.claude-3-sonnet-20240229-v1:0` - Claude 3 Sonnet
- `anthropic.claude-3-haiku-20240307-v1:0` - Claude 3 Haiku
- `meta.llama3-70b-instruct-v1:0` - Llama 3 70B
- `mistral.mistral-large-2402-v1:0` - Mistral Large
- `meta.llama3-70b-instruct-v1:0` - Llama 3 70B
- `amazon.titan-text-premier-v1:0` - Amazon Titan Text Premier
- `amazon.titan-text-express-v1` - Amazon Titan Text Express

### Modifying Scoring Prompts

The scoring logic is in `cdk/lambda/scoring/src/main.py`. To modify prompts:

```python
# In main.py, locate the scoring prompt
scoring_prompt = f"""
You are an expert research analyst. Score the following response based on these criteria:
- Relevance to the research question
- Depth of analysis
- Use of evidence
- Clarity of communication

Response to score: {response_text}
Research Context: {context}

Provide a score from 1-10 and brief justification.
"""
```

## Database Schema Changes

### Adding New Tables

1. **Create Migration File**: Add a new migration in `cdk/lambda/db_setup/migrations/`:

```javascript
// 007_new_feature_table.js
exports.up = async function (knex) {
  return knex.schema.createTable("new_feature", function (table) {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.text("description");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  return knex.schema.dropTable("new_feature");
};
```

2. **Update Database Stack**: The migration will run automatically on deployment.

### Modifying Existing Tables

Create a new migration file for schema changes:

```javascript
// 008_modify_existing_table.js
exports.up = async function (knex) {
  return knex.schema.alterTable("existing_table", function (table) {
    table.string("new_column");
    table.index("new_column");
  });
};

exports.down = async function (knex) {
  return knex.schema.alterTable("existing_table", function (table) {
    table.dropColumn("new_column");
  });
};
```

## Message Limit Management

The message limit feature is already implemented and allows administrators to control daily message usage through the AI Settings page.

### Existing Implementation

The message limit functionality is implemented in:

1. **Backend Handler** (`cdk/lambda/handlers/adminHandler.js`):
   - `GET /admin/message_limit` - Retrieves current message limit from SSM Parameter Store
   - `POST /admin/message_limit` - Updates the message limit value

```javascript
case "GET /admin/message_limit":
  const result = await ssm.send(
    new GetParameterCommand({ Name: process.env.MESSAGE_LIMIT })
  );
  response.body = JSON.stringify({ value: result.Parameter.Value });
  break;

case "POST /admin/message_limit":
  if (event.body) {
    const { value } = JSON.parse(event.body);
    await ssm.send(
      new PutParameterCommand({
        Name: process.env.MESSAGE_LIMIT,
        Value: String(value),
        Type: "String",
        Overwrite: true,
      })
    );
    response.body = JSON.stringify({ success: true });
  }
  break;
```

2. **Frontend Interface** (`frontend/src/pages/Admin/AISettings.jsx`):
   - Provides a slider interface for setting daily message limits (1-250)
   - Includes a checkbox for "No Message Limit" (sets value to "Infinity")
   - Displays current limit and allows real-time adjustment

### Modifying Message Limit Settings

To customize the message limit interface:

**Change the maximum limit range:**

```jsx
// In AISettings.jsx, modify the slider configuration
<Slider
  value={tempLimit || 0}
  onChange={(_, value) => setTempLimit(value)}
  min={1}
  max={500} // Change from 250 to 500
  step={1}
  marks={[
    { value: 1, label: "1" },
    { value: 100, label: "100" },
    { value: 250, label: "250" },
    { value: 500, label: "500" }, // Add new mark
  ]}
/>
```

**Add custom validation:**

```jsx
const handleSave = async () => {
  // Add custom validation
  if (!noLimit && tempLimit < 5) {
    alert("Minimum limit must be at least 5 messages");
    return;
  }

  // Existing save logic...
};
    };
  }
};
```

### Accessing the Message Limit Interface

The message limit management interface is already available in the admin panel:

1. **Navigate to AI Settings**: Go to `/admin/ai-settings` or access through the admin navigation
2. **Adjust Daily Limits**: Use the slider to set limits between 1-250 messages per day
3. **Enable Unlimited**: Check the "No Message Limit" checkbox to set unlimited messages
4. **Save Changes**: Click "Save Changes" and confirm in the warning modal

The interface automatically handles:

- Real-time limit adjustment with visual feedback
- Validation of input values
- Confirmation dialogs for changes
- Integration with AWS Systems Manager Parameter Store

## Data Ingestion Modifications

### Customizing Document Processing

The data ingestion logic is in `cdk/lambda/data_ingestion/src/main.py`. To modify document processing:

```python
# In main.py, modify the process_document function
def process_document(document_content, document_type):
    """
    Custom document processing logic
    """
    if document_type == 'pdf':
        # Custom PDF processing
        processed_content = custom_pdf_processor(document_content)
    elif document_type == 'csv':
        # Custom CSV processing
        processed_content = custom_csv_processor(document_content)
    else:
        # Default processing
        processed_content = default_processor(document_content)

    return processed_content
```

### Adding New Document Types

1. **Update Processing Logic**:

```python
# In processing/documents.py
SUPPORTED_FORMATS = {
    'pdf': process_pdf,
    'docx': process_docx,
    'csv': process_csv,
    'xlsx': process_excel,  # Add new format
    'json': process_json,   # Add new format
}

def process_excel(file_content):
    """Process Excel files"""
    import pandas as pd
    df = pd.read_excel(file_content)
    return df.to_string()

def process_json(file_content):
    """Process JSON files"""
    import json
    data = json.loads(file_content)
    return json.dumps(data, indent=2)
```

2. **Update Frontend Upload Component**:

```jsx
// In ContextDocuments.jsx, update accepted file types
const acceptedFileTypes = [
  ".pdf",
  ".docx",
  ".csv",
  ".xlsx", // Add new type
  ".json", // Add new type
];
```

## Scoring Algorithm Customization

The Research Data Insights platform uses an automated LLM-based scoring system. For comprehensive details on how scoring works, see the [Scoring System Documentation](./scoring.md).

### Quick Modifications

#### 1. Change Scoring Models

Update the models used for scoring by modifying the `research_agenda` table:

```sql
UPDATE research_agenda
SET scoring_models = '["mistral.mistral-large-2402-v1:0", "meta.llama3-70b-instruct-v1:0"]'
WHERE id_research_agenda = 'your-agenda-id';
```

#### 2. Customize Scoring Prompts

Add custom prompts to the `research_agenda_prompts` table:

```sql
INSERT INTO research_agenda_prompts (research_agenda_id, prompt_type, prompt_text, is_default)
VALUES (
  'your-agenda-id',
  'scoring',
  'Rate this response for {{metric_name}} from 1-10. {{metric_description}}

  Response: {{text}}

  Score:',
  false
);
```

#### 3. Add New Aggregation Methods

Extend the scoring methods in `cdk/lambda/scoring/src/main.py`:

```python
def weighted_average(scores, weights=None):
    if not scores:
        return None
    if weights is None:
        weights = [1.0] * len(scores)
    return sum(s * w for s, w in zip(scores, weights)) / sum(weights)

# Add to the scoring method selection
elif scoring_method == "WeightedAverage":
    predicted_score = weighted_average(per_model_scores)
```

#### 4. Modify Text Processing

Customize the `clean_text` function for domain-specific preprocessing:

```python
def clean_text(s: str) -> str:
    # Add custom cleaning logic
    s = re.sub(r"\b(Figure|Table)\s+\d+", "[FIGURE]", s)
    s = re.sub(r"\([^)]*\d{4}[^)]*\)", "[CITATION]", s)
    return s
```

### Testing Scoring Changes

1. Upload test files to trigger scoring
2. Check CloudWatch logs for execution details
3. Query the database to verify results:

```sql
SELECT agenda_name, response_text, score, created_at
FROM individual_responses ir
JOIN research_agenda r ON ir.research_agenda_id = r.id_research_agenda
ORDER BY ir.created_at DESC LIMIT 10;
```

## Deployment and Testing

After making modifications:

1. **Test Locally**: Use the Jupyter notebooks in `/Notebooks` for testing LLM and scoring changes
2. **Deploy Infrastructure**: Run `cdk deploy` from the `/cdk` directory
3. **Deploy Frontend**: The frontend deployment depends on your hosting setup (typically AWS Amplify)
4. **Run Migrations**: Database migrations run automatically on Lambda deployment
5. **Test API Endpoints**: Use the API documentation to test new endpoints

## Best Practices

1. **Version Control**: Always create feature branches for modifications
2. **Testing**: Test changes in a development environment first
3. **Documentation**: Update relevant documentation when making changes
4. **Security**: Follow AWS security best practices for IAM roles and permissions
5. **Monitoring**: Use CloudWatch logs to monitor Lambda function performance
6. **Backup**: Ensure database backups are configured before schema changes

## Troubleshooting

### Common Issues

1. **Lambda Timeout**: Increase timeout in function configuration
2. **Memory Issues**: Increase memory allocation for Lambda functions
3. **Database Connection**: Check VPC and security group configurations
4. **API Gateway**: Verify CORS settings for frontend integration
5. **Authentication**: Ensure Cognito user pool and identity pool are properly configured

### Debugging Tips

1. **CloudWatch Logs**: Check Lambda function logs in CloudWatch
2. **API Gateway Logs**: Enable API Gateway logging for request/response debugging
3. **Frontend Console**: Use browser developer tools for frontend issues
4. **Database Queries**: Use RDS Query Editor for database debugging

This modification guide provides a comprehensive overview of how to customize and extend the Research Data Insights platform. For specific implementation details, refer to the existing code examples and AWS documentation.
