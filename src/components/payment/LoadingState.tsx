
import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LoadingState = () => {
  const [progress, setProgress] = React.useState(10);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setProgress((prevProgress) => {
        const increment = Math.floor(Math.random() * 10) + 5;
        return Math.min(prevProgress + increment, 95);
      });
    }, 800);
    
    return () => clearTimeout(timer);
  }, [progress]);
  
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
      </CardContent>
    </Card>
  );
};

export default LoadingState;
