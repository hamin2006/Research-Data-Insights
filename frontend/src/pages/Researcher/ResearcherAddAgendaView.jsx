
import React, { useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import ResearcherNavbar from "../../components/ResearcherNavbar";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function AgendaForm() {
  const navigate = useNavigate();

  const [agenda, setAgenda] = useState({
    agenda_name: "",
    metric_name: "",
    metric_description: "",
    context_documents: [],
    research_observations: []
  });

  const addContextDoc = () => {
    setAgenda(prev => ({
      ...prev,
      context_documents: [...prev.context_documents, { document_name: "", file: null, description: "" }]
    }));
  };

  const addObservation = () => {
    setAgenda(prev => ({
      ...prev,
      research_observations: [...prev.research_observations, { document_name: "", file: null }]
    }));
  };

  const updateField = (field, value) => {
    setAgenda(prev => ({ ...prev, [field]: value }));
  };

  const updateContextDoc = (index, field, value) => {
    const docs = [...agenda.context_documents];
    docs[index][field] = value;
    setAgenda(prev => ({ ...prev, context_documents: docs }));
  };

  const updateObservation = (index, field, value) => {
    const obs = [...agenda.research_observations];
    obs[index][field] = value;
    setAgenda(prev => ({ ...prev, research_observations: obs }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  const session = await fetchAuthSession();
  const token = session.tokens.idToken;
  const payload = JSON.parse(atob(token.toString().split('.')[1]));
  const cognito_id = payload.sub;

  // First create the agenda to get agenda_id
  const agendaData = {
    agenda_name: agenda.agenda_name,
    metric_name: agenda.metric_name,
    metric_description: agenda.metric_description,
    cognito_id: cognito_id,
    context_documents: [],
    research_observations: []
  };

  const agendaResponse = await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(agendaData)
  });

  const { agenda_id } = await agendaResponse.json();

  // Upload context documents
  for (const doc of agenda.context_documents) {
    if (doc.file) {
      // Get presigned URL
      const urlResponse = await fetch(`${import.meta.env.VITE_API_ENDPOINT}upload-url?file_name=${doc.file.name}&file_type=${doc.file.type}&agenda_id=${agenda_id}&document_type=context`, {
  headers: {
    Authorization: token,
  }
});
      const { presignedurl, key } = await urlResponse.json();

      // Upload to S3
      await fetch(presignedurl, {
        method: "PUT",
        body: doc.file,
        headers: { "Content-Type": doc.file.type }
      });

      // Update agenda with S3 key
      await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agenda_id}/context-document`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_name: doc.document_name,
          file_path: key,
          description: doc.description
        })
      });
    }
  }


    // Upload context documents
  for (const obs of agenda.research_observations) {
    if (obs.file) {
      // Get presigned URL
      const urlResponse = await fetch(`${import.meta.env.VITE_API_ENDPOINT}upload-url?file_name=${obs.file.name}&file_type=${obs.file.type}&agenda_id=${agenda_id}&document_type=observation`, {
          headers: {
            Authorization: token,
          }
      });

      const { presignedurl, key } = await urlResponse.json();

      // Upload to S3
      await fetch(presignedurl, {
        method: "PUT",
        body: obs.file,
        headers: { "Content-Type": obs.file.type }
      });

      // Update agenda with S3 key
      await fetch(`${import.meta.env.VITE_API_ENDPOINT}agenda/${agenda_id}/research-observation`, {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_name: obs.document_name,
          file_path: key
        })
      });
    }
  }

  alert("Agenda created successfully!");
  navigate(`/agenda/${agenda_id}/chat`);
};


  return (
    <Box
      sx={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
      }}
    >
      <ResearcherNavbar />
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Research Agenda</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agenda Name
              </label>
              <input
                type="text"
                value={agenda.agenda_name}
                onChange={(e) => updateField("agenda_name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metric Name
              </label>
              <input
                type="text"
                value={agenda.metric_name}
                onChange={(e) => updateField("metric_name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metric Description
              </label>
              <textarea
                value={agenda.metric_description}
                onChange={(e) => updateField("metric_description", e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Context Documents</h3>
              {agenda.context_documents.map((doc, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-md mb-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Document Name"
                    value={doc.document_name}
                    onChange={(e) => updateContextDoc(i, "document_name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="file"
                    onChange={(e) => updateContextDoc(i, "file", e.target.files[0])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    placeholder="Description"
                    value={doc.description}
                    onChange={(e) => updateContextDoc(i, "description", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addContextDoc}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md transition-colors"
              >
                + Add Context Document
              </button>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Research Observations</h3>
              {agenda.research_observations.map((obs, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-md mb-4 space-y-3">
                  <input
                    type="text"
                    placeholder="Document Name"
                    value={obs.document_name}
                    onChange={(e) => updateObservation(i, "document_name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="file"
                    onChange={(e) => updateObservation(i, "file", e.target.files[0])}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addObservation}
                className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md transition-colors"
              >
                + Add Observation
              </button>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 font-medium py-3 px-4 rounded-md transition-colors"
              >
                Create Research Agenda
              </button>
            </div>
          </form>
        </div>
      </div>
    </Box>
  );
}
