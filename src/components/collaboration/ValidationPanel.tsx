'use client';

import { useState } from 'react';
import { 
  X, 
  Star, 
  TrendingUp, 
  Users, 
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Send
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ValidationSubmission, ValidationResult } from '@/types';
import { Modal } from '@/components/ui/Modal';

interface ValidationPanelProps {
  claimId: string;
  onClose: () => void;
}

export function ValidationPanel({ claimId, onClose }: ValidationPanelProps) {
  const [activeTab, setActiveTab] = useState<'submit' | 'results' | 'expert'>('submit');
  const [score, setScore] = useState(75);
  const [confidence, setConfidence] = useState(0.8);
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState<'accuracy' | 'relevance' | 'completeness' | 'clarity'>('accuracy');
  const [submitting, setSubmitting] = useState(false);

  const { user, validationResults, updateValidationResult } = useAppStore();
  const validationResult = validationResults[claimId];

  const handleSubmitValidation = async () => {
    if (!user || !feedback.trim()) return;
    
    setSubmitting(true);
    try {
      const submission: ValidationSubmission = {
        id: `validation_${Date.now()}`,
        claimId,
        validatorId: user.id,
        validator: user,
        score,
        confidence,
        feedback: feedback.trim(),
        category,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Update validation result
      const currentResult = validationResult || {
        claimId,
        overallScore: 0,
        consensus: 0,
        submissions: [],
        expertReviews: [],
        communityScore: 0,
        lastValidated: new Date()
      };

      const updatedResult: ValidationResult = {
        ...currentResult,
        submissions: [...currentResult.submissions, submission],
        overallScore: calculateOverallScore([...currentResult.submissions, submission]),
        consensus: calculateConsensus([...currentResult.submissions, submission]),
        communityScore: calculateCommunityScore([...currentResult.submissions, submission]),
        lastValidated: new Date()
      };

      updateValidationResult(claimId, updatedResult);
      
      // Reset form
      setScore(75);
      setConfidence(0.8);
      setFeedback('');
      setActiveTab('results');
      
    } catch (error) {
      console.error('Failed to submit validation:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateOverallScore = (submissions: ValidationSubmission[]): number => {
    if (submissions.length === 0) return 0;
    const weightedSum = submissions.reduce((sum, sub) => sum + (sub.score * sub.confidence), 0);
    const totalWeight = submissions.reduce((sum, sub) => sum + sub.confidence, 0);
    return Math.round(weightedSum / totalWeight);
  };

  const calculateConsensus = (submissions: ValidationSubmission[]): number => {
    if (submissions.length < 2) return 0;
    const scores = submissions.map(s => s.score);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    return Math.max(0, 1 - (standardDeviation / 50)); // Normalize to 0-1
  };

  const calculateCommunityScore = (submissions: ValidationSubmission[]): number => {
    // Simple average for now, could be more sophisticated
    return submissions.length > 0 
      ? submissions.reduce((sum, sub) => sum + sub.score, 0) / submissions.length 
      : 0;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConsensusColor = (consensus: number) => {
    if (consensus >= 0.8) return 'text-green-600';
    if (consensus >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Modal onClose={onClose} className="max-w-4xl">
      <div className="flex h-[600px] flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-semibold">Claim Validation</h2>
            <p className="text-sm text-muted-foreground">
              Community-driven fact checking and quality assessment
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'submit'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Submit Validation
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'results'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Community Results
          </button>
          <button
            onClick={() => setActiveTab('expert')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'expert'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Expert Reviews
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'submit' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-medium">Submit Your Validation</h3>
                
                {/* Category selection */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['accuracy', 'relevance', 'completeness', 'clarity'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`rounded-lg border p-3 text-left text-sm ${
                          category === cat
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        <div className="font-medium capitalize">{cat}</div>
                        <div className="text-xs text-muted-foreground">
                          {cat === 'accuracy' && 'How factually correct is this claim?'}
                          {cat === 'relevance' && 'How relevant is this claim to the topic?'}
                          {cat === 'completeness' && 'How complete is the supporting evidence?'}
                          {cat === 'clarity' && 'How clear and well-articulated is this claim?'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Score slider */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">
                    Quality Score: {score}/100
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Poor</span>
                    <span>Average</span>
                    <span>Excellent</span>
                  </div>
                </div>

                {/* Confidence slider */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">
                    Confidence: {Math.round(confidence * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Uncertain</span>
                    <span>Somewhat confident</span>
                    <span>Very confident</span>
                  </div>
                </div>

                {/* Feedback */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium">
                    Detailed Feedback *
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide specific feedback about this claim..."
                    className="w-full rounded-lg border border-border p-3 text-sm resize-none"
                    rows={4}
                  />
                </div>

                {/* Submit button */}
                <button
                  onClick={handleSubmitValidation}
                  disabled={!feedback.trim() || submitting}
                  className="flex w-full items-center justify-center space-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Validation'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div className="space-y-6">
              {validationResult ? (
                <>
                  {/* Summary metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4 text-center">
                      <div className={`text-2xl font-bold ${getScoreColor(validationResult.overallScore)}`}>
                        {Math.round(validationResult.overallScore)}
                      </div>
                      <div className="text-sm text-muted-foreground">Overall Score</div>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <div className={`text-2xl font-bold ${getConsensusColor(validationResult.consensus)}`}>
                        {Math.round(validationResult.consensus * 100)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Consensus</div>
                    </div>
                    <div className="rounded-lg border p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {validationResult.submissions.length}
                      </div>
                      <div className="text-sm text-muted-foreground">Validators</div>
                    </div>
                  </div>

                  {/* Individual submissions */}
                  <div>
                    <h3 className="mb-4 text-lg font-medium">Community Submissions</h3>
                    <div className="space-y-3">
                      {validationResult.submissions.map((submission) => (
                        <div key={submission.id} className="rounded-lg border p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className="h-8 w-8 rounded-full"
                                style={{ backgroundColor: submission.validator.color || '#3B82F6' }}
                              />
                              <div>
                                <div className="font-medium">{submission.validator.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {submission.category} • {Math.round(submission.confidence * 100)}% confident
                                </div>
                              </div>
                            </div>
                            <div className={`text-lg font-bold ${getScoreColor(submission.score)}`}>
                              {submission.score}
                            </div>
                          </div>
                          <p className="mt-3 text-sm">{submission.feedback}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Validations Yet</h3>
                  <p className="text-muted-foreground">
                    Be the first to validate this claim!
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'expert' && (
            <div className="space-y-6">
              {validationResult?.expertReviews.length ? (
                <div className="space-y-4">
                  {validationResult.expertReviews.map((review) => (
                    <div key={review.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <Award className="h-5 w-5 text-yellow-600" />
                            <div>
                              <div className="font-medium">{review.expert.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Expert in {review.expert.expertise.join(', ')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm ${
                          review.verdict === 'verified' 
                            ? 'bg-green-100 text-green-800'
                            : review.verdict === 'disputed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {review.verdict.replace('_', ' ')}
                        </div>
                      </div>
                      <p className="mt-3 text-sm">{review.reasoning}</p>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Confidence: {Math.round(review.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Expert Reviews</h3>
                  <p className="text-muted-foreground">
                    This claim hasn't been reviewed by verified experts yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}