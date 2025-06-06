// src/pages/GenerateQuizPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react'; // For error icons, consistent with other UI
import QuizForm from '../components/admin/QuizForm'; // ⭐ Import the refactored QuizForm
import QuizPlayer from '../components/quiz/QuizPlayer'; // ⭐ Import QuizPlayer for the preview
import { Quiz } from '../types'; // Import Quiz type
import { useQuizStore } from '../store/quizStore'; // To use saveQuiz, and potentially global loading/error

const GenerateQuizPage: React.FC = () => {
  const navigate = useNavigate();
  // We'll manage the generatedQuiz, loading, and error states directly in this page
  // because QuizForm will now pass them up via props and its own internal state.
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const saveQuiz = useQuizStore((state) => state.saveQuiz); // Function to save the generated quiz

  // This callback will be passed to QuizForm
  const handleQuizGenerated = (quiz: Quiz) => {
    setGeneratedQuiz(quiz);
    setIsGenerating(false); // Generation is complete
    setGenerationError(null); // Clear any previous errors
  };

  // This function is for handling errors that might bubble up from QuizForm
  // or for the initial state of the generation process
  // NOTE: For now, QuizForm internally manages its own loading/error,
  // but if you want to set these at the page level before generation, you'd call this.
  const handleGenerationStart = () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedQuiz(null); // Clear previous quiz when new generation starts
  };

  const handleGenerationError = (errorMessage: string) => {
    setIsGenerating(false);
    setGenerationError(errorMessage);
    setGeneratedQuiz(null); // Clear quiz if there's an error
  };

  const handleSaveGeneratedQuiz = async () => {
    if (!generatedQuiz) {
      setGenerationError('No quiz to save. Please generate one first.');
      return;
    }

    try {
      // The saveQuiz function in your store likely takes the full Quiz object
      await saveQuiz(generatedQuiz);
      alert('Generated quiz saved to Firestore!');
      setGeneratedQuiz(null); // Clear the preview after saving
      // Optionally navigate to a page showing saved quizzes
      navigate('/admin/quizzes'); // Example path
    } catch (saveError: any) {
      console.error('Error saving generated quiz:', saveError);
      setGenerationError(saveError.message || 'Failed to save generated quiz.');
    }
  };

  const handlePlayGeneratedQuiz = () => {
    if (generatedQuiz) {
      // Navigate to the /quiz/:id page to play the generated quiz
      // The QuizPlayer on that page will fetch the quiz by ID
      navigate(`/quiz/${generatedQuiz.id}`);
    } else {
      setGenerationError('No quiz to play. Please generate one first.');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">Generate and Preview Quiz</h1>

      {/* Two-Column Layout */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column: Quiz Generation Form */}
        <div className="md:w-1/2">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Quiz Configuration</h2>
          <QuizForm
            onQuizGenerated={handleQuizGenerated}
            isGenerating={isGenerating} // Pass loading state to QuizForm
            generationError={generationError} // Pass error state to QuizForm
            // QuizForm manages its own submission and loading/error states,
            // this page mostly reacts to its `onQuizGenerated` callback.
            // `isGenerating` and `generationError` props are for QuizForm to display them
            // based on the parent's external control.
          />
        </div>

        {/* Right Column: Quiz Preview */}
        <div className="md:w-1/2">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">Quiz Preview</h2>
          <div className="bg-white p-6 rounded-lg shadow-md min-h-[300px] flex flex-col justify-between">
            {isGenerating && (
              <div className="flex items-center justify-center h-full text-blue-600 text-lg">
                <AlertCircle className="h-6 w-6 mr-2 animate-spin" />
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
                {/* ⭐ MODIFIED: Pass generatedQuiz as quizData to match QuizPlayer's prop name */}
                {/* Also remove showResultsImmediately if QuizPlayer doesn't explicitly use it for the main flow */}
                <QuizPlayer quizData={generatedQuiz} />
                {/* Action buttons for the generated quiz */}
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