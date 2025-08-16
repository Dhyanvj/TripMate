import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { AlertCircle, Map, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  const [showMap, setShowMap] = useState(false);
  
  // Simulate a map loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowMap(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 text-center"
      >
        <motion.div 
          className="text-9xl font-bold text-primary-600 dark:text-primary-400 mb-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200, 
            damping: 10
          }}
        >
          404
        </motion.div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Looks like you're lost
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          We couldn't find the page you're looking for. Maybe you took a wrong turn during your trip?
        </p>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full max-w-lg mx-4"
      >
        <Card className="border-2 border-primary-200 dark:border-primary-900 shadow-lg">
          <CardContent className="pt-6 pb-4">
            {!showMap ? (
              <motion.div 
                className="h-48 flex items-center justify-center"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  animate={{ 
                    rotate: 360,
                    transition: { duration: 2, repeat: Infinity, ease: "linear" }
                  }}
                >
                  <Map className="h-12 w-12 text-primary-500 dark:text-primary-400" />
                </motion.div>
                <p className="ml-4 text-gray-600 dark:text-gray-400">Finding your bearings...</p>
              </motion.div>
            ) : (
              <motion.div 
                className="h-48 flex flex-col gap-2 items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <AlertCircle className="h-16 w-16 text-amber-500 mb-2" />
                <p className="text-center font-medium text-gray-800 dark:text-gray-200">You've gone off the map!</p>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  This destination doesn't exist in our TripMate.
                </p>
              </motion.div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center pb-6 pt-2">
            <Link href="/">
              <Button className="px-6" size="lg">
                <Home className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
      
      <motion.p 
        className="mt-8 text-sm text-gray-500 dark:text-gray-500"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 1 }}
      >
        Lost traveler tip: Sometimes the best adventures start with a wrong turn.
      </motion.p>
    </div>
  );
}
