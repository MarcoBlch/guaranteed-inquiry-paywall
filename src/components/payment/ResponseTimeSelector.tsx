
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface ResponseTimeOption {
  hours: 24 | 48 | 72;
  price: number;
  label: string;
  description: string;
}

interface ResponseTimeSelectorProps {
  options: ResponseTimeOption[];
  selectedOption: ResponseTimeOption | null;
  onSelect: (option: ResponseTimeOption) => void;
}

const ResponseTimeSelector = ({ options, selectedOption, onSelect }: ResponseTimeSelectorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-gray-600" />
        <h3 className="font-medium">Choisissez le délai de réponse</h3>
      </div>
      
      <div className="grid gap-3">
        {options.map((option) => (
          <Card 
            key={option.hours}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedOption?.hours === option.hours 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelect(option)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-lg">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {option.price.toFixed(2)}€
                  </div>
                  <div className="text-xs text-gray-500">
                    Garantie {option.hours}h
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {selectedOption && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800">
            <strong>Délai sélectionné :</strong> {selectedOption.label}
          </div>
          <div className="text-sm text-blue-600 mt-1">
            Réponse garantie sous {selectedOption.hours}h ou remboursement intégral
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseTimeSelector;
