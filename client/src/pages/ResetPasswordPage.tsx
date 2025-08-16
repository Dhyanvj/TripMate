import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, AlertCircle, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ResetPasswordPage() {
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const validatePassword = () => {
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return false;
    }
    
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetCode) {
      toast({
        title: "Code Required",
        description: "Please enter the 6-digit reset code from your email",
        variant: "destructive"
      });
      return;
    }
    
    if (!validatePassword()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        token: resetCode,
        newPassword
      });
      
      if (res.ok) {
        setResetSuccess(true);
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset successfully. You can now log in with your new password.",
        });
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.message || "Failed to reset password. The code may be invalid or expired.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again later.",
        variant: "destructive"
      });
      console.error("Reset password error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/auth")}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
          </div>
          <CardDescription>
            {resetSuccess 
              ? "Your password has been reset successfully."
              : "Enter the 6-digit code from your email and create a new password."}
          </CardDescription>
        </CardHeader>
        
        {resetSuccess ? (
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your password has been reset successfully. You can now log in with your new password.
              </AlertDescription>
            </Alert>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-code">Reset Code</Label>
                <Input 
                  id="reset-code"
                  type="text" 
                  placeholder="Enter 6-digit code" 
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={6}
                  className="text-center text-lg font-mono tracking-wider"
                  required
                />
                <p className="text-sm text-gray-500">
                  Enter the 6-digit code sent to your email
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password"
                  type="password" 
                  placeholder="Enter your new password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input 
                  id="confirm-password"
                  type="password" 
                  placeholder="Confirm your new password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                {passwordError && (
                  <p className="text-sm text-red-500 mt-1">{passwordError}</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Resetting Password..." : "Reset Password"}
              </Button>
            </CardFooter>
          </form>
        )}
        
        {resetSuccess && (
          <CardFooter>
            <Button 
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              Return to Login
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}