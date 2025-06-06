// src/components/admin/QuizForm.tsx
import React, { useState, FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select'; // Ensure this import points to your new Select.tsx file
import { useQuizStore } from '../../store/quizStore';
import { useAuthStore } from '../../store/authStore';
import { QuizConfig, Quiz } from '../../types';

// ⭐ MODIFIED: QuizFormState - Changed optional string types to just 'string'
// This matches your useState initialization where they are empty strings.
interface QuizFormState {
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  quizType: 'multiple_choice' | 'true_false';
  event: string; // Changed from event?: string;
  team: string;   // Changed from team?: string;
  country: string; // Changed from country?: string;
}

// Props for the QuizForm component to accept the callback and external state
interface QuizFormProps {
  onQuizGenerated: (quiz: Quiz) => void; // Callback to pass the generated quiz
  isGenerating?: boolean; // Optional prop for parent to control loading state
  generationError?: string | null; // Optional prop for parent to control error state
}

const QuizForm: React.FC<QuizFormProps> = ({ onQuizGenerated, isGenerating, generationError }) => {
  const { user } = useAuthStore();
  const { generateQuiz, loading: storeLoading, error: storeError } = useQuizStore();

  const [formState, setFormState] = useState<QuizFormState>({
    title: '',
    category: '',
    difficulty: 'medium',
    numberOfQuestions: 5,
    quizType: 'multiple_choice',
    event: '',
    team: '',
    country: '',
  });

  const [localMessage, setLocalMessage] = useState<string | null>(null);

  // Consolidate loading/error states: prefer props, then store, then local
  const loading = isGenerating !== undefined ? isGenerating : storeLoading;
  const error = generationError !== undefined ? generationError : (storeError || localMessage);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: name === 'numberOfQuestions' ? parseInt(value) || 0 : value,
    }));
    setLocalMessage(null); // Clear messages on change
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalMessage(null); // Clear previous messages

    // Basic client-side validation
    if (!formState.category.trim()) {
      setLocalMessage('Category is required.');
      return;
    }
    if (formState.numberOfQuestions < 1 || formState.numberOfQuestions > 20) {
      setLocalMessage('Number of questions must be between 1 and 20.');
      return;
    }

    // Determine visibility based on user's admin status
    // The generateQuiz Cloud Function determines final visibility,
    // so this 'visibility' parameter acts as a suggestion/default.
    const visibility: 'global' | 'private' = user?.isAdmin ? 'global' : 'private';

    // Construct the quiz configuration to send to the backend
    const quizConfig: QuizConfig = {
      title: formState.title.trim() || undefined, // Convert empty string to undefined for optional fields
      category: formState.category.trim(),
      difficulty: formState.difficulty,
      numberOfQuestions: formState.numberOfQuestions,
      team: formState.team.trim() || undefined,
      event: formState.event.trim() || undefined,
      country: formState.country.trim() || undefined,
      visibility,
      quizType: formState.quizType, // Pass the selected quizType
    };

    try {
      const generatedQuiz = await generateQuiz(quizConfig);

      if (generatedQuiz) {
        onQuizGenerated(generatedQuiz); // Call the callback with the generated quiz

        // Reset form fields after successful generation
        setFormState({
            title: '',
            category: '',
            difficulty: 'medium',
            numberOfQuestions: 5,
            quizType: 'multiple_choice',
            event: '',
            team: '',
            country: '',
        });
        setLocalMessage(`Successfully generated quiz "${generatedQuiz.title}"!`);
      } else {
          setLocalMessage('Quiz generation succeeded but returned no quiz data.');
      }

    } catch (err: any) {
      setLocalMessage(err.message || 'Failed to generate quiz. Please try again.');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Generate New Quiz</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error/Message Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {localMessage && !error && (
             <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md flex items-start">
                 <span>{localMessage}</span>
             </div>
        )}

        {/* Input for Quiz Title */}
        <Input
          label="Title (optional)"
          id="title"
          name="title"
          type="text"
          value={formState.title}
          onChange={handleChange}
          placeholder="e.g., Premier League Trivia"
          className="mt-1 block w-full"
        />

        {/* Input for Category */}
        <Input
          label="Category *"
          id="category"
          name="category"
          type="text"
          value={formState.category}
          onChange={handleChange}
          placeholder="e.g., Football, Basketball"
          className="mt-1 block w-full"
          required
        />

        {/* ⭐ MODIFIED: Using the new Select component for Difficulty ⭐ */}
        <Select
          label="Difficulty"
          id="difficulty"
          name="difficulty"
          value={formState.difficulty}
          onChange={handleChange}
          className="mt-1 block w-full"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>

        {/* Input for Number of Questions */}
        <Input
          label="Number of Questions (1-20)"
          id="numberOfQuestions"
          name="numberOfQuestions"
          type="number"
          value={formState.numberOfQuestions}
          onChange={handleChange}
          min="1"
          max="20"
          className="mt-1 block w-full"
          required
        />

        {/* ⭐ NEW: Using the new Select component for Quiz Type ⭐ */}
        <Select
          label="Quiz Type"
          id="quizType"
          name="quizType"
          value={formState.quizType}
          onChange={handleChange}
          className="mt-1 block w-full"
        >
          <option value="multiple_choice">Multiple Choice</option>
          <option value="true_false">True/False</option>
        </Select>

        {/* Optional fields (now using the Input component's label prop) */}
        <Input
          label="Specific Team (Optional)"
          id="team"
          name="team"
          type="text"
          value={formState.team}
          onChange={handleChange}
          placeholder="e.g., Real Madrid, Lakers"
          className="mt-1 block w-full"
        />
        <Input
          label="Specific Event (Optional)"
          id="event"
          name="event"
          type="text"
          value={formState.event}
          onChange={handleChange}
          placeholder="e.g., World Cup, Olympics"
          className="mt-1 block w-full"
        />
        <Input
          label="Specific Country (Optional)"
          id="country"
          name="country"
          type="text"
          value={formState.country}
          onChange={handleChange}
          placeholder="e.g., Brazil, USA"
          className="mt-1 block w-full"
        />

        <Button
          type="submit"
          className="w-full py-2 px-4 rounded-md shadow-sm text-lg"
          isLoading={loading}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Generate Quiz'}
        </Button>
      </form>
    </div>
  );
};

export default QuizForm;