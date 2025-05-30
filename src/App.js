import React, { useState, useEffect, useCallback } from 'react';
import { Image, User, Wand2, Camera, Edit3, Loader2, AlertTriangle, UploadCloud, Palette } from 'lucide-react';

// Helper function to convert file to base64
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]); // Get only the base64 part
    reader.onerror = error => reject(error);
});

const App = () => {
    const [activeTab, setActiveTab] = useState('portraitStudio'); // 'portraitStudio' or 'imagePlayground'
    
    // States for Creative Portrait Studio
    const [uploadedImage, setUploadedImage] = useState(null);
    const [uploadedImagePreview, setUploadedImagePreview] = useState(null);
    const [faceDescription, setFaceDescription] = useState('');
    const [scenePrompt, setScenePrompt] = useState('');
    const [generatedPortrait, setGeneratedPortrait] = useState(null);
    const [isAnalyzingFace, setIsAnalyzingFace] = useState(false);
    const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
    const [portraitError, setPortraitError] = useState('');

    // States for Image Playground
    const [imagePlaygroundPrompt, setImagePlaygroundPrompt] = useState('');
    const [generatedPlaygroundImage, setGeneratedPlaygroundImage] = useState(null);
    const [isGeneratingPlaygroundImage, setIsGeneratingPlaygroundImage] = useState(false);
    const [playgroundError, setPlaygroundError] = useState('');

    const getApiKey = () => {
        // This is how Create React App exposes environment variables
        if (process.env.REACT_APP_GEMINI_API_KEY) {
            return process.env.REACT_APP_GEMINI_API_KEY;
        }
        // Fallback if the environment variable is not set
        console.warn("REACT_APP_GEMINI_API_KEY not found in process.env");
        return ""; 
    };
    
    const apiKey = getApiKey();

    // Log the API key value during component initialization (for debugging deployed app)
    useEffect(() => {
        console.log("Attempting to read REACT_APP_GEMINI_API_KEY on component mount. Value is:", process.env.REACT_APP_GEMINI_API_KEY);
        if (!process.env.REACT_APP_GEMINI_API_KEY) {
            console.error("CRITICAL: REACT_APP_GEMINI_API_KEY is undefined or empty in the current environment!");
        }
    }, []);


    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) {
                setPortraitError("Image is too large. Please upload an image smaller than 4MB.");
                setUploadedImage(null);
                setUploadedImagePreview(null);
                return;
            }
            try {
                const base64 = await toBase64(file);
                setUploadedImage(base64);
                setUploadedImagePreview(URL.createObjectURL(file));
                setFaceDescription(''); 
                setGeneratedPortrait(null); 
                setPortraitError(''); 
            } catch (error) {
                console.error("Error converting image to base64:", error);
                setPortraitError("Failed to load image. Please try again.");
                setUploadedImage(null);
                setUploadedImagePreview(null);
            }
        }
    };

    // Helper to ensure error messages are strings and not React elements
    const getApiErrorString = (err, defaultMessage) => {
        if (err && typeof err === 'object' && err !== null && err.hasOwnProperty('$$typeof')) {
            console.warn("getApiErrorString received a React element-like object directly as 'err'. Using default message.", {errorObject: err});
            return defaultMessage;
        }
        if (err && err.error) {
            if (typeof err.error.message === 'string' && err.error.message.trim() !== '') {
                return err.error.message;
            }
            if (typeof err.error.message === 'object' && err.error.message !== null && err.error.message.hasOwnProperty('$$typeof')) {
                 console.warn("getApiErrorString found React element in err.error.message. Using default message.", {errorObject: err.error.message});
                return defaultMessage;
            }
        }
        if (err && err.message) {
            if (typeof err.message === 'string' && err.message.trim() !== '') {
                return err.message;
            }
            if (typeof err.message === 'object' && err.message !== null && err.message.hasOwnProperty('$$typeof')) {
                console.warn("getApiErrorString found React element in err.message. Using default message.", {errorObject: err.message});
                return defaultMessage;
            }
        }
        if (typeof err === 'string' && err.trim() !== '') {
            return err;
        }
        console.warn("getApiErrorString received an unrecognized error format or empty message. Using default message.", {errorObject: err});
        return defaultMessage;
    };


    const analyzeFace = async () => {
        if (!uploadedImage) {
            setPortraitError("Please upload an image first.");
            return;
        }
        setIsAnalyzingFace(true);
        setPortraitError('');
        setFaceDescription(''); 

        if (!apiKey) { // This check uses the apiKey constant derived from getApiKey()
             setPortraitError("API Key is missing. Please add your Gemini API key to use this feature.");
             setIsAnalyzingFace(false);
             return;
        }

        const analysisPrompt = "Describe the main person's facial features in detail. Focus on hair color and style, eye color, face shape, specific features like nose and mouth, and any distinctive elements such as glasses, beard, freckles, or facial expression. Provide a concise but comprehensive description suitable for an artist to recreate the likeness.";
        
        const payload = {
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: analysisPrompt },
                        {
                            inlineData: {
                                mimeType: "image/jpeg", 
                                data: uploadedImage
                            }
                        }
                    ]
                }
            ],
        };

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (response.ok && result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0 &&
                typeof result.candidates[0].content.parts[0].text === 'string') {
                setFaceDescription(result.candidates[0].content.parts[0].text);
            } else {
                console.error("Face analysis failed, API response (raw result):", result);
                const errorMsg = getApiErrorString(result, "Face analysis failed. The model couldn't describe the face or the response was empty. Try a different image or ensure the face is clear.");
                setPortraitError(errorMsg);
            }
        } catch (error) {
            console.error("Network or other error during face analysis (raw error):", error);
            setPortraitError(`Error analyzing face: ${getApiErrorString(error, "An unknown error occurred")}. Check console for details.`);
        } finally {
            setIsAnalyzingFace(false);
        }
    };

    const generateCreativePortrait = async () => {
        if (!faceDescription) {
            setPortraitError("Please analyze a face or manually enter a description first.");
            return;
        }
        if (!scenePrompt) {
            setPortraitError("Please enter a scene or style prompt.");
            return;
        }
        setIsGeneratingPortrait(true);
        setPortraitError('');
        setGeneratedPortrait(null); 

        if (!apiKey) { // This check uses the apiKey constant
             setPortraitError("API Key is missing. Please add your Gemini API key to use this feature.");
             setIsGeneratingPortrait(false);
             return;
        }

        const fullPrompt = `${faceDescription}. ${scenePrompt}`;
        
        const payload = {
            instances: [{ prompt: fullPrompt }],
            parameters: { sampleCount: 1 } 
        };

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (response.ok && result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
                setGeneratedPortrait(`data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`);
            } else {
                console.error("Portrait generation failed, API response (raw result):", result);
                const errorMsg = getApiErrorString(result, "Portrait generation failed. The model couldn't generate an image or the response was empty. Try adjusting your prompts.");
                setPortraitError(errorMsg);
            }
        } catch (error) {
            console.error("Network or other error during portrait generation (raw error):", error);
            setPortraitError(`Error generating portrait: ${getApiErrorString(error, "An unknown error occurred")}. Check console for details.`);
        } finally {
            setIsGeneratingPortrait(false);
        }
    };

    const generatePlaygroundImageAction = async () => {
        if (!imagePlaygroundPrompt) {
            setPlaygroundError("Please enter a prompt.");
            return;
        }
        setIsGeneratingPlaygroundImage(true);
        setPlaygroundError('');
        setGeneratedPlaygroundImage(null); 

        if (!apiKey) { // This check uses the apiKey constant
             setPlaygroundError("API Key is missing. Please add your Gemini API key to use this feature.");
             setIsGeneratingPlaygroundImage(false);
             return;
        }
        
        const payload = {
            instances: [{ prompt: imagePlaygroundPrompt }],
            parameters: { sampleCount: 1 }
        };

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (response.ok && result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
                setGeneratedPlaygroundImage(`data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`);
            } else {
                 console.error("Image playground generation failed, API response (raw result):", result);
                const errorMsg = getApiErrorString(result, "Image generation failed. The model couldn't generate an image or the response was empty. Try a different prompt.");
                setPlaygroundError(errorMsg);
            }
        } catch (error)
        {
            console.error("Network or other error during image playground generation (raw error):", error);
            setPlaygroundError(`Error generating image: ${getApiErrorString(error, "An unknown error occurred")}. Check console for details.`);
        } finally {
            setIsGeneratingPlaygroundImage(false);
        }
    };
    
    const TabButton = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 px-2 sm:px-4 text-sm sm:text-base font-medium rounded-t-lg flex items-center justify-center gap-2 transition-all duration-200 ease-in-out
                        ${activeTab === id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
            {icon} {label}
        </button>
    );

    const InputField = ({ value, onChange, placeholder, icon, type = "text", rows = 3, id }) => (
        <div className="relative w-full">
            <label htmlFor={id} className="sr-only">{placeholder}</label> 
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {icon}
            </div>
            {type === "textarea" ? (
                <textarea
                    id={id}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={rows}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
            ) : (
                 <input
                    id={id}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
            )}
        </div>
    );

    const ActionButton = ({ onClick, label, icon, isLoading, disabled = false, color = "indigo" }) => (
        <button
            type="button" 
            onClick={onClick}
            disabled={isLoading || disabled}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white rounded-lg shadow-md
                        ${disabled || isLoading ? `bg-${color}-300 cursor-not-allowed` : `bg-${color}-600 hover:bg-${color}-700 focus:ring-2 focus:ring-offset-2 focus:ring-${color}-500`}
                        transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95`}
        >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : icon}
            {label}
        </button>
    );
    
    const ImageDisplay = ({ src, alt, isLoading, error, placeholderText }) => (
        <div className="w-full aspect-square bg-gray-100 rounded-lg shadow-inner flex items-center justify-center overflow-hidden border border-gray-200 min-h-[200px] sm:min-h-[300px]">
            {isLoading ? (
                <div className="flex flex-col items-center text-gray-500 p-4">
                    <Loader2 className="animate-spin h-12 w-12 mb-2" />
                    <p>Generating...</p>
                </div>
            ) : error && typeof error === 'string' && error.trim() !== '' ? ( 
                 <div className="p-4 text-center text-red-600">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-red-500" />
                    <p className="font-semibold">Error</p>
                    <p className="text-sm break-words">{error}</p> 
                </div>
            ) : src ? (
                <img src={src} alt={alt} className="w-full h-full object-contain" />
            ) : (
                <div className="text-gray-400 text-center p-4">
                    <Image className="h-12 w-12 mx-auto mb-2" />
                    <p>{placeholderText}</p>
                </div>
            )}
        </div>
    );

    const ErrorMessage = ({ message }) => { 
        // Updated: Only render if message is a non-empty string
        if (typeof message === 'string' && message.trim() !== '') {
            return (
                <div className="p-3 my-2 bg-red-100 border border-red-300 text-red-700 rounded-lg flex items-center gap-2 text-sm break-words">
                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span>{message}</span>
                </div>
            );
        }
        // Log if message was defined but not a valid string for rendering
        if (message != null && (typeof message !== 'string' || message.trim() === '')) {
             console.warn("ErrorMessage component: 'message' prop is not a displayable string. Not rendering. Message was:", message, "Type:", typeof message);
        }
        return null; // Render nothing if message is not a valid string
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-slate-200 flex flex-col items-center p-2 sm:p-4 font-sans">
            <div className="w-full max-w-2xl bg-white shadow-2xl rounded-xl overflow-hidden my-4">
                <header className="bg-gray-800 p-4 sm:p-6 text-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
                        <Palette size={32} className="text-indigo-400"/> AI Image Studio
                    </h1>
                </header>

                <div className="flex border-b border-gray-300">
                    <TabButton id="portraitStudio" label="Creative Portrait" icon={<User size={18} />} />
                    <TabButton id="imagePlayground" label="Image Playground" icon={<Wand2 size={18} />} />
                </div>

                <div className="p-4 sm:p-6 space-y-6">
                    {activeTab === 'portraitStudio' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center gap-2"><Camera size={22}/> Upload Your Photo</h2>
                                <label htmlFor="imageUpload" className="w-full flex flex-col items-center px-4 py-6 bg-white text-indigo-600 rounded-lg shadow-md border border-dashed border-indigo-400 cursor-pointer hover:bg-indigo-50 transition-colors">
                                    <UploadCloud size={32} className="mb-2"/>
                                    <span className="font-medium">Choose an image</span>
                                    <span className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP (Max 4MB)</span>
                                </label>
                                <input id="imageUpload" type="file" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} className="hidden" />
                                {uploadedImagePreview && (
                                    <div className="mt-4 p-2 border border-gray-300 rounded-lg bg-gray-50">
                                        <img src={uploadedImagePreview} alt="Uploaded preview" className="max-w-full max-h-60 mx-auto rounded-md shadow-sm" />
                                    </div>
                                )}
                                <div className="mt-3">
                                    <ActionButton
                                        onClick={analyzeFace}
                                        label="Analyze Face Features"
                                        icon={<Edit3 size={18} />}
                                        isLoading={isAnalyzingFace}
                                        disabled={!uploadedImage || isAnalyzingFace}
                                        color="purple"
                                    />
                                </div>
                                {/* Using ternary operator for ErrorMessage rendering, ensuring portraitError is a string */}
                                { (typeof portraitError === 'string' && portraitError.trim() !== '' && !faceDescription && !generatedPortrait) 
                                    ? <ErrorMessage message={portraitError} /> 
                                    : null
                                }
                            </div>
                            
                            { (isAnalyzingFace || faceDescription || (portraitError && !uploadedImage) ) && ( 
                                <div className="space-y-3 animate-fadeInQuick">
                                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><User size={20}/> Facial Description</h3>
                                    {isAnalyzingFace && !faceDescription && <p className="text-sm text-gray-500 flex items-center gap-1"><Loader2 className="animate-spin h-4 w-4"/> Analyzing...</p>}
                                    <InputField
                                        id="faceDescriptionInput"
                                        value={faceDescription}
                                        onChange={(e) => setFaceDescription(e.target.value)}
                                        placeholder="AI-generated face description will appear here, or type your own..."
                                        icon={<Edit3 size={16} className="text-gray-400"/>}
                                        type="textarea"
                                        rows={4}
                                    />
                                </div>
                            )}

                            {(faceDescription || scenePrompt) && ( 
                                <div className="space-y-3 animate-fadeInQuick">
                                     <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><Wand2 size={20}/> Scene & Style Prompt</h3>
                                    <InputField
                                        id="scenePromptInput"
                                        value={scenePrompt}
                                        onChange={(e) => setScenePrompt(e.target.value)}
                                        placeholder="e.g., as a medieval knight, in a vibrant cyberpunk city, oil painting style"
                                        icon={<Palette size={16} className="text-gray-400"/>}
                                    />
                                    <ActionButton
                                        onClick={generateCreativePortrait}
                                        label="Generate Creative Portrait"
                                        icon={<Image size={18} />}
                                        isLoading={isGeneratingPortrait}
                                        disabled={!faceDescription || !scenePrompt || isGeneratingPortrait}
                                    />
                                </div>
                            )}
                            
                            <ImageDisplay 
                                src={generatedPortrait} 
                                alt="Generated Portrait" 
                                isLoading={isGeneratingPortrait} 
                                error={(!isGeneratingPortrait && portraitError && generatedPortrait === null && typeof portraitError === 'string') ? portraitError : null}
                                placeholderText="Your creative portrait will appear here." 
                            />
                             {/* Using ternary operator for ErrorMessage rendering, ensuring portraitError is a string */}
                             { (typeof portraitError === 'string' && portraitError.trim() !== '' && !generatedPortrait && !isGeneratingPortrait && !isAnalyzingFace) ?
                                <ErrorMessage message={portraitError} /> : null
                             }
                        </div>
                    )}

                    {activeTab === 'imagePlayground' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center gap-2"><Wand2 size={22}/> Image Playground</h2>
                                <InputField
                                    id="playgroundPromptInput"
                                    value={imagePlaygroundPrompt}
                                    onChange={(e) => setImagePlaygroundPrompt(e.target.value)}
                                    placeholder="e.g., a majestic dragon flying over a futuristic city"
                                    icon={<Palette size={16} className="text-gray-400"/>}
                                />
                                <div className="mt-3">
                                  <ActionButton
                                      onClick={generatePlaygroundImageAction}
                                      label="Generate Image"
                                      icon={<Image size={18} />}
                                      isLoading={isGeneratingPlaygroundImage}
                                      disabled={!imagePlaygroundPrompt || isGeneratingPlaygroundImage}
                                  />
                                </div>
                                {/* Using ternary operator for ErrorMessage rendering, ensuring playgroundError is a string */}
                                { (typeof playgroundError === 'string' && playgroundError.trim() !== '' && !generatedPlaygroundImage && !isGeneratingPlaygroundImage) ?
                                    <ErrorMessage message={playgroundError} /> : null
                                }
                            </div>
                            <ImageDisplay 
                                src={generatedPlaygroundImage} 
                                alt="Generated Playground Image" 
                                isLoading={isGeneratingPlaygroundImage}
                                error={(!isGeneratingPlaygroundImage && playgroundError && generatedPlaygroundImage === null && typeof playgroundError === 'string') ? playgroundError : null}
                                placeholderText="Your generated image will appear here."
                            />
                        </div>
                    )}
                </div>
                <footer className="text-center p-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-500">AI Image Studio &copy; 2025. Powered by Google AI.</p>
                </footer>
            </div>
            <style jsx global>{`
                .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
                .animate-fadeInQuick { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default App;