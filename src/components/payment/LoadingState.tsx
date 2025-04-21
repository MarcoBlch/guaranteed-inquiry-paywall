
import React, { useEffect, useState } from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

const LoadingState = () => {
  const [progress, setProgress] = useState(10);
  const [loadingTime, setLoadingTime] = useState(0);
  const navigate = useNavigate();
  
  useEffect(() => {
    const progressTimer = setTimeout(() => {
      setProgress((prevProgress) => {
        const increment = Math.floor(Math.random() * 10) + 5;
        return Math.min(prevProgress + increment, 95);
      });
    }, 800);
    
    const loadingTimer = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearTimeout(progressTimer);
      clearInterval(loadingTimer);
    };
  }, [progress]);
  
  // After 15 seconds of loading, offer a refresh option
  const showRefreshOption = loadingTime > 15;
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Loading Payment Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        
        {showRefreshOption && (
          <div className="pt-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              It's taking longer than expected. There might be an issue loading the payment details.
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
              >
                Return Home
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoadingState;
