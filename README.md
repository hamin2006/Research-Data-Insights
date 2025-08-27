# Research-Data-Insights

This prototype explores how Large Language Models (LLMs) can enhance research by analyzing large volumes of qualitative and quantitative data. By identifying patterns, scoring responses against user-defined metrics, and surfacing nuanced insights, it offers a scalable way to study complex concepts.

| Index                                               | Description                                             |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [High Level Architecture](#high-level-architecture) | High level overview illustrating component interactions |
| [Deployment](#deployment-guide)                     | How to deploy the project                               |
| [User Guide](#user-guide)                           | The working solution                                    |
| [Directories](#directories)                         | General project directory structure                     |
| [API Documentation](#api-documentation)             | Documentation on the API the project uses               |
| [Credits](#credits)                                 | Meet the team behind the solution                       |
| [License](#license)                                 | License details                                         |

## High-Level Architecture

The following architecture diagram illustrates the various AWS components utilized to deliver the solution. For an in-depth explanation of the frontend and backend stacks, please look at the [Architecture Guide](docs/architectureDeepDive.md).

![Archnitecture Diagram](./docs/media/architecture.png)

## Deployment Guide

To deploy this solution, please follow the steps laid out in the [Deployment Guide](./docs/deploymentGuide.md)

## User Guide

Please refer to the [Web App User Guide](./docs/userGuide.md) for instructions on navigating the web app interface.

## Directories

```
├── cdk/
│   ├── bin/
│   ├── data_ingestion/
│   ├── lambda/
│   ├── layers/
│   ├── lib/
│   └── graphql/

├── docs/
│   ├── userGuide.md
│   ├── deploymentGuide.md
│   ├── images/
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/
│       └── components/

```

1. `/cdk`: Contains the deployment code for the app's AWS infrastructure
   - `/bin`: Contains the instantiation of CDK stack
   - `/data_ingestion`: Contains the code required for the Data Ingestion step in retrieval-augmented generation. This folder is used by a Lambda function that runs a container which updates the vectorstore for a course when files are uploaded or deleted.
   - `/lambda`: Contains the lambda functions for the project
   - `/layers`: Contains the required layers for lambda functions
   - `/lib`: Contains the deployment code for all infrastructure stacks
   - `/graphql`: Contains the GraphQL schema and resolvers for the API.
2. `/docs`: Contains documentation for the application.
3. `/frontend`: Contains the user interface of the general public application

## API Documentation

Here you can learn about the API the project uses: [API Documentation](./docs/api-documentation.pdf).

## Dependency Management

For information on how Python dependencies are locked and managed across Lambda functions, see the [Dependency Management Guide](./docs/dependencyManagement.md).

## Modification Guide

Steps to implement optional modifications such as changing the colours of the application can be found
[here](./docs/modificationGuide.md).

## Credits
This application was architected and developed by <a href="https://www.linkedin.com/in/prajna-nayak-807b1a247/" target="_blank">Prajna Nayak</a>, <a href="https://www.linkedin.com/in/zayans/" target="_blank">Zayan Sheikh</a>, and <a href="https://www.linkedin.com/in/kanishkhanna/" target="_blank">Kanish Khanna</a>, with project assistance by <a href="https://www.linkedin.com/in/harleen-chahal-713569141/6" target="_blank">Harleen Chahal</a>. Thanks to the UBC Cloud Innovation Centre Technical and Project Management teams for their guidance and support.

## License

This project is distributed under the [MIT License](LICENSE).

Licenses of libraries and tools used by the system are listed below:

[PostgreSQL license](https://www.postgresql.org/about/licence/)

- For PostgreSQL and pgvector
- "a liberal Open Source license, similar to the BSD or MIT licenses."

[LLaMa 3 Community License Agreement](https://llama.meta.com/llama3/license/)

- For Llama 3 70B Instruct model
