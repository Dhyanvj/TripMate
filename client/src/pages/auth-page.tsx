import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  MapPin, 
  Compass, 
  Users, 
  PlaneTakeoff, 
  User, 
  Mail, 
  Lock, 
  Globe, 
  Key,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// CSS pattern background
const gridPatternStyle = {
  backgroundSize: "30px 30px",
  backgroundImage: `
    linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)
  `
};

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [showMoreFeatures, setShowMoreFeatures] = useState(false);
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });
  const [registerForm, setRegisterForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    email: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const { user, loginMutation, registerMutation } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Clear form when component mounts to ensure empty fields
  useEffect(() => {
    setLoginForm({
      username: "",
      password: "",
    });
    setRegisterForm({
      username: "",
      password: "",
      confirmPassword: "",
      displayName: "",
      email: ""
    });
  }, []);

  // Clear forms when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Clear both forms when switching tabs
    setLoginForm({
      username: "",
      password: "",
    });
    setRegisterForm({
      username: "",
      password: "",
      confirmPassword: "",
      displayName: "",
      email: ""
    });
    setPasswordError("");
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    if (!registerForm.displayName || !registerForm.username || !registerForm.email || !registerForm.password) {
      setPasswordError("All fields are required");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerForm.email)) {
      setPasswordError("Please enter a valid email address");
      return;
    }
    
    // Validate password strength
    if (registerForm.password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return;
    }
    
    // Validate password match
    if (registerForm.password !== registerForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    
    setPasswordError("");
    
    registerMutation.mutate({
      username: registerForm.username,
      password: registerForm.password,
      displayName: registerForm.displayName,
      email: registerForm.email
    });
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-background to-background/95 dark:from-background dark:to-background/95 relative overflow-hidden">      
      {/* Decorative background elements for mobile - only visible on smaller screens */}
      <div className="absolute inset-0 md:hidden overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-[-5%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 dark:bg-primary/10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-5%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 dark:bg-blue-500/10 blur-3xl animate-pulse" style={{animationDelay: '1s', animationDuration: '7s'}}></div>
        <div className="absolute top-[60%] left-[60%] w-[30%] h-[30%] rounded-full bg-indigo-500/15 dark:bg-indigo-500/10 blur-3xl animate-pulse" style={{animationDelay: '2s', animationDuration: '8s'}}></div>
        
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={gridPatternStyle}></div>
      </div>
      
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Auth form */}
        <motion.div 
          className="flex items-center justify-center w-full md:w-1/2 p-4 sm:p-6 md:p-8 overflow-auto relative z-10 min-h-[100dvh] md:min-h-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="absolute inset-0 hidden md:block bg-gradient-to-b from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/5 -z-10 backdrop-blur-sm"></div>
          
          <Card className="w-full max-w-md my-4 shadow-xl border-0 dark:border border-primary/10 bg-background/95 backdrop-blur-md md:scale-100 scale-[0.98] hover:scale-100 transition-all duration-300">
            <CardHeader className="space-y-2 pb-2 pt-6">
              <motion.div 
                className="flex justify-center mb-3" 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="size-16 md:size-18 flex items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg relative">
                  <Globe className="size-8 md:size-9" />
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-blue-600 opacity-40 blur-md -z-10"></div>
                </div>
              </motion.div>
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <CardTitle className="text-2xl md:text-3xl font-bold text-center bg-gradient-to-r from-primary to-blue-600 text-transparent bg-clip-text">TripMate</CardTitle>
                <CardDescription className="text-center text-sm md:text-base mt-1.5">
                  Your all-in-one platform for seamless group travel planning
                </CardDescription>
              </motion.div>
            </CardHeader>
          
            <Tabs 
              defaultValue="login" 
              value={activeTab} 
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4 rounded-md">
                <TabsTrigger 
                  value="login"
                  className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Register
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit} className="flex flex-col" autoComplete="off">
                  <CardContent className="space-y-4 py-2 px-6">
                    <div className="space-y-2">
                      <Label htmlFor="login-username" className="text-sm font-medium">
                        Username
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input 
                          id="login-username"
                          placeholder="Enter your username" 
                          value={loginForm.username}
                          onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                          required
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          className="pl-10 py-6 h-11 rounded-md border-muted bg-background/50"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="login-password" className="text-sm font-medium">
                          Password
                        </Label>
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-xs font-medium text-primary"
                          onClick={() => navigate("/forgot-password")}
                          type="button"
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input 
                          id="login-password"
                          type="password" 
                          placeholder="Enter your password" 
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                          required
                          autoComplete="new-password"
                          className="pl-10 py-6 h-11 rounded-md border-muted bg-background/50"
                        />
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex flex-col gap-4 px-6 py-4">
                    <Button 
                      type="submit" 
                      className="w-full py-6 h-11 font-medium rounded-md bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-200"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Logging in...
                        </span>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    
                    <p className="text-center text-sm text-muted-foreground">
                      Don't have an account?{" "}
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm font-medium text-primary hover:text-primary/90"
                        onClick={() => setActiveTab("register")}
                        type="button"
                      >
                        Create one now
                      </Button>
                    </p>
                  </CardFooter>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegisterSubmit} className="flex flex-col">
                  <CardContent className="space-y-4 py-2 px-6 max-h-[60vh] overflow-y-auto md:max-h-none md:overflow-visible">
                    <div className="space-y-2">
                      <Label htmlFor="register-displayname" className="text-sm font-medium">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input 
                          id="register-displayname"
                          placeholder="Enter your full name" 
                          value={registerForm.displayName}
                          onChange={(e) => setRegisterForm({...registerForm, displayName: e.target.value})}
                          required
                          className="pl-10 py-6 h-11 rounded-md border-muted bg-background/50"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-username" className="text-sm font-medium">
                        Username
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input 
                          id="register-username"
                          placeholder="Create a username" 
                          value={registerForm.username}
                          onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                          required
                          className="pl-10 py-6 h-11 rounded-md border-muted bg-background/50"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-sm font-medium">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input 
                          id="register-email"
                          type="email"
                          placeholder="Enter your email" 
                          value={registerForm.email}
                          onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                          required
                          className="pl-10 py-6 h-11 rounded-md border-muted bg-background/50"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input 
                          id="register-password"
                          type="password" 
                          placeholder="Create a secure password" 
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                          required
                          className="pl-10 py-6 h-11 rounded-md border-muted bg-background/50"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password" className="text-sm font-medium">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input 
                          id="register-confirm-password"
                          type="password" 
                          placeholder="Confirm your password" 
                          value={registerForm.confirmPassword}
                          onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                          required
                          className="pl-10 py-6 h-11 rounded-md border-muted bg-background/50"
                        />
                      </div>
                      {passwordError && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          {passwordError}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="flex flex-col gap-4 px-6 py-4">
                    <Button 
                      type="submit" 
                      className="w-full py-6 h-11 font-medium rounded-md bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 shadow-md hover:shadow-lg transition-all duration-200"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin size-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating account...
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                    
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-sm font-medium text-primary hover:text-primary/90"
                        onClick={() => setActiveTab("login")}
                        type="button"
                      >
                        Sign in
                      </Button>
                    </p>
                  </CardFooter>
                </form>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      
        {/* Right side - Hero section (desktop only) */}
        <motion.div 
          className="hidden md:flex md:w-1/2 bg-gradient-to-br from-primary/90 to-blue-600/90 text-white flex-col justify-center p-10 lg:p-16 items-center relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Decorative circles */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/20 rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10 max-w-xl">
            <div className="mb-8 flex justify-start">
              <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="size-6 bg-white rounded-full flex items-center justify-center">
                  <PlaneTakeoff className="size-3.5 text-primary" />
                </span>
                <span className="text-sm font-medium">The Ultimate Trip Planning Tool</span>
              </div>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">Plan Group Trips With Ease</h1>
            <p className="text-lg lg:text-xl mb-10 text-white/80">
              TripMate helps you coordinate with friends and family for your next adventure, making group travel planning seamless and enjoyable.
            </p>
            
            {/* Desktop feature section */}
            <div className="space-y-6">
              <FeatureItem 
                icon={<Users className="size-5" />} 
                title="Real-time Collaboration" 
                description="Invite friends and family to plan together and make decisions in real-time."
              />
              
              <FeatureItem 
                icon={<Calendar className="size-5" />} 
                title="Shared Itineraries" 
                description="Create and share trip schedules so everyone knows the plan."
              />
              
              <FeatureItem 
                icon={<MapPin className="size-5" />} 
                title="Expense Tracking" 
                description="Split costs fairly and keep everyone updated on payments."
              />
              
              <FeatureItem 
                icon={<MessageSquare className="size-5" />} 
                title="Group Chat & Coordination" 
                description="Communicate and make decisions without leaving the app."
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// Helper component for feature items
function FeatureItem({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      className="flex items-start space-x-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white/15 p-3 rounded-xl backdrop-blur-sm">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-lg md:text-xl">{title}</h3>
        <p className="text-sm md:text-base text-white/80">{description}</p>
      </div>
    </motion.div>
  );
}