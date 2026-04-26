import React, { useState } from 'react';
import { Activity, Eye, EyeOff, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AuthMode = 'login' | 'register';

export function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = mode === 'login'
      ? await login(username, password)
      : await register({ username, password });

    if (result.ok) {
      if (mode === 'login') {
        toast.success('Acceso correcto', {
          description: 'Has iniciado sesión correctamente.',
        });
      } else {
        toast.success('Solicitud enviada', {
          description: 'Tu cuenta quedó pendiente de aprobación por un administrador.',
        });
        setMode('login');
      }
      resetForm();
    } else {
      toast.error(mode === 'login' ? 'No se pudo iniciar sesión' : 'No se pudo crear la solicitud', {
        description: result.error,
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
            <Activity className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">BioMag</h1>
          <p className="text-muted-foreground mt-1">Terapia Biomagnética</p>
        </div>

        <Card className="shadow-lg border-0 shadow-card">
          <CardHeader className="pb-4 space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  mode === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  mode === 'register' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Solicitar acceso
              </button>
            </div>
            <div className="text-center">
              <CardTitle className="text-xl">
                {mode === 'login' ? 'Acceder' : 'Solicitar nueva cuenta'}
              </CardTitle>
              <CardDescription>
                {mode === 'login'
                  ? 'Solo los usuarios aprobados pueden entrar.'
                  : 'Elige usuario y contraseña. Un administrador deberá aprobar la cuenta.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-field">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder={mode === 'login' ? 'Ingresa tu usuario' : 'Elige un usuario'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="form-field">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={mode === 'login' ? 'Ingresa tu contraseña' : 'Elige una contraseña'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  mode === 'login' ? 'Ingresando...' : 'Enviando...'
                ) : (
                  <>
                    {mode === 'login' ? <ShieldCheck className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    {mode === 'login' ? 'Ingresar' : 'Solicitar acceso'}
                  </>
                )}
              </Button>
            </form>

            {mode === 'register' && (
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Tu cuenta se creará con estado pendiente. Un administrador deberá aprobarla antes de que puedas iniciar sesión.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
