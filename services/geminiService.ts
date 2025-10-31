
import { GoogleGenAI, GenerateContentResponse, Modality, Chat, VideosOperation, GenerateVideosResponse, LiveSession, LiveCallbacks, Type, FunctionDeclaration, GenerateContentParameters, Video } from "@google/genai";

// Assume API_KEY is set in the environment
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("API_KEY environment variable not set. Some features may not work.");
}

const getAiClient = () => new GoogleGenAI({ apiKey: API_KEY });

const APP_CONTEXT_INSTRUCTION = `You are an expert AI assistant integrated into "AI Music Studio Pro". This is an all-in-one application designed to help musicians and creators generate complete musical packages. The user can write lyrics, generate vocal tracks, create cover art, produce music videos, and get monetization advice. Your goal is to provide creative, helpful, and context-aware assistance for their music projects.`;

// --- Text & Chat Services ---

export const getInspiration = async (): Promise<string> => {
    const ai = getAiClient();
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `${APP_CONTEXT_INSTRUCTION} Your task is to provide inspiration for a new song.`
        },
        contents: `Suggest three interesting and unique song concepts. For each, provide a title and a brief one-sentence description. Format it as a simple list.`,
    });
    return result.text;
};

export const generateLyricsForWizard = async (prompt: string): Promise<string> => {
    const ai = getAiClient();
    const wizardPrompt = `
        You are an expert songwriter AI for the "AI Music Studio Pro" app. Your task is to transform a user's idea into a complete, well-structured song with compelling lyrics.

        **User's Idea:**
        ---
        ${prompt}
        ---

        **Your Process:**
        1.  **Analyze the Idea:** Briefly determine the core theme, mood, and narrative of the user's prompt.
        2.  **Define a Structure:** Choose a standard song structure (e.g., Verse-Chorus-Verse-Chorus-Bridge-Chorus-Outro).
        3.  **Write the Lyrics:** Write the full lyrics, following the structure you defined. Ensure the lyrics have a consistent rhyme scheme, rhythm, and emotional arc.
        4.  **Format the Output:** Present the final lyrics clearly, with labels for each section (e.g., [Verse 1], [Chorus], [Bridge]). Do not include your analysis or any other text, only the formatted lyrics.

        Generate the song lyrics now.
    `;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        config: {
            systemInstruction: APP_CONTEXT_INSTRUCTION,
        },
        contents: wizardPrompt,
    });

    return result.text;
};

export const generateChatResponse = async (
    history: GenerateContentParameters[], 
    prompt: string, 
    useThinking: boolean, 
    useSearch: boolean,
    proSettings: { temperature?: number, topP?: number }
): Promise<GenerateContentResponse> => {
    const ai = getAiClient();
    const modelName = useThinking ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    
    const config: any = { 
        ...proSettings,
        systemInstruction: `${APP_CONTEXT_INSTRUCTION} You are currently in the 'Songwriting Assistant' module. Your primary role is to act as a creative partner for songwriting. Help the user brainstorm lyrics, develop themes, structure songs, and explore musical ideas.`
    };
    
    if (useThinking) {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }
    
    if (useSearch) {
        config.tools = [{ googleSearch: {} }];
    }

    return ai.models.generateContent({
        model: modelName,
        contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
        config,
    });
};

export const generateMonetizationPlan = async (songDescription: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
        An artist has just created a new song and needs a comprehensive monetization and promotion plan.

        **Song Description:**
        ---
        ${songDescription}
        ---

        **Your Task:**
        Create a detailed, actionable marketing plan with a focus on YouTube, TikTok, and Instagram. The plan should be easy to follow and include creative, platform-specific ideas. Structure your response with clear headings.

        **Include the following sections:**
        1.  **Overall Strategy:** A brief summary of the song's potential audience and the core marketing angle.
        2.  **YouTube Promotion Plan:**
            *   Suggest 2-3 specific video content ideas beyond the official music video (e.g., lyric video with a unique visual style, behind-the-scenes, live acoustic version).
            *   Provide advice on video titles, descriptions, and tags for discoverability.
            *   Suggest YouTube Shorts ideas.
        3.  **TikTok Promotion Plan:**
            *   Propose a specific, catchy trend or challenge that could be created for the song.
            *   Suggest 3-5 short video concepts that are easy for other users to recreate.
            *   List relevant hashtags.
        4.  **Instagram Promotion Plan:**
            *   Suggest ideas for Reels that showcase the song.
            *   Provide ideas for Feed posts (e.g., cover art reveal, carousel with lyrics).
            *   Suggest ideas for Stories to engage with followers (e.g., polls, Q&A about the song).
        5.  **Monetization Tips:** Briefly mention key ways to monetize beyond streaming, such as YouTube Content ID, merchandise ideas related to the song, and leveraging the song on creator platforms.

        Generate the plan now.
    `;
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        config: {
            systemInstruction: `${APP_CONTEXT_INSTRUCTION} You are in the 'Monetization & Promotion Hub'. Your task is to act as an expert digital marketing strategist for independent musicians.`
        },
        contents: prompt
    });
    return result.text;
};

export const generateArtConcepts = async (lyrics: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
        You are a creative director AI for the "AI Music Studio Pro" app.
        Based on the provided song lyrics, generate 3 distinct and visually compelling concepts for the song's cover art.
        Each concept should be a single, descriptive sentence, focusing on mood, imagery, and style.

        **Lyrics:**
        ---
        ${lyrics}
        ---

        Format the output as a simple list. Do not add any extra commentary before or after the list.
        Example:
        - A lone astronaut looking at a neon-lit Earth from a dark spaceship window.
        - A close-up on a cracked, vintage photograph of two smiling people, with rain effects overlaid.
        - An abstract explosion of vibrant colors, representing a chaotic and beautiful emotion.
    `;
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `${APP_CONTEXT_INSTRUCTION} Your task is to brainstorm creative cover art ideas based on song lyrics.`
        },
        contents: prompt
    });
    return result.text;
};


// --- Audio Services ---

export const generateSpeech = async (text: string, voiceName: string, vocalStyle?: string): Promise<string | null> => {
    const ai = getAiClient();
    const textToGenerate = vocalStyle ? `Say with this style/emotion: ${vocalStyle}. The text to say is: "${text}"` : text;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textToGenerate }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? null;
    } catch (error) {
        console.error("Error generating speech:", error);
        return null;
    }
};

export const connectToVocalCoach = (callbacks: LiveCallbacks): Promise<LiveSession> => {
    const ai = getAiClient();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: `You are a friendly and encouraging vocal coach within the "AI Music Studio Pro" application. The user is practicing their singing and needs real-time feedback, tips, and exercises. Keep your responses concise, positive, and helpful.`,
        },
    });
};

export const startTranscriptionSession = (callbacks: LiveCallbacks): Promise<LiveSession> => {
    const ai = getAiClient();
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks,
        config: {
            inputAudioTranscription: {},
            systemInstruction: `You are a highly accurate real-time audio transcription service.`,
        },
    });
};

// --- Image Services ---

export const generateImage = async (prompt: string, negativePrompt: string, aspectRatio: string, imageStyle?: string, songDescription?: string): Promise<string | null> => {
    const ai = getAiClient();
    let fullPrompt = prompt;
    if (songDescription) {
        fullPrompt = `Inspired by a song with this theme: "${songDescription}", create the following image: ${prompt}`;
    }
    if (imageStyle) {
        fullPrompt = `${fullPrompt}, in the style of ${imageStyle}`;
    }
    if (negativePrompt.trim()) {
        fullPrompt += `. Negative prompt: ${negativePrompt}`;
    }

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio,
            },
        });
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
};

export const editImage = async (prompt: string, base64ImageData: string, mimeType: string): Promise<string | null> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (error) {
        console.error("Error editing image:", error);
        return null;
    }
};

// --- Video Services ---

export const generateStoryboard = async (lyrics: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `
        Analyze the following song lyrics and generate a detailed, creative, and synchronized shot-by-shot storyboard prompt for a music video.
        The output should be a single, long text prompt that can be directly used with a video generation AI like Veo.
        
        **Instructions:**
        1.  **Analyze Structure:** Identify verses, choruses, bridges, and outros in the lyrics.
        2.  **Visual Theme:** Establish a consistent visual theme that matches the mood and narrative of the lyrics.
        3.  **Pacing and Rhythm:** Describe shots with pacing that matches the song's likely tempo and energy (e.g., "quick cuts during the energetic chorus," "a long, slow pan during the introspective verse").
        4.  **Scene Descriptions:** For each section of the lyrics, describe the scene, setting, characters (if any), actions, and mood.
        5.  **Camera Work:** Suggest specific camera angles and movements (e.g., "extreme close-up," "dynamic drone shot," "handheld camera following the singer").
        6.  **Seamless Prompt:** Combine all these elements into a flowing, descriptive paragraph. Do not use bullet points or numbered lists in the final output. The entire output must be a single block of text.

        **Lyrics to Analyze:**
        ---
        ${lyrics}
        ---

        Generate the storyboard prompt now.
    `;
    const result = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        config: {
            systemInstruction: `${APP_CONTEXT_INSTRUCTION} You are in the 'Video Studio'. Your task is to act as a creative music video director, translating lyrics into a visual storyboard.`
        },
        contents: prompt
    });
    return result.text;
}

export const generateVideo = async (prompt: string, aspectRatio: "16:9" | "9:16", videoStyle?: string, image?: { base64Data: string; mimeType: string }): Promise<VideosOperation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    const imagePayload = image ? { image: { imageBytes: image.base64Data, mimeType: image.mimeType } } : {};
    // Note: Video style is now prepended to the prompt for better control.
    const finalPrompt = videoStyle ? `A music video with a ${videoStyle} style. ${prompt}` : prompt;
    
    return ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: finalPrompt,
        ...imagePayload,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio,
        }
    });
};

export const extendVideo = async (prompt: string, previousVideo: Video): Promise<VideosOperation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    return ai.models.generateVideos({
        model: 'veo-3.1-generate-preview', // Extension requires the generate-preview model
        prompt,
        video: previousVideo,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: previousVideo.aspectRatio as '16:9' | '9:16',
        }
    });
};

export const checkVideoStatus = async (operation: VideosOperation<GenerateVideosResponse>): Promise<VideosOperation<GenerateVideosResponse>> => {
    const ai = getAiClient();
    return ai.operations.getVideosOperation({ operation });
};

export const analyzeVideo = async (prompt: string, videoFrames: { mimeType: string, data: string }[]): Promise<string> => {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        config: {
            systemInstruction: `${APP_CONTEXT_INSTRUCTION} You are in the 'Video Analyzer' tool. Your task is to analyze video content from a technical and artistic perspective to help the user understand its visual elements.`
        },
        contents: [
            {
                parts: [
                    { text: prompt },
                    ...videoFrames.map(frame => ({
                        inlineData: {
                            mimeType: frame.mimeType,
                            data: frame.data
                        }
                    }))
                ]
            }
        ]
    });
    return response.text;
};