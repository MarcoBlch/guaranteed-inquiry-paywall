import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Star, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from "sonner";

const RatePage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const transactionId = searchParams.get('tx') || '';

  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/submit-rating`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            transactionId,
            rating,
            comment: comment.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit rating');
        toast.error(data.error || 'Failed to submit rating');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Missing params — show error
  if (!token || !transactionId) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-700">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">
              Invalid rating link. Please use the link from your email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-700">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Thank you for your feedback!
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Your rating helps others know what to expect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rating form
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="py-6 text-center border-b border-slate-200 dark:border-slate-800">
        <h1 className="font-display italic text-green-500 text-2xl">FASTPASS</h1>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="max-w-md w-full border-slate-200 dark:border-slate-700">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                Rate this response
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                How satisfied were you with the response you received?
              </p>
            </div>

            {/* Star selector */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoveredStar(n)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      n <= (hoveredStar || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Rating label */}
            {rating > 0 && (
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Below average'}
                {rating === 3 && 'Average'}
                {rating === 4 && 'Good'}
                {rating === 5 && 'Excellent'}
              </p>
            )}

            {/* Optional comment */}
            <div className="space-y-2">
              <Textarea
                placeholder="Leave a comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                rows={3}
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300 placeholder:text-slate-400 resize-none"
              />
              <p className="text-xs text-slate-400 text-right">{comment.length}/500</p>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="w-full bg-green-500 hover:bg-green-400 text-white font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Rating'
              )}
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs border-t border-slate-200 dark:border-slate-800">
        <p>&copy; {new Date().getFullYear()} FastPass</p>
      </footer>
    </div>
  );
};

export default RatePage;
