import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useQuizStore } from '../../store/quizStore';
import { useAuthStore } from '../../store/authStore';

interface QuizFormState {
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  event?: string;
  team?: string;
  country?: string;
  resultMessage: string | null;
}

const QuizForm: React.FC = () => {
  const { user } = useAuthStore();
  const { generateQuiz, saveQuiz, loading, error } = useQuizStore();

  const [state, setState] = useState<QuizFormState>({
    title: '',
    category: '',
    difficulty: 'medium',
    event: '',
    team: '',
    country: '',
    resultMessage: null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.category.trim()) {
      setState(prev => ({ ...prev, resultMessage: 'Category is required' }));
      return;
    }

    try {
      // Generate the quiz
      const quiz = await generateQuiz({
        title: state.title,
        category: state.category,
        difficulty: state.difficulty,
        team: state.team,
        event: state.event,
        country: state.country,
      });

      // Save the quiz to Firestore
      await saveQuiz(quiz);

      setState(prev => ({
        ...prev,
        resultMessage: quiz.questions?.length
          ? `Successfully generated quiz with ${quiz.questions.length} questions!`
          : 'Generated quiz had no questions'
      }));
           
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate quiz';
      setState(prev => ({ ...prev, resultMessage: errorMessage }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || state.resultMessage) && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{state.resultMessage || error}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Generate a Quiz</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title (optional)"
            name="title"
            value={state.title}
            onChange={handleChange}
            placeholder="Custom quiz title"
          />
          <Input
            label="Category"
            name="category"
            value={state.category}
            onChange={handleChange}
            placeholder="e.g. Football"
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
            <select
              name="difficulty"
              value={state.difficulty}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <Input
            label="Event (optional)"
            name="event"
            value={state.event}
            onChange={handleChange}
            placeholder="e.g. World Cup 2022"
          />
          <Input
            label="Team (optional)"
            name="team"
            value={state.team}
            onChange={handleChange}
            placeholder="e.g. Real Madrid"
          />
          <Input
            label="Country (optional)"
            name="country"
            value={state.country}
            onChange={handleChange}
            placeholder="e.g. Kenya"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" isLoading={loading}>
          Generate Quiz
        </Button>
      </div>
    </form>
  );
};

export default QuizForm;
