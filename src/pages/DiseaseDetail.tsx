import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DiseaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { diseaseConditions } = useData();

  const item = diseaseConditions.find(disease => disease.id === id);

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Card>
          <CardContent className="p-6 text-muted-foreground">
            No se encontró la enfermedad o afección.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{item.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {item.description || 'Sin descripción.'}
          </p>
          {item.url && (
            <Button asChild variant="outline">
              <a href={item.url} target="_blank" rel="noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver artículo original
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
