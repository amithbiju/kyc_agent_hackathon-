import "./kyc.scss";
import { type Tool, SchemaType } from "@google/generative-ai";
import { useEffect, useState, useCallback, useRef } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import {
  ToolCall,
  ToolResponse,
  LiveFunctionResponse,
} from "../../multimodal-live-types";

// Types
interface UserDetails {
  name: string;
  age: string;
  address: string;
  aadharNo: string;
  panNo: string;
  annualIncome: string;
}

interface VerificationResult {
  name: boolean;
  age: boolean;
  address: boolean;
  aadharCard: boolean;
  panCard: boolean;
  signature: boolean;
  annualIncome: boolean;
}

interface ResponseObject extends LiveFunctionResponse {
  name: string;
  response: { result: object };
}

// Tools
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "verify_basic_details",
        description:
          "Verifies and records the user's name, age, and address. Returns success status.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            age: { type: SchemaType.STRING },
            address: { type: SchemaType.STRING },
            verified: { type: SchemaType.BOOLEAN },
          },
          required: ["name", "age", "address", "verified"],
        },
      },
      {
        name: "verify_documents",
        description:
          "Verifies Aadhar card, PAN card, and signature. Returns verification status.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            aadharVerified: { type: SchemaType.BOOLEAN },
            panVerified: { type: SchemaType.BOOLEAN },
            signatureVerified: { type: SchemaType.BOOLEAN },
          },
          required: ["aadharVerified", "panVerified", "signatureVerified"],
        },
      },
      {
        name: "verify_financial_details",
        description:
          "Verifies annual income and other financial details. Returns verification status.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            annualIncome: { type: SchemaType.STRING },
            verified: { type: SchemaType.BOOLEAN },
          },
          required: ["annualIncome", "verified"],
        },
      },
      {
        name: "submit_kyc_data",
        description:
          "Final submission of all verified KYC data. Called after all verifications are complete.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            userData: { type: SchemaType.OBJECT },
            verificationStatus: { type: SchemaType.OBJECT },
            timestamp: { type: SchemaType.STRING },
          },
          required: ["userData", "verificationStatus", "timestamp"],
        },
      },
    ],
  },
];

const createSystemInstruction = (userDetails: UserDetails) => ({
  parts: [
    {
      text: `You are a friendly KYC verification agent. Your role is to verify user identity and documents through a conversational interview.

# User's Pre-registered Details:
- Name: ${userDetails.name}
- Age: ${userDetails.age}
- Address: ${userDetails.address}
- Aadhar Number: ${userDetails.aadharNo}
- PAN Number: ${userDetails.panNo}
- Annual Income: ${userDetails.annualIncome}

# Verification Process:
1. **Introduction**: Greet the user warmly, introduce yourself as their KYC verification agent, and confirm their name
2. **Verify Basic Details**: Ask the user to verbally confirm their name, age, and address. Cross-check with pre-registered data. Call verify_basic_details tool.
3. **Document Verification**: 
   - Request Aadhar card to be shown to camera
   - Request PAN card to be shown to camera
   - Request signature verification
   - Call verify_documents tool after checking each
4. **Financial Details**: Ask about annual income and verify other details. Call verify_financial_details tool.
5. **Completion**: Call submit_kyc_data with all collected information

# Guidelines:
- Be conversational, friendly, and professional
- If details don't match, politely ask for clarification
- Always wait for user response before proceeding
- Use the tools to record verification at each step
- Keep responses concise and clear
- When asking for documents, clearly state which document to show

Always call relevant tools BEFORE responding to confirm verification steps.`,
    },
  ],
});

export default function KYCAgent() {
  const { client, setConfig, connect, connected } = useLiveAPIContext();
  const [stage, setStage] = useState<"form" | "verification">("form");
  const [userDetails, setUserDetails] = useState<UserDetails>({
    name: "",
    age: "",
    address: "",
    aadharNo: "",
    panNo: "",
    annualIncome: "",
  });
  const [verificationStatus, setVerificationStatus] = useState<VerificationResult>({
    name: false,
    age: false,
    address: false,
    aadharCard: false,
    panCard: false,
    signature: false,
    annualIncome: false,
  });
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [showDocumentOverlay, setShowDocumentOverlay] = useState(false);
  const [currentDocument, setCurrentDocument] = useState("");
  const [toolResponse, setToolResponse] = useState<ToolResponse | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize webcam
  useEffect(() => {
    if (stage === "verification" && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error("Error accessing camera:", err));
    }
  }, [stage]);

  // Configure Gemini
  useEffect(() => {
    if (stage === "verification") {
      setConfig({
        model: "models/gemini-2.5-flash-native-audio-preview-09-2025",
        generationConfig: {
          responseModalities: "audio",
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
        },
        systemInstruction: createSystemInstruction(userDetails),
        tools: toolObject,
      });
    }
  }, [setConfig, stage, userDetails]);

  // Monitor agent speaking
  useEffect(() => {
    const handleAudioStart = () => setIsAgentSpeaking(true);
    const handleAudioEnd = () => setIsAgentSpeaking(false);

    client.on("audio", handleAudioStart);
    client.on("interrupted", handleAudioEnd);

    return () => {
      client.off("audio", handleAudioStart);
      client.off("interrupted", handleAudioEnd);
    };
  }, [client]);

  // Handle tool calls
  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      const fCalls = toolCall.functionCalls;
      const functionResponses: ResponseObject[] = [];

      fCalls.forEach((fCall) => {
        let functionResponse = {
          id: fCall.id,
          name: fCall.name,
          response: {
            result: { string_value: `${fCall.name} completed successfully.` },
          },
        };

        switch (fCall.name) {
          case "verify_basic_details": {
            const args = fCall.args as any;
            console.log("📋 Basic Details Verified:", args);
            setVerificationStatus((prev) => ({
              ...prev,
              name: args.verified,
              age: args.verified,
              address: args.verified,
            }));
            setShowDocumentOverlay(false);
            break;
          }
          case "verify_documents": {
            const args = fCall.args as any;
            console.log("📄 Documents Verified:", args);
            setVerificationStatus((prev) => ({
              ...prev,
              aadharCard: args.aadharVerified,
              panCard: args.panVerified,
              signature: args.signatureVerified,
            }));
            setShowDocumentOverlay(true);
            setCurrentDocument("Please show your documents when requested");
            setTimeout(() => setShowDocumentOverlay(false), 3000);
            break;
          }
          case "verify_financial_details": {
            const args = fCall.args as any;
            console.log("💰 Financial Details Verified:", args);
            setVerificationStatus((prev) => ({
              ...prev,
              annualIncome: args.verified,
            }));
            break;
          }
          case "submit_kyc_data": {
            const args = fCall.args as any;
            console.log("✅ KYC VERIFICATION COMPLETE:");
            console.log("User Data:", args.userData);
            console.log("Verification Status:", args.verificationStatus);
            console.log("Timestamp:", args.timestamp);
            console.log("Pre-registered Details:", userDetails);
            console.log("Final Verification:", verificationStatus);
            break;
          }
        }

        functionResponses.push(functionResponse);
      });

      setToolResponse({ functionResponses });
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client, userDetails, verificationStatus]);

  // Send tool responses
  useEffect(() => {
    if (toolResponse) {
      client.sendToolResponse(toolResponse);
      setToolResponse(null);
    }
  }, [toolResponse, client]);

  const handleStartVerification = async () => {
    setStage("verification");
    try {
      await connect();
      client.send({
        text: `Start KYC verification for user ${userDetails.name}`,
      });
    } catch (error) {
      console.error("Connection error:", error);
    }
  };

  const handleInputChange = (field: keyof UserDetails, value: string) => {
    setUserDetails((prev) => ({ ...prev, [field]: value }));
  };

  if (stage === "form") {
    return (
      <div className="kyc-form-container">
        <div className="kyc-form-card">
          <div className="kyc-form-header">
            <h1 className="kyc-form-title">🎯 KYC Verification</h1>
            <p className="kyc-form-subtitle">Please enter your details to begin</p>
          </div>
          
          <div className="kyc-form-fields">
            <div className="kyc-form-group">
              <label className="kyc-label">Full Name</label>
              <input
                type="text"
                value={userDetails.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="kyc-input"
                placeholder="John Doe"
              />
            </div>
            
            <div className="kyc-form-row">
              <div className="kyc-form-group">
                <label className="kyc-label">Age</label>
                <input
                  type="text"
                  value={userDetails.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                  className="kyc-input"
                  placeholder="25"
                />
              </div>
              
              <div className="kyc-form-group">
                <label className="kyc-label">Annual Income</label>
                <input
                  type="text"
                  value={userDetails.annualIncome}
                  onChange={(e) => handleInputChange("annualIncome", e.target.value)}
                  className="kyc-input"
                  placeholder="₹500,000"
                />
              </div>
            </div>
            
            <div className="kyc-form-group">
              <label className="kyc-label">Address</label>
              <textarea
                value={userDetails.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className="kyc-textarea"
                placeholder="123 Main Street, City, State - 123456"
                rows={3}
              />
            </div>
            
            <div className="kyc-form-row">
              <div className="kyc-form-group">
                <label className="kyc-label">Aadhar Number</label>
                <input
                  type="text"
                  value={userDetails.aadharNo}
                  onChange={(e) => handleInputChange("aadharNo", e.target.value)}
                  className="kyc-input"
                  placeholder="1234-5678-9012"
                />
              </div>
              
              <div className="kyc-form-group">
                <label className="kyc-label">PAN Number</label>
                <input
                  type="text"
                  value={userDetails.panNo}
                  onChange={(e) => handleInputChange("panNo", e.target.value)}
                  className="kyc-input"
                  placeholder="ABCDE1234F"
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={handleStartVerification}
            disabled={!userDetails.name || !userDetails.age || !userDetails.aadharNo || !userDetails.panNo}
            className="kyc-submit-button"
          >
            Start Verification →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kyc-verification-container">
      {/* AI Agent Panel */}
      <div className="kyc-agent-panel">
        <div className="kyc-agent-content">
          <div className="kyc-agent-avatar-wrapper">
            <div className={`kyc-agent-avatar ${isAgentSpeaking ? "speaking" : ""}`}>
              🤖
            </div>
            {isAgentSpeaking && (
              <div className="kyc-agent-pulse-ring"></div>
            )}
          </div>
          
          <h2 className="kyc-agent-title">KYC Agent</h2>
          <p className="kyc-agent-status">
            {isAgentSpeaking ? "🎙️ Speaking..." : "👂 Listening..."}
          </p>
        </div>
        
        {/* Verification Status */}
        <div className="kyc-verification-progress">
          <h3 className="kyc-progress-title">Verification Progress</h3>
          <div className="kyc-progress-grid">
            {Object.entries(verificationStatus).map(([key, value]) => (
              <div key={key} className="kyc-progress-item">
                <span className={`kyc-progress-icon ${value ? "verified" : ""}`}>
                  {value ? "✅" : "⏳"}
                </span>
                <span className="kyc-progress-label">
                  {key.replace(/([A-Z])/g, " $1")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Camera Feed Panel */}
      <div className="kyc-camera-panel">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="kyc-camera-feed"
        />
        
        {/* Document Overlay */}
        {showDocumentOverlay && (
          <div className="kyc-document-overlay">
            <div className="kyc-document-card">
              <div className="kyc-document-icon">📄</div>
              <h3 className="kyc-document-title">Document Required</h3>
              <p className="kyc-document-message">{currentDocument}</p>
              <div className="kyc-document-frame">
                <p className="kyc-document-instruction">Place document here</p>
              </div>
            </div>
          </div>
        )}
        
        {/* User Info Overlay */}
        <div className="kyc-user-info">
          <div className="kyc-user-details">
            <p className="kyc-user-name">{userDetails.name}</p>
            <p className="kyc-user-age">Age: {userDetails.age}</p>
          </div>
        </div>
      </div>
    </div>
  );
}