import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export function EmailSignup() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call (you can replace this with actual backend endpoint)
    setTimeout(() => {
      toast({
        title: "Success!",
        description: "Thanks for subscribing to Phuket Radar",
      });
      setEmail("");
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="bg-muted/50 py-12 px-4">
      <div className="container mx-auto max-w-4xl text-center">
        <h3 className="text-2xl md:text-3xl font-bold mb-4">
          Get Phuket smart in 3 minutes a day.
        </h3>
        <p className="text-muted-foreground mb-6 text-lg">
          The fastest way to stay updated on what's really going on across the island.
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            data-testid="input-email-signup"
          />
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-header text-header-foreground"
            data-testid="button-subscribe"
          >
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </div>
    </div>
  );
}
