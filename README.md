# 🎯 AI-Powered KYC Verification Agent

An intelligent, voice-enabled KYC (Know Your Customer) verification system built with Google's Gemini AI and React. This application provides a conversational, real-time video verification experience for identity and document validation.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google)

## ✨ Features

### 🤖 AI-Powered Verification

- **Voice Interaction**: Natural conversation with Gemini 2.5 Flash with native audio
- **Real-time Processing**: Instant verification using function calling
- **Smart Cross-checking**: Automatically validates user responses against pre-registered data
- **Progressive Verification**: Step-by-step guided verification process

### 📹 Video Integration

- **Live Camera Feed**: Real-time video capture for document verification
- **Document Overlay**: Visual guides for placing documents correctly
- **User Info Display**: Contextual information during verification

### 🎨 Modern UI/UX

- **Dark Theme**: Eye-friendly dark interface with vibrant accents
- **Fully Responsive**: Works seamlessly on desktop, tablet, and mobile
- **Animated Agent**: Visual feedback with speaking animations
- **Progress Tracking**: Real-time verification status indicators
- **Glassmorphism Design**: Modern aesthetic with backdrop blur effects

### 🔒 Comprehensive Verification

1. **Basic Details**: Name, Age, Address verification
2. **Document Verification**: Aadhar Card, PAN Card, Signature
3. **Financial Details**: Annual Income and additional information
4. **Final Submission**: Complete data logging via function calling

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Google AI API Key (Gemini)
- Modern browser with webcam support

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/kyc-verification-agent.git
cd kyc-verification-agent
```

2. **Install dependencies**

```bash
npm install
# or
yarn install
```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

```env
REACT_APP_GOOGLE_AI_API_KEY=your_gemini_api_key_here
```

4. **Start the development server**

```bash
npm start
# or
yarn start
```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Configuration

### API Setup

1. Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Configure the API endpoint in `LiveAPIContext`
3. Adjust model settings in `KYCAgent.tsx`:

```typescript
model: "models/gemini-2.0-flash-exp";
responseModalities: "audio"; // or "text" for testing
```

### Customization

**Theme Colors** - Edit `KYCAgent.scss`:

```scss
$primary-color: #6366f1;
$secondary-color: #8b5cf6;
$accent-color: #ec4899;
```

**Verification Steps** - Modify tool declarations in `KYCAgent.tsx`:

```typescript
const toolObject: Tool[] = [
  // Add or modify verification functions
];
```

## 📁 Project Structure

```
kyc-verification-agent/
├── src/
│   ├── components/
│   │   ├── KYCAgent.tsx          # Main component
│   │   └── KYCAgent.scss         # Styling
│   ├── contexts/
│   │   └── LiveAPIContext.tsx    # Gemini API context
│   ├── types/
│   │   └── multimodal-live-types.ts
│   └── App.tsx
├── public/
├── package.json
└── README.md
```

## 🎯 Usage Flow

### 1. Initial Form

Users enter their details:

- Full Name
- Age
- Address
- Aadhar Number
- PAN Number
- Annual Income

### 2. Verification Session

The AI agent:

1. Introduces itself and confirms user identity
2. Asks verbal questions to verify basic details
3. Requests document presentation (Aadhar, PAN)
4. Verifies signature
5. Confirms financial information
6. Submits complete KYC data

### 3. Real-time Feedback

- Visual speaking indicator
- Progress tracking for each verification step
- Document overlay prompts
- Console logging of all verified data

## 🔧 Technical Stack

| Technology           | Purpose                    |
| -------------------- | -------------------------- |
| **React 18+**        | UI Framework               |
| **TypeScript**       | Type Safety                |
| **SCSS**             | Styling                    |
| **Gemini AI**        | Conversational AI & Voice  |
| **WebRTC**           | Camera Access              |
| **Function Calling** | Structured Data Extraction |

## 📊 Function Calling Schema

### Available Tools

```typescript
verify_basic_details(name, age, address, verified);
verify_documents(aadharVerified, panVerified, signatureVerified);
verify_financial_details(annualIncome, verified);
submit_kyc_data(userData, verificationStatus, timestamp);
```

### Example Output

```javascript
console.log("✅ KYC VERIFICATION COMPLETE");
// User Data: { name: "John Doe", age: "30", ... }
// Verification Status: { name: true, aadharCard: true, ... }
// Timestamp: "2024-11-23T10:30:00.000Z"
```

## 🎨 Design Features

### Animations

- **Pulsing ring** when agent speaks
- **Smooth transitions** on all interactions
- **Document pulse** for verification prompts
- **Floating background** gradients
- **Checkmark animations** on completion

### Responsive Breakpoints

- **Desktop**: 1920px+ (Full two-panel layout)
- **Tablet**: 1024px (Vertical stacking)
- **Mobile**: 640px (Optimized single column)

### Accessibility

- Reduced motion support
- High contrast mode
- Keyboard navigation
- Screen reader friendly
- Focus indicators

## 🔐 Security Considerations

⚠️ **Important**: This is a demonstration MVP. For production use:

- Implement proper authentication
- Use secure API endpoints
- Encrypt sensitive data
- Add backend validation
- Implement rate limiting
- Store documents securely
- Comply with data protection regulations (GDPR, etc.)
- Add audit logging
- Implement session management

## 🐛 Known Issues & Limitations

- Requires stable internet connection
- API quota limits apply
- Camera permissions must be granted
- Audio verification requires microphone access
- No backend persistence (MVP only)
- Document image verification is simulated

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Update documentation for new features
- Test on multiple devices
- Maintain responsive design principles

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright 2024 [Your Name/Organization]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0
```

## 🙏 Acknowledgments

- **Google Gemini AI** for the conversational AI capabilities
- **React Community** for the amazing ecosystem
- **Contributors** who help improve this project

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/kyc-verification-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/kyc-verification-agent/discussions)
- **Email**: your.email@example.com

## 🗺️ Roadmap

- [ ] Backend API integration
- [ ] Database persistence
- [ ] OCR for document text extraction
- [ ] Face recognition verification
- [ ] Multi-language support
- [ ] PDF report generation
- [ ] Admin dashboard
- [ ] Analytics and metrics
- [ ] Batch processing
- [ ] Mobile app version

## 📸 Screenshots

### Initial Form

![Initial Form](screenshots/form.png)
_Dark-themed registration form with responsive layout_

### Verification Interface

![Verification](screenshots/verification.png)
_Two-panel layout with AI agent and live camera feed_

### Document Verification

![Documents](screenshots/documents.png)
_Document overlay prompt during verification_

---

⭐ **Star this repository** if you find it helpful!

Made with ❤️ using React and Gemini AI
