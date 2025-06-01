// src/pages/GenerateQuizPage.tsx
import React, { useState } from 'react';
import { useQuizStore } from '../store/quizStore';
import { Quiz } from '../types'; // Assuming your Quiz type is defined in '../types'
import { useNavigate } from 'react-router-dom'; // Assuming you're using React Router for navigation

const GenerateQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const generateQuiz = useQuizStore((state) => state.generateQuiz);
  const loading = useQuizStore((state) => state.loading);
  const error = useQuizStore((state) => state.error);
  const saveQuiz = useQuizStore((state) => state.saveQuiz); // Function to save the generated quiz

  // State for form inputs, ensuring 'category' is initialized as a string
  const [category, setCategory] = useState<string>('');
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | undefined>(undefined);
  const [title, setTitle] = useState<string>('');
  // Add states for other optional filters if you use them in the form
  const [team, setTeam] = useState<string>('');
  const [event, setEvent] = useState<string>('');
  const [country, setCountry] = useState<string>('');

  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Basic client-side validation for category
    if (!category.trim()) { // .trim() ensures it's not just whitespace
      alert('Please enter a category to generate the quiz.');
      return;
    }

    try {
      // Call generateQuiz with the correct type for filter.category
      const quiz = await generateQuiz({
        category: category, // This is now guaranteed to be a string
        numberOfQuestions: numberOfQuestions,
        difficulty: difficulty,
        title: title.trim() === '' ? undefined : title.trim(), // Pass undefined if empty
        team: team.trim() === '' ? undefined : team.trim(),
        event: event.trim() === '' ? undefined : event.trim(),
        country: country.trim() === '' ? undefined : country.trim(),
        // visibility is usually not set by the client for generation,
        // it's handled by the Cloud Function based on user roles.
      });
      setGeneratedQuiz(quiz);
      alert('Quiz generated successfully!');

      // Optionally, if the cloud function doesn't save it automatically,
      // you can offer to save it here, or call saveQuiz directly.
      // For this example, we'll keep the separate "Save Generated Quiz" button.

    } catch (err: any) {
      console.error('Failed to generate quiz:', err);
      // The error message from the store will be displayed via the `error` state
    }
  };

  const handleSaveGeneratedQuiz = async () => {
    if (generatedQuiz) {
      try {
        await saveQuiz(generatedQuiz);
        alert('Generated quiz saved to Firestore!');
        // After saving, you might want to clear the form or navigate
        setGeneratedQuiz(null); // Clear the preview
        setCategory(''); // Reset form fields
        setNumberOfQuestions(5);
        setDifficulty(undefined);
        setTitle('');
        setTeam('');
        setEvent('');
        setCountry('');
        navigate('/admin/quizzes'); // Navigate to a list of quizzes, for example
      } catch (saveError) {
        console.error('Error saving generated quiz:', saveError);
        alert('Failed to save generated quiz.');
      }
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Generate New Quiz</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category: <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required // HTML5 validation for required field
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Football, Basketball, Olympics"
          />
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title (Optional):
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 2024 Euros Quiz"
          />
        </div>

        <div>
          <label htmlFor="numberOfQuestions" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Questions: <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="numberOfQuestions"
            value={numberOfQuestions}
            onChange={(e) => setNumberOfQuestions(parseInt(e.target.value, 10) || 1)} // Ensure it's a number, default to 1
            min="1"
            max="20" // Optional: set a max number of questions
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty:
          </label>
          <select
            id="difficulty"
            value={difficulty || ''} // Handle undefined for initial render of select
            onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard' | undefined)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label htmlFor="team" className="block text-sm font-medium text-gray-700 mb-1">
            Team (Optional):
          </label>
          <input
            type="text"
            id="team"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Manchester United"
          />
        </div>

        <div>
          <label htmlFor="event" className="block text-sm font-medium text-gray-700 mb-1">
            Event (Optional):
          </label>
          <input
            type="text"
            id="event"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., World Cup 2022"
          />
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
            Country (Optional):
          </label>
          <input
            type="text"
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Brazil"
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Quiz'}
        </button>
      </form>

      {error && (
        <p className="text-red-600 bg-red-100 p-3 rounded-md mt-4 border border-red-200">
          Error: {error}
        </p>
      )}

      {generatedQuiz && (
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-green-800 mb-4">Generated Quiz Preview</h2>
          <div className="space-y-2 text-gray-700">
            <p><strong>Title:</strong> {generatedQuiz.title || 'N/A'}</p>
            <p><strong>Category:</strong> {generatedQuiz.category}</p>
            <p><strong>Difficulty:</strong> {generatedQuiz.difficulty || 'N/A'}</p>
            <p><strong>Questions:</strong> {generatedQuiz.questions.length}</p>
            <p><strong>Created By:</strong> {generatedQuiz.createdBy}</p>
            <p><strong>Visibility:</strong> {generatedQuiz.visibility}</p>
          </div>
          <button
            onClick={handleSaveGeneratedQuiz}
            className="mt-6 px-5 py-2 bg-green-700 text-white font-semibold rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Save Generated Quiz
          </button>
        </div>
      )}
    </div>
  );
};

export default GenerateQuizPage;