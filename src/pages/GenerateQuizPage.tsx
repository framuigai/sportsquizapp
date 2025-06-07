// src/pages/GenerateQuizPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import QuizForm from '../components/admin/QuizForm';
import QuizPlayer from '../components/quiz/QuizPlayer';
import { Quiz, QuizConfig } from '../types';
import { useQuizStore } from '../store/quizStore';
import toast from 'react-hot-toast';

const GenerateQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const saveQuiz = useQuizStore((state) => state.saveQuiz);
  const { generateQuiz } = useQuizStore();

  // State to hold initial quiz config passed from other pages (e.g., QuizResult)
  const [initialConfig, setInitialConfig] = useState<QuizConfig | null>(null);

  // Effect to check for initial quiz config on component mount
  useEffect(() => {
    if (location.state?.initialQuizConfig) {
      const config = location.state.initialQuizConfig as QuizConfig;
      setInitialConfig(config);
      // Clean up the state so it doesn't persist on refresh or subsequent visits
      // Using navigate with replace: true ensures the current history entry is replaced
      // and state is cleared, preventing re-triggering on back/forward navigation.
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Effect to trigger generation when initialConfig is set
  useEffect(() => {
    const triggerAutoGeneration = async () => {
      if (initialConfig) {
        handleGenerationStart(); // Set generating state for the parent page's display
        try {
          const quiz = await generateQuiz(initialConfig); // Call the store's generation function
          handleQuizGenerated(quiz); // Update generated quiz state
          toast.success('Generated a similar quiz!'); // Notify user
        } catch (err: any) {
          handleGenerationError(err.message || 'Failed to generate quiz automatically.');
        } finally {
          setInitialConfig(null); // Clear initial config after attempt to prevent re-generation
        }
      }
    };
    triggerAutoGeneration();
  }, [initialConfig, generateQuiz]); // Depend on initialConfig and generateQuiz

  const handleQuizGenerated = (quiz: Quiz) => {
    setGeneratedQuiz(quiz);
    setIsGenerating(false);
    setGenerationError(null);
  };

  const handleGenerationStart = () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedQuiz(null);
  };

  const handleGenerationError = (errorMessage: string) => {
    setIsGenerating(false);
    setGenerationError(errorMessage);
    setGeneratedQuiz(null);
  };

  const handleSaveGeneratedQuiz = async () => {
    if (!generatedQuiz) {
      toast.error('No quiz to save. Please generate one first.');
      return;
    }

    try {
      await saveQuiz(generatedQuiz);
      toast.success('Generated quiz saved successfully!');
      setGeneratedQuiz(null); // Clear the preview after saving
      navigate('/my-quizzes'); // Navigate to my quizzes after saving
    } catch (saveError: any) {
      console.error('Error saving generated quiz:', saveError);
      toast.error(saveError.message || 'Failed to save generated quiz.');
    }
  };

  const handlePlayGeneratedQuiz = () => {
    if (generatedQuiz) {
      navigate(`/quiz/${generatedQuiz.id}`);
    } else {
      toast.error('No quiz to play. Please generate one first.');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Generate and Preview Quiz</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-1/2">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Quiz Configuration</h2>
          <QuizForm
            onQuizGenerated={handleQuizGenerated}
            isGenerating={isGenerating} 
            generationError={generationError} 
            initialQuizConfig={initialConfig || undefined} // Pass initialConfig to QuizForm
            onGenerationStart={handleGenerationStart} // Pass these to QuizForm to manage parent state
            onGenerationError={handleGenerationError} // Pass these to QuizForm to manage parent state
          />
        </div>

        <div className="md:w-1/2">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Quiz Preview</h2>
          <div className="bg-white p-6 rounded-lg shadow-md min-h-[300px] flex flex-col justify-between">
            {isGenerating && (
              <div className="flex items-center justify-center h-full text-blue-600 text-lg">
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                Generating quiz...
              </div>
            )}

            {generationError && !isGenerating && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-center h-full">
                <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
                <span>Error: {generationError}</span>
              </div>
            )}

            {!generatedQuiz && !isGenerating && !generationError && (
              <div className="flex items-center justify-center h-full text-gray-500 text-lg">
                Your generated quiz will appear here.
              </div>
            )}

            {generatedQuiz && !isGenerating && !generationError && (
              <>
                <QuizPlayer quizData={generatedQuiz} />
                <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-end">
                  <button
                    onClick={handlePlayGeneratedQuiz}
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Play Quiz
                  </button>
                  <button
                    onClick={handleSaveGeneratedQuiz}
                    className="px-6 py-2 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Save to My Quizzes
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateQuizPage;