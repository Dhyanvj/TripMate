import { useContext, useState } from "react";
import { Expense } from "@shared/schema";
import { AppContext } from "@/context/AppContext";
import { formatRelativeTime, formatCurrency } from "@/lib/utils";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Participant {
  id: number;
  userId: number;
}

interface ExpenseItemProps {
  expense: Expense;
}

const ExpenseItem = ({ expense }: ExpenseItemProps) => {
  const { currentUser } = useContext(AppContext);
  const [isHovered, setIsHovered] = useState(false);
  
  // Determine expense icon and color based on category
  const getExpenseDisplay = (category?: string | null) => {
    switch (category) {
      case 'food':
        return { icon: 'ri-shopping-bag-line', color: 'green' };
      case 'transport':
        return { icon: 'ri-taxi-line', color: 'blue' };
      case 'accommodation':
        return { icon: 'ri-home-line', color: 'purple' };
      case 'activities':
        return { icon: 'ri-gamepad-line', color: 'amber' };
      case 'shopping':
        return { icon: 'ri-shopping-cart-line', color: 'pink' };
      default:
        return { icon: 'ri-money-dollar-circle-line', color: 'green' };
    }
  };
  
  const { icon, color } = getExpenseDisplay(expense.category);
  const isYourExpense = expense.paidBy === currentUser?.id;
  
  return (
    <motion.div 
      className={cn(
        "bg-card rounded-lg border border-border shadow-sm p-4 transition-all",
        isHovered ? "shadow-md" : ""
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{
        duration: 0.3,
        delay: (expense.id % 10) * 0.05
      }}
    >
      <div className="flex items-start">
        <motion.div 
          className="mr-3"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <div className={`w-10 h-10 rounded-full bg-${color}-100 dark:bg-${color}-900 flex items-center justify-center text-${color}-600 dark:text-${color}-400`}>
            <i className={icon}></i>
          </div>
        </motion.div>
        <div className="flex-1">
          <div className="flex justify-between">
            <h4 className="font-medium">{expense.description}</h4>
            <motion.p 
              className="font-semibold"
              initial={{ color: "#000000" }}
              animate={{ color: isYourExpense ? "#047857" : "#000000" }}
            >
              {formatCurrency(expense.amount)}
            </motion.p>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Paid by{' '}
            <span className={isYourExpense ? "text-primary-600 dark:text-primary-400 font-medium" : ""}>
              {isYourExpense ? 'You' : 'Someone else'}
            </span>
            {' • '}
            <span className="text-xs">{formatRelativeTime(expense.paidAt)}</span>
          </p>
          <div className="mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Split between participants
            </p>
            <div className="flex mt-1">
              {/* Mock participants for demonstration purposes - in a real app this would be populated from an API call */}
              {[
                { id: 1, userId: currentUser?.id || 1 },
                { id: 2, userId: 2 },
                { id: 3, userId: 3 }
              ].map((participant: Participant, idx: number) => (
                <motion.div 
                  key={idx} 
                  className={`w-5 h-5 rounded-full border border-white ${idx > 0 ? '-ml-1' : ''} bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-medium text-primary-600 dark:text-primary-400`}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                  whileHover={{ y: -2, zIndex: 10 }}
                >
                  {participant.userId === currentUser?.id ? 'You' : 'U'}
                </motion.div>
              ))}
            </div>
          </div>
          
          {isHovered && (
            <motion.div 
              className="mt-3 flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.button 
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mr-3"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="ri-check-double-line mr-1"></i>
                Mark as settled
              </motion.button>
              <motion.button 
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <i className="ri-information-line mr-1"></i>
                Details
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ExpenseItem;
