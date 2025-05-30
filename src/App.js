import React, { useState, useEffect, useCallback } from 'react';
import { Image, User, Wand2, Camera, Edit3, Loader2, AlertTriangle, UploadCloud, Palette } from 'lucide-react';

// Helper function to convert file to base64 (if it's at the top level)
const toBase64 = file => new Promise((resolve, reject) => {
    // ... (rest of toBase64 function)
});

const App = () => { // Start of your App functional component
    // Your useState hooks (e.g., activeTab, uploadedImage, etc.) should be here
    const [activeTab, setActiveTab] = useState('portraitStudio');
    // ... other useState hooks ...
    const [portraitError, setPortraitError] = useState('');
    // ... etc.

    // Your getApiKey function (if defined inside App, or it could be outside if it doesn't use hooks/state)
    const getApiKey = () => {
        if (process.env.REACT_APP_GEMINI_API_KEY) {
            return process.env.REACT_APP_GEMINI_API_KEY;
        }
        console.warn("REACT_APP_GEMINI_API_KEY not found in process.env by getApiKey function");
        return ""; 
    };
    const apiKey = getApiKey();

    // ***** CORRECT PLACEMENT FOR THE DEBUGGING useEffect *****
    useEffect(() => {
        console.log("Attempting to read REACT_APP_GEMINI_API_KEY on component mount. Value is:", process.env.REACT_APP_GEMINI_API_KEY);
        if (!process.env.REACT_APP_GEMINI_API_KEY) {
            console.error("CRITICAL: REACT_APP_GEMINI_API_KEY is undefined or empty in the current environment!");
        }
    }, []); // Empty dependency array so it runs once when the component mounts
    // ***** END OF DEBUGGING useEffect *****

    // Your other functions (handleImageUpload, analyzeFace, etc.) would go here
    const handleImageUpload = async (event) => {
        // ...
    };
    // ... other functions ...


    // Your sub-components (TabButton, InputField, etc.) if they are defined inside App
    const TabButton = ({ id, label, icon }) => {
        // ...
    };
    // ... other sub-components ...

    return ( // The main return statement for your App component's JSX
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-slate-200 ...">
            {/* All your JSX for the app UI goes here */}
            {/* ... */}
        </div>
    );
}; // End of your App functional component

export default App; // This line should be at the very end of the file