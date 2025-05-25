import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Quiz, QuizQuestion } from '../../types';
import { useQuizStore } from '../../store/quizStore';
import { useAuthStore } from '../../store/authStore';

const emptyQuestion: Omit<QuizQuestion, 'id'> = {
  text: '',
  type: 'multiple_choice',
  options: ['', '', '', ''],
  correctAnswer: '',
};

const QuizForm: React.FC = () => {
  const { user } = useAuthStore();
  const { createQuiz, loading, error } = useQuizStore();
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [team, setTeam] = useState('');
  const [country, setCountry] = useState('');
  const [event, setEvent] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [questions, setQuestions] = useState<Array<Omit<QuizQuestion, 'id'>>>([
    { ...emptyQuestion }
  ]);
  
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const handleAddQuestion = () => {
    setQuestions([...questions, { ...emptyQuestion }]);
  };
  
  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };
  
  const handleQuestionChange = (index: number, field: keyof QuizQuestion, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value,
    };
    
    // If changing question type, reset options and correct answer
    if (field === 'type') {
      if (value === 'multiple_choice') {
        updatedQuestions[index].options = ['', '', '', ''];
        updatedQuestions[index].correctAnswer = '';
      } else {
        updatedQuestions[index].options = undefined;
        updatedQuestions[index].correctAnswer = true;
      }
    }
    
    setQuestions(updatedQuestions);
  };
  
  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options) {
      updatedQuestions[questionIndex].options![optionIndex] = value;
      setQuestions(updatedQuestions);
    }
  };
  
  const validateForm = () => {
    if (!title.trim()) {
      setValidationError('Quiz title is required');
      return false;
    }
    
    if (!category.trim()) {
      setValidationError('Category is required');
      return false;
    }
    
    // Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      
      if (!question.text.trim()) {
        setValidationError(`Question ${i + 1} text is required`);
        return false;
      }
      
      if (question.type === 'multiple_choice') {
        // Check if options exist and are valid
        if (!question.options || question.options.length < 2) {
          setValidationError(`Question ${i + 1} needs at least 2 options`);
          return false;
        }
        
        // Check if all options have values
        const emptyOptions = question.options.filter(opt => !opt.trim());
        if (emptyOptions.length > 0) {
          setValidationError(`Question ${i + 1} has empty options`);
          return false;
        }
        
        // Check if correct answer is selected and valid
        if (!question.correctAnswer) {
          setValidationError(`Question ${i + 1} needs a correct answer`);
          return false;
        }
        
        if (!question.options.includes(question.correctAnswer as string)) {
          setValidationError(`Question ${i + 1}'s correct answer must be one of the options`);
          return false;
        }
      }
    }
    
    setValidationError(null);
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Generate IDs for questions
    const questionsWithIds: QuizQuestion[] = questions.map((q) => ({
      ...q,
      id: Math.random().toString(36).substring(2, 9),
    }));
    
    // Create quiz object
    const newQuiz: Omit<Quiz, 'id' | 'createdAt'> = {
      title,
      category,
      subCategory: subCategory || undefined,
      team: team || undefined,
      country: country || undefined,
      event: event || undefined,
      difficulty,
      questions: questionsWithIds,
      createdBy: user?.id || '',
    };
    
    const quizId = await createQuiz(newQuiz);
    
    if (quizId) {
      // Reset form
      setTitle('');
      setCategory('');
      setSubCategory('');
      setTeam('');
      setCountry('');
      setEvent('');
      setDifficulty('medium');
      setQuestions([{ ...emptyQuestion }]);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || validationError) && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{validationError || error}</span>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Quiz Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Quiz Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter quiz title"
            fullWidth
            required
          />
          
          <Input
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g., Football, Basketball"
            fullWidth
            required
          />
          
          <Input
            label="Sub-Category (Optional)"
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
            placeholder="e.g., Premier League, World Cup"
            fullWidth
          />
          
          <Input
            label="Team (Optional)"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            placeholder="e.g., Manchester United, Lakers"
            fullWidth
          />
          
          <Input
            label="Country (Optional)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g., United States, Brazil"
            fullWidth
          />
          
          <Input
            label="Event (Optional)"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            placeholder="e.g., FIFA World Cup, Olympics"
            fullWidth
          />
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Questions</h3>
          <span className="text-sm text-slate-500">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {questions.map((question, questionIndex) => (
          <div 
            key={questionIndex} 
            className="p-4 border border-slate-200 rounded-md mb-4"
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Question {questionIndex + 1}</h4>
              {questions.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveQuestion(questionIndex)}
                  leftIcon={<Trash2 className="h-4 w-4 text-red-500" />}
                  className="text-red-500"
                >
                  Remove
                </Button>
              )}
            </div>
            
            <div className="space-y-4">
              <Input
                label="Question Text"
                value={question.text}
                onChange={(e) => handleQuestionChange(questionIndex, 'text', e.target.value)}
                placeholder="Enter question text"
                fullWidth
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Question Type
                </label>
                <select
                  value={question.type}
                  onChange={(e) => handleQuestionChange(questionIndex, 'type', e.target.value)}
                  className="w-full rounded-md border border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True/False</option>
                </select>
              </div>
              
              {question.type === 'multiple_choice' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Options
                  </label>
                  
                  {question.options?.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                        fullWidth
                        required
                      />
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id={`q${questionIndex}-o${optionIndex}`}
                          name={`question${questionIndex}-correct`}
                          checked={question.correctAnswer === option}
                          onChange={() => handleQuestionChange(questionIndex, 'correctAnswer', option)}
                          className="h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                          disabled={!option.trim()}
                        />
                        <label
                          htmlFor={`q${questionIndex}-o${optionIndex}`}
                          className="ml-2 text-sm text-slate-600"
                        >
                          Correct
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {question.type === 'true_false' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Correct Answer
                  </label>
                  <div className="flex space-x-4">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id={`q${questionIndex}-true`}
                        name={`question${questionIndex}-tf`}
                        checked={question.correctAnswer === true}
                        onChange={() => handleQuestionChange(questionIndex, 'correctAnswer', true)}
                        className="h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                      />
                      <label
                        htmlFor={`q${questionIndex}-true`}
                        className="ml-2 text-sm text-slate-600"
                      >
                        True
                      </label>
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id={`q${questionIndex}-false`}
                        name={`question${questionIndex}-tf`}
                        checked={question.correctAnswer === false}
                        onChange={() => handleQuestionChange(questionIndex, 'correctAnswer', false)}
                        className="h-4 w-4 text-sky-600 border-slate-300 focus:ring-sky-500"
                      />
                      <label
                        htmlFor={`q${questionIndex}-false`}
                        className="ml-2 text-sm text-slate-600"
                      >
                        False
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={handleAddQuestion}
          leftIcon={<Plus className="h-4 w-4" />}
          fullWidth
        >
          Add Question
        </Button>
      </div>
      
      <div className="flex justify-end">
        <Button
          type="submit"
          isLoading={loading}
          disabled={questions.length === 0}
        >
          Create Quiz
        </Button>
      </div>
    </form>
  );
};

export default QuizForm;