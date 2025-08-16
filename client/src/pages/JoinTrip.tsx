import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Link, 
  Users, 
  Ticket, 
  ChevronLeft, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeftIcon,
  KeyRound
} from "lucide-react";

// Form schema for joining a trip
const joinTripSchema = z.object({
  inviteCode: z
    .string()
    .min(6, { message: "Invite code must be at least 6 characters" })
    .max(12, { message: "Invite code cannot be more than 12 characters" })
});

type JoinTripFormValues = z.infer<typeof joinTripSchema>;

export default function JoinTrip() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Set up form with validation
  const form = useForm<JoinTripFormValues>({
    resolver: zodResolver(joinTripSchema),
    defaultValues: {
      inviteCode: "",
    },
  });
  
  // Join trip mutation
  const joinMutation = useMutation({
    mutationFn: async (data: JoinTripFormValues) => {
      if (!user) {
        throw new Error("You must be logged in to join a trip");
      }
      
      const response = await apiRequest("POST", "/api/trips/join", {
        inviteCode: data.inviteCode,
        userId: user.id,
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: "You've joined the trip successfully.",
        variant: "default",
      });
      
      // Navigate to the trip details page
      if (data.tripId) {
        navigate(`/trips/${data.tripId}`);
      } else {
        navigate("/");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join trip",
        description: error.message || "Please check the invite code and try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: JoinTripFormValues) => {
    joinMutation.mutate(values);
  };
  
  // Redirect to home if user is not logged in
  if (!user) {
    navigate("/auth");
    return null;
  }
  
  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.15,
        delayChildren: 0.1
      } 
    }
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background relative overflow-hidden">
      {/* Background decoration elements (only visible on mobile) */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-[-10%] left-[-5%] w-[30%] h-[30%] rounded-full bg-blue-400/20 dark:bg-blue-400/10 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-[-5%] right-[-10%] w-[35%] h-[35%] rounded-full bg-cyan-400/20 dark:bg-cyan-400/10 blur-3xl animate-pulse" style={{animationDelay: '1.5s', animationDuration: '7s'}}></div>
        <div className="absolute top-[60%] left-[60%] w-[25%] h-[25%] rounded-full bg-indigo-400/15 dark:bg-indigo-400/10 blur-3xl animate-pulse" style={{animationDelay: '0.7s', animationDuration: '8s'}}></div>
        
        {/* Subtle dot pattern - adds texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#e0e7ff_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-20 dark:opacity-20"></div>
      </div>
    
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="max-w-md w-full border-0 dark:border dark:border-slate-700 shadow-xl dark:bg-slate-800/90 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-4 border-b border-gray-200 dark:border-slate-700">
          <motion.div 
            className="flex justify-between items-center"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-400 flex items-center justify-center shadow-md">
                  <Ticket className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                  Join a Trip
                </CardTitle>
              </div>
              <CardDescription className="text-gray-600 dark:text-gray-300 mt-2.5 ml-[3.25rem]">
                Enter the invite code provided by the trip creator.
              </CardDescription>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-500 text-white shadow-sm">
                Invitation
              </Badge>
            </motion.div>
          </motion.div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 p-5 rounded-xl mb-7 border border-blue-200 dark:border-blue-800/70 shadow-sm"
          >
            <div className="flex items-start">
              <div className="mr-3.5 mt-0.5">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center">
                  <HelpCircle className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                  Trip creators can share their invite code with you. The code is usually 8 characters long and looks like <span className="font-mono bg-blue-200/70 dark:bg-blue-700/60 px-2 py-0.5 rounded text-blue-700 dark:text-blue-200">AbC12dEf</span>
                </p>
              </div>
            </div>
          </motion.div>
          
          <Form {...form}>
            <motion.form 
              onSubmit={form.handleSubmit(onSubmit)} 
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.4 }}
            >
              <motion.div variants={itemVariants}>
                <FormField
                  control={form.control}
                  name="inviteCode"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-gray-700 dark:text-gray-200 font-medium text-base">Invite Code</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" className="h-7 w-7 p-0 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30">
                                <HelpCircle className="h-4 w-4 text-blue-500/80 dark:text-blue-400/80" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 shadow-lg border border-blue-100 dark:border-blue-900">
                              <p>Enter the code exactly as it was shared with you</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <div className="relative mt-1.5">
                          <Input 
                            placeholder="ENTER YOUR INVITE CODE" 
                            {...field} 
                            className="pl-12 text-center tracking-wider uppercase bg-white dark:bg-slate-900/70 border-blue-200 dark:border-blue-800/50 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 dark:focus:ring-blue-500/30 h-12 font-mono text-lg shadow-sm dark:shadow-inner dark:shadow-slate-900/40 rounded-lg transition-all duration-200"
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 dark:text-blue-400">
                            <KeyRound className="h-6 w-6" />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage className="mt-2 font-medium" />
                    </FormItem>
                  )}
                />
              </motion.div>
              
              <motion.div className="pt-3" variants={itemVariants}>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 dark:from-blue-600 dark:to-blue-500 dark:hover:from-blue-500 dark:hover:to-blue-400 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-lg"
                  disabled={joinMutation.isPending}
                >
                  {joinMutation.isPending ? (
                    <motion.div 
                      className="flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <span className="font-medium">Joining Trip...</span>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="flex items-center justify-center"
                      whileHover={{ scale: 1.03 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Users className="mr-2 h-5 w-5" />
                      <span className="font-medium">Join Trip</span>
                    </motion.div>
                  )}
                </Button>
              </motion.div>
            </motion.form>
          </Form>
          
          <motion.div 
            className="mt-6 flex items-center justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an invite code? {" "}
              <Button 
                variant="link" 
                className="text-blue-600 dark:text-blue-400 font-medium p-0 h-auto hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                onClick={() => navigate("/create-trip")}
              >
                Create your own trip
                <ArrowRight className="ml-1 h-3.5 w-3.5 animate-pulse" />
              </Button>
              {" "}instead.
            </div>
          </motion.div>
        </CardContent>
        
        <CardFooter className="flex justify-center border-t border-gray-200 dark:border-slate-700 pt-5 pb-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-2 transition-colors px-4 py-2 rounded-full"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
      </motion.div>
    </div>
  );
}