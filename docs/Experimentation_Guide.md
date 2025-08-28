# Experimentation Guide

## Table of Contents
1. [Overview](#overview)  
2. [Directory Structure](#directory-structure)  
3. [Usage Overview](#usage-overview)  
   - [Experimenting with Large Language Model Scoring](#experimenting-with-large-language-model-scoring)  
   - [Experimentation with a RAG Model](#experimentation-with-a-rag-model)  
4. [LLM_Scoring Notebook](#llm_scoring-notebook)  
   - [Overview](#overview-1)  
   - [Configuration Parameters](#configuration-parameters)  
   - [Usage](#usage)  
5. [RAG_Model Notebook](#rag_model-notebook)  
   - [Overview](#overview-2)  
   - [Configuration Parameters](#configuration-parameters-1)  
   - [Usage](#usage-1) 

---

## Overview

This guide provides instructions for running experiments with large language model (LLM) scoring techniques and for initializing and evaluating a retrieval-augmented generation (RAG) model. These Jupyter notebooks are designed to support experimentation, evaluation, and insights generation in research-focused workflows.  

---

## Directory Structure

The relevant files pertaining to the development experimentation are in following files and folders:  

```
|---- README.md
|---- Notebooks/
|     |---- LLM_Scoring.ipynb
|     |---- RAG_Model.ipynb
```

---

## Usage Overview

### Experimenting with Large Language Model Scoring

The `LLM_Scoring.ipynb` notebook allows you to test and compare different scoring techniques for LLM outputs. We focus on scoring techniques that leverage several LLMs in an LLM-as-a-judge framework (See \[1\] for an overview). In particular, we leverage 3 different scoring methods for this demonstration. We query multiple LLMs to provide a score for a particular classification task and use either the majority, mean or median score. We also test out generative self-aggregation \[2\] as an optional scoring method.

For this example, we leverage the [Amazon Reviews Dataset](https://www.kaggle.com/datasets/trainingdatapro/amazon-reviews-dataset). We query LLMs to predict user star ratings from the review text. The notebook enables us to [load the reviews](../Notebooks/LLM_Scoring.ipynb#amazon_reviews) with text responses, [apply multiple scoring strategies](../Notebooks/.ipynb#multi_scores), and [compare their effectiveness](../Notebooks/LLM_Scoring.ipynb#compare). 

\[1\] - Gu, Jiawei, et al. "A survey on llm-as-a-judge." arXiv preprint arXiv:2411.15594 (2024). [https://arxiv.org/pdf/2411.15594?](https://arxiv.org/pdf/2411.15594?)

\[2\] - Li, Zichong, et al. "Llms can generate a better answer by aggregating their own responses." arXiv preprint arXiv:2503.04104 (2025). [https://arxiv.org/pdf/2503.04104](https://arxiv.org/pdf/2503.04104)

#### [Dataset Fields](../Notebooks/LLM_Scoring.ipynb#amazon_reviews_columns)

The dataset contains customer reviews of products from Amazon, with the following key fields:  
- **user_name**: Identifier or alias of the reviewer.  
- **stars**: The rating given by the reviewer (1–5 scale).  
- **country**: The country of the reviewer.  
- **date**: The date when the review was posted.  
- **title**: Title or short summary of the review.  
- **text**: Full review text written by the user.  
- **helpful**: Count of how many users marked the review as helpful.  

These fields enable both content-based (review text) and metadata-based (stars, helpfulness, etc.) evaluation strategies.  


#### Methodology for Evaluating Scoring Strategies
Within `LLM_Scoring.ipynb`, we experimented with several approaches for aggregating and evaluating LLM-based scoring techniques:  

1. **Majority Scoring**  
   - The most frequently occurring score across outputs was selected as the final score.
   - This may improve robustness

2. **Mode Scoring**  
   - The statistical mode occurring score across outputs was selected as the final score.   
   - Useful for capturing the most common score even in skewed distributions.  

3. **Median Scoring**  
   - Ordered the set of model-generated scores and selected the middle value.  
   - This may reduce the influence of outliers or extreme predictions.  

4. **Generative Self-Aggregation**  
   - The LLM was prompted to reflect on the outputs of multiple LLMs and provide a final “self-aggregated” score.  
   - Leveraged the model’s reasoning to reconcile multiple perspectives internally.  

#### Evaluation Metrics
To assess the performance of these scoring strategies, we used:  
- **Accuracy**: Proportion of exact matches between predicted scores and ground-truth **stars**.  
- **Pearson’s r**: Correlation between predicted scores and ground-truth ratings, measuring linear agreement.  

These two metrics together provided insights into both classification accuracy and the strength of correlation with human-provided ratings.  


### Experimentation with a RAG Model

The `RAG_Model.ipynb` notebook allows you to configure a retrieval-augmented generation (RAG) pipeline using research data. It [combines document embeddings](../Notebooks/RAG_model.ipynb#doc_embed), a vector database, and [multiple LLMs to evaluate survey responses](../Notebooks/RAG_model.ipynb#score_LLM) for spatial empathy.  

For this example, we leverage survey responses from a UBC geography class and assess spatial empathy in their responses.

#### Data Pipeline and Preprocessing
1. [**Context Documents**](../Notebooks/RAG_model.ipynb#context_doc)  
   - Text files in the `./context_docs` folder are loaded and enriched with user-provided descriptions.  
   - Each document is converted into a LangChain `Document` object with metadata (`source`, `description`).  

2. [**Embeddings and Vector Store**](../Notebooks/RAG_model.ipynb#doc_embed)  
   - Embeddings are generated using Amazon Bedrock (`amazon.titan-embed-text-v2:0`).  
   - Documents are stored in a `PGVector` collection, enabling similarity-based retrieval.  

3. [**Survey Responses**](../Notebooks/RAG_model.ipynb#survey)  
   - Survey responses are read from `.txt` files in `./response_docs`.  
   - Responses are processed into a list for evaluation.  

#### Retrieval and Scoring Workflow
The core of the notebook is the [**RAG-based scoring pipeline**](../Notebooks/RAG_model.ipynb#score_llm), which integrates retrieved context and multiple LLM scorers:  

1. **Vector Embedding and Retrieval**  
   - Documents are embedded into vector stores
   - For each evaluation question, the system retrieves the top-k most relevant context documents from the vector store.  
   - Retrieved documents provide grounding and descriptive context for response evaluation.

2. [**Model Scoring and Interaction**](../Notebooks/RAG_model.ipynb#score_surveys)
   - LLMs are used to score spatial empathy from 1 to 10 and we enable a multi modal scoring technique as presented earlier. 
   - Each model is prompted consistently with context and the evaluation question, and model scores are saved.

#### Outputs and Evaluation
- Each survey response is saved with:  
  - Model scores  
  - Average score  
  - Aggregated score  
  - Original response text  
- Results are exported to a CSV file (`rag_response_scores.csv`).  

---

## LLM_Scoring Notebook

### Overview

This notebook supports experiments with evaluating and aggregating large language model (LLM) scoring techniques. It uses the Amazon Reviews dataset as an example and tests different aggregation strategies — majority, mode, median, and generative self-aggregation — to determine how well LLM predictions align with ground-truth review ratings.  

### Configuration Parameters

#### General Settings
- **input_file**: Path to the dataset containing reviews and labels (e.g., Amazon Reviews dataset).
- **all_models**: List that defines all the models you are testing

#### Scoring Parameters
- **model_ids**: List of LLMs to use for scoring reviews (e.g., Titan, Mistral, LLaMA 3).  
- **aggregation_model**: An LLM used for generative self-aggregation of model scores (default: `meta.llama3-8b-instruct-v1:0`).  
- **average_score**: Mean of scores produced by all selected models.  
- **aggregated_score**: Final score produced by the aggregation model after reasoning over multiple model outputs and the original review text.  
#### Evaluation Parameters
The notebook evaluates scoring strategies using two metrics:  

- **Accuracy**: Proportion of predicted scores that exactly match the ground-truth `stars` rating, computed for:  
  - Aggregated score  
  - Average score (rounded)  
  - Majority vote score  
  - Median score  

- **Pearson’s r**: Correlation between predicted scores and ground-truth ratings, computed for:  
  - Aggregated score  
  - Average score (raw values)  
  - Majority vote score  
  - Median score  

These metrics together assess both classification accuracy and the strength of linear correlation between predicted and true ratings across different aggregation methods.  

### Usage
1. Open and run `LLM_Scoring.ipynb`.  
2. Load the dataset and configure the list of `all_models`.  
3. Run the multi-model scoring function to generate individual scores, averages, and aggregated scores.  
4. Evaluate aggregation strategies using accuracy and Pearson’s r for aggregated, average, majority, and median scores.  
5. Review results stored in `multi_model_scores.csv` for further analysis.  


## RAG_Model Notebook

### Overview

This notebook provides functionality for initializing, running, and evaluating a Retrieval-Augmented Generation (RAG) model. It integrates Amazon Bedrock embeddings, a Postgres vector store (PGVector), and multiple LLMs to evaluate survey responses for spatial empathy. The workflow includes document ingestion, context retrieval, multi-model scoring, and aggregation into a final score.  

### Configuration Parameters

#### Data and Embeddings
- **context_folder**: Path to the folder containing context documents (default: `./context_docs`).  
- **response_folder**: Path to the folder containing survey response documents (default: `./response_docs`).  
- **connection**: Postgres connection string for PGVector.  
- **collection_name**: Name of the PGVector collection (default: `"my_docs"`).  
- **embedding_model**: Amazon Bedrock embedding model used for vectorization (default: `amazon.titan-embed-text-v2:0`).  

#### Retrieval and Scoring
- **top_k**: Number of most relevant documents to retrieve for each query (default: 3).  
- **model_ids**: List of LLMs used for scoring (e.g., `meta.llama3-8b-instruct-v1:0`, `mistral.mistral-large-2402-v1:0`, `amazon.titan-text-express-v1`).  
- **aggregation_model**: LLM used to aggregate individual model scores into a single consensus score (default: `meta.llama3-8b-instruct-v1:0`).  
- **output_csv**: File to save final results with all scores and aggregated outputs (default: `rag_response_scores.csv`).  

### Usage
1. Open and run `RAG_Model.ipynb`.  
2. Configure `context_folder` and `response_folder` to load documents and survey responses.  
3. Embed context documents into PGVector and confirm collection setup.  
4. Run the RAG scoring pipeline with multiple models.  
5. Aggregate scores using both statistical (average) and generative (LLM-based) strategies.  
6. Evaluate results using accuracy and Pearson’s r.  
7. Review outputs in `rag_response_scores.csv`.
8. Continue with any open-ended interaction required.  
