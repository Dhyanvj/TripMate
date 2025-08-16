import { useContext, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AppContext } from "@/context/AppContext";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, User, Lock, UserPlus, Key, Camera } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Avatar from "@/components/ui/avatar";
import AvatarSelector from "@/components/ui/avatar-selector";

const SettingsPage = () => {
  const { config, setMode } = useTheme();
  const { user, logoutMutation } = useAuth();
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // State for profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    paymentPreference: user?.paymentPreference || 'none',
    avatar: user?.avatar || ''
  });
  
  // Update form data when user data changes (e.g., when profile is updated)
  useEffect(() => {
    if (user) {
      setProfileForm({
        displayName: user.displayName || '',
        email: user.email || '',
        // If payment preference is empty string or null, set it to 'none'
        paymentPreference: user.paymentPreference ? user.paymentPreference : 'none',
        avatar: user.avatar || ''
      });
    }
  }, [user]);
  
  // State for password change
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  
  // State for username change
  const [showChangeUsernameDialog, setShowChangeUsernameDialog] = useState(false);
  const [usernameForm, setUsernameForm] = useState({
    newUsername: '',
    password: ''
  });
  
  // State for avatar selection
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: typeof profileForm) => {
      if (!user?.id) throw new Error("Not authenticated");
      console.log("Updating profile with data:", userData);
      const res = await apiRequest("PATCH", `/api/users/${user.id}`, userData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Profile update failed");
      }
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      console.log("Profile update successful, received data:", updatedUser);
      // Update the auth context with the updated user
      queryClient.setQueryData(["/api/auth/user"], updatedUser);
      
      // Invalidate all user-related queries to ensure immediate updates across components
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && (
            key.includes('members') || 
            key.includes('chat') || 
            key.includes('users')
          );
        }
      });
      
      // Reset the editing state
      setIsEditing(false);
      // Show success message
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    }
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return await res.json();
    },
    onSuccess: () => {
      setShowChangePasswordDialog(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      toast({
        title: "Password changed",
        description: "Your password has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Password change failed",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    }
  });
  
  // Change username mutation
  const changeUsernameMutation = useMutation({
    mutationFn: async (data: typeof usernameForm) => {
      const res = await apiRequest("POST", "/api/auth/change-username", data);
      return await res.json();
    },
    onSuccess: (response) => {
      setShowChangeUsernameDialog(false);
      setUsernameForm({
        newUsername: '',
        password: ''
      });
      
      // Update the user in auth context
      queryClient.setQueryData(["/api/auth/user"], response.user);
      
      // Invalidate all user-related queries to ensure immediate updates
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && (
            key.includes('members') || 
            key.includes('chat') || 
            key.includes('users')
          );
        }
      });
      
      toast({
        title: "Username changed",
        description: "Your username has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Username change failed",
        description: error.message || "Failed to update username",
        variant: "destructive",
      });
    }
  });

  const handleBackToDashboard = () => {
    navigate("/");
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/auth");
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileForm);
  };
  
  const handleChangePassword = () => {
    // Validate password form
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      toast({
        title: "Passwords don't match",
        description: "Your new password and confirmation password must match",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Your new password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }
    
    // Submit password change
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    });
  };
  
  const handleChangeUsername = () => {
    // Validate username form
    if (!usernameForm.newUsername) {
      toast({
        title: "Username required",
        description: "Please enter a username",
        variant: "destructive",
      });
      return;
    }
    
    if (!usernameForm.password) {
      toast({
        title: "Password required",
        description: "Please enter your current password to confirm this change",
        variant: "destructive",
      });
      return;
    }
    
    // Submit username change
    changeUsernameMutation.mutate(usernameForm);
  };

  return (
    <div className="flex-1 p-4 pt-16 md:pt-0 overflow-y-auto h-[calc(100vh-4rem)] pb-20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-3xl mx-auto"
      >
        <div className="flex items-center mb-6">
          <button 
            className="p-2 mr-3 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={handleBackToDashboard}
          >
            <i className="ri-arrow-left-line text-xl"></i>
          </button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* User Profile Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-500 to-secondary-500 h-24"></div>
          <div className="px-6 -mt-12 pb-1">
            <Avatar 
              src={user?.avatar ?? undefined}
              fallback={user?.displayName ?? undefined}
              size="xl"
              className="border-4 border-white shadow-md"
            />
            <div className="mt-3 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{user?.displayName || 'User'}</h2>
                <p className="text-gray-500 dark:text-gray-400">{user?.email || 'No email'}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>
        </Card>
        
        {/* Edit Profile Form (Shown when isEditing is true) */}
        {isEditing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2 text-primary" /> Edit Profile
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Avatar Selection */}
                <div className="space-y-2">
                  <Label>Profile Avatar</Label>
                  <div className="flex items-center gap-4">
                    <Avatar 
                      src={profileForm.avatar || undefined}
                      fallback={profileForm.displayName || undefined}
                      size="lg"
                    />
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setShowAvatarSelector(true)}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Change Avatar
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input 
                    id="displayName"
                    value={profileForm.displayName}
                    onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
                

                
                <div className="space-y-2">
                  <Label htmlFor="paymentPreference">Payment Preference (optional)</Label>
                  <Select 
                    value={profileForm.paymentPreference} 
                    onValueChange={(value) => setProfileForm({ ...profileForm, paymentPreference: value })}
                  >
                    <SelectTrigger id="paymentPreference">
                      <SelectValue placeholder="Choose preferred payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No preference</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving..." : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Appearance Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how TripMate looks on your device</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark themes
                </p>
              </div>
              <Switch 
                id="dark-mode" 
                checked={config.mode === "dark"}
                onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>



        {/* Account Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowChangePasswordDialog(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Change Password
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowChangeUsernameDialog(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Change Username
            </Button>
            <Separator />
            <Button 
              variant="destructive" 
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <i className="ri-logout-box-line mr-2"></i>
              Sign Out
            </Button>
          </CardContent>
        </Card>
        
        {/* Change Password Dialog */}
        <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Lock className="mr-2 h-5 w-5 text-primary" /> Change Password
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter your current password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter your new password"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                  placeholder="Confirm your new password"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowChangePasswordDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleChangePassword}
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Change Username Dialog */}
        <Dialog open={showChangeUsernameDialog} onOpenChange={setShowChangeUsernameDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <UserPlus className="mr-2 h-5 w-5 text-primary" /> Change Username
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentUsername">Current Username</Label>
                <Input
                  id="currentUsername"
                  value={user?.username || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newUsername">New Username</Label>
                <Input
                  id="newUsername"
                  value={usernameForm.newUsername}
                  onChange={(e) => setUsernameForm({ ...usernameForm, newUsername: e.target.value })}
                  placeholder="Enter your new username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="usernamePassword">Confirm with Password</Label>
                <Input
                  id="usernamePassword"
                  type="password"
                  value={usernameForm.password}
                  onChange={(e) => setUsernameForm({ ...usernameForm, password: e.target.value })}
                  placeholder="Enter your password to confirm"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowChangeUsernameDialog(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleChangeUsername}
                disabled={changeUsernameMutation.isPending}
              >
                {changeUsernameMutation.isPending ? "Updating..." : "Update Username"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* App Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="text-sm">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Build</span>
              <span className="text-sm">{new Date().toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Avatar Selector Dialog */}
        <AvatarSelector
          currentAvatar={profileForm.avatar}
          onAvatarChange={(avatar) => setProfileForm({ ...profileForm, avatar })}
          open={showAvatarSelector}
          onOpenChange={setShowAvatarSelector}
        />
      </motion.div>
    </div>
  );
};

export default SettingsPage;