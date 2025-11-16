import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";

export const Auth = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            KT
          </h1>
          <p className="text-muted-foreground">Generate training content with AI</p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-8 shadow-card">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(0 72% 51%)',
                    brandAccent: 'hsl(0 72% 45%)',
                    inputBackground: 'hsl(0 0% 15%)',
                    inputText: 'hsl(0 0% 98%)',
                    inputBorder: 'hsl(0 0% 20%)',
                    inputBorderFocus: 'hsl(0 72% 51%)',
                  },
                },
              },
              className: {
                container: 'auth-container',
                button: 'auth-button',
                input: 'auth-input',
              },
            }}
            providers={[]}
            view="sign_in"
          />
        </div>
      </div>
    </div>
  );
};