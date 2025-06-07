import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useQuizStore } from '../../store/quizStore';
import { useAuthStore } from '../../store/authStore';
import { QuizConfig, Quiz } from '../../types'; // Ensure QuizConfig type is imported and updated
import toast from 'react-hot-toast';

interface QuizFormState {
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  quizType: 'multiple_choice' | 'true_false';
  event: string;
  team: string;
  country: string;
}

interface QuizFormErrors {
  title?: string;
  category?: string;
  numberOfQuestions?: string;
  quizType?: string;
  event?: string;
  team?: string;
  country?: string;
}

interface QuizFormProps {
  onQuizGenerated: (quiz: Quiz) => void;
  // Props for displaying parent's generation state (e.g., auto-generation)
  isGenerating?: boolean; 
  generationError?: string | null;
  // NEW: Prop for initial configuration (e.g., from "Play Similar Quiz")
  initialQuizConfig?: QuizConfig; 
  // NEW: Callbacks for parent to manage its state when THIS form initiates generation
  onGenerationStart: () => void; 
  onGenerationError: (errorMessage: string) => void; 
}

const QuizForm: React.FC<QuizFormProps> = ({ 
  onQuizGenerated, 
  isGenerating, 
  generationError, 
  initialQuizConfig,
  onGenerationStart,
  onGenerationError
}) => {
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

  const [errors, setErrors] = useState<QuizFormErrors>({});

  // Consolidate loading/error states: prefer props (for auto-gen), then store's internal state
  const loading = isGenerating !== undefined ? isGenerating : storeLoading;
  const currentError = generationError !== undefined ? generationError : storeError;

  // Memoize validateForm with useCallback to prevent unnecessary re-creations
  const validateForm = useCallback((): boolean => {
    const newErrors: QuizFormErrors = {};
    if (!formState.category.trim()) {
      newErrors.category = 'Category is required.';
    }
    if (formState.numberOfQuestions < 1 || formState.numberOfQuestions > 20) {
      newErrors.numberOfQuestions = 'Number of questions must be between 1 and 20.';
    }

    // Only update errors state if it has actually changed to prevent unnecessary re-renders
    if (JSON.stringify(newErrors) !== JSON.stringify(errors)) {
      setErrors(newErrors);
    }
    return Object.keys(newErrors).length === 0;
  }, [formState, errors]); // Dependencies for useCallback: re-create if formState or current errors change

  // Effect to re-validate form whenever formState changes
  useEffect(() => {
    validateForm();
  }, [formState, validateForm]); // Re-run validation whenever formState or validateForm changes

  // Effect to set initial form state if initialQuizConfig is provided (e.g., from "Play Similar Quiz")
  useEffect(() => {
    if (initialQuizConfig) {
      setFormState({
        title: initialQuizConfig.title || '',
        category: initialQuizConfig.category || '',
        difficulty: initialQuizConfig.difficulty || 'medium',
        numberOfQuestions: initialQuizConfig.numberOfQuestions || 5,
        quizType: initialQuizConfig.quizType || 'multiple_choice',
        event: initialQuizConfig.event || '',
        team: initialQuizConfig.team || '',
        country: initialQuizConfig.country || '',
      });
      // Errors will be cleared by the useEffect above once formState updates from initialConfig
    }
  }, [initialQuizConfig]); // Re-run when initialQuizConfig changes

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: name === 'numberOfQuestions' ? parseInt(value) || 0 : value,
    }));
    // No need to clear specific error here, as the useEffect will handle full re-validation
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validate form one last time on submit to ensure latest state is checked
    const isValid = validateForm(); // This will also update the errors state
    if (!isValid) {
      toast.error('Please correct the form errors.');
      return;
    }

    // Call the parent's start handler to update its loading state
    onGenerationStart(); 

    const visibility: 'global' | 'private' = user?.isAdmin ? 'global' : 'private';

    const quizConfig: QuizConfig = {
      // ✅ Now this is type-safe because QuizConfig allows `null`
      title: formState.title.trim() === '' ? null : formState.title.trim(), 
      category: formState.category.trim(), // Category is required, so it won't be empty
      difficulty: formState.difficulty,
      numberOfQuestions: formState.numberOfQuestions,
      team: formState.team.trim() === '' ? null : formState.team.trim(), 
      event: formState.event.trim() === '' ? null : formState.event.trim(), 
      country: formState.country.trim() === '' ? null : formState.country.trim(), 
      visibility,
      quizType: formState.quizType,
    };

    try {
      const generatedQuiz = await generateQuiz(quizConfig);

      if (generatedQuiz) {
        onQuizGenerated(generatedQuiz); // Pass the generated quiz back to the parent
        setFormState({ // Reset form fields after successful generation
            title: '',
            category: '',
            difficulty: 'medium',
            numberOfQuestions: 5,
            quizType: 'multiple_choice',
            event: '',
            team: '',
            country: '',
        });
        toast.success(`Successfully generated quiz "${generatedQuiz.title || formState.category}"!`);
      } else {
        toast.error('Quiz generation succeeded but returned no quiz data. Please try again.');
        onGenerationError('Quiz generation succeeded but returned no quiz data.');
      }

    } catch (err: any) {
      toast.error(err.message || 'Failed to generate quiz. Please try again.');
      onGenerationError(err.message || 'Failed to generate quiz.');
    }
  };

  const hasErrors = Object.keys(errors).length > 0; // This will now accurately reflect real-time validation

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Generate New Quiz</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {currentError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{currentError}</span>
          </div>
        )}
        
        <Input
          label="Title (optional)"
          id="title"
          name="title"
          type="text"
          value={formState.title}
          onChange={handleChange}
          placeholder="e.g., Premier League Trivia"
          className="mt-1 block w-full"
          error={errors.title}
        />

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
          error={errors.category}
        />

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
          error={errors.numberOfQuestions}
        />

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

        <Input
          label="Specific Team (Optional)"
          id="team"
          name="team"
          type="text"
          value={formState.team}
          onChange={handleChange}
          placeholder="e.g., Real Madrid, Lakers"
          className="mt-1 block w-full"
          error={errors.team}
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
          error={errors.event}
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
          error={errors.country}
        />

        <Button
          type="submit"
          className="w-full py-2 px-4 rounded-md shadow-sm text-lg"
          isLoading={loading}
          disabled={loading || hasErrors}
        >
          {loading ? 'Generating...' : 'Generate Quiz'}
        </Button>
      </form>
    </div>
  );
};

export default QuizForm;