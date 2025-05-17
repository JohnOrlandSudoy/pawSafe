import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, Save, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { User as UserType } from '../types';
import { logActivity } from '../utils/activityLogger';

const ProfilePage = () => {
  const { currentUser, setCurrentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data
  useEffect(() => {
    if (currentUser) {
      console.log('Setting user data from currentUser:', currentUser);
      setFullName(currentUser.fullName || '');
      setAvatarUrl(currentUser.avatar || null);
    }
  }, [currentUser]);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Check file size (limit to 2MB to avoid metadata size issues)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({
          text: 'Image too large. Maximum size is 2MB.',
          type: 'error'
        });
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setMessage({
          text: 'Only image files are allowed.',
          type: 'error'
        });
        return;
      }
      
      setAvatarFile(file);
      
      // Preview the image
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process avatar to data URL
  const processAvatar = async () => {
    if (!avatarFile) return null;
    
    setIsProcessing(true);
    setProcessProgress(0);
    
    try {
      // Create a simulated progress update
      const progressInterval = setInterval(() => {
        setProcessProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 300);
      
      // Convert file to data URL
      const reader = new FileReader();
      const promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl);
        };
      });
      
      reader.readAsDataURL(avatarFile);
      const dataUrl = await promise;
      
      clearInterval(progressInterval);
      setProcessProgress(100);
      
      // Simulate a delay to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsProcessing(false);
      return dataUrl;
    } catch (error) {
      console.error('Error processing image:', error);
      setIsProcessing(false);
      setMessage({
        text: 'Failed to process image. Please try again.',
        type: 'error'
      });
      return null;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) return;
    
    setIsLoading(true);
    setMessage(null);
    
    try {
      // Process avatar if file is selected
      let avatarDataUrl = currentUser.avatar;
      
      if (avatarFile) {
        avatarDataUrl = await processAvatar();
        if (!avatarDataUrl) {
          setIsLoading(false);
          return;
        }
      }
      
      // Update user metadata in Supabase Auth
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
          avatar: avatarDataUrl
        }
      });
      
      if (error) {
        throw error;
      }
      
      console.log('User updated successfully:', data);
      
      // Update local user state
      const updatedUser: UserType = {
        ...currentUser,
        fullName,
        avatar: avatarDataUrl
      };
      
      setCurrentUser(updatedUser);
      
      // Log the activity
      try {
        await logActivity(
          'updated profile',
          currentUser,
          `Updated profile information${avatarFile ? ' and profile picture' : ''}`
        );
      } catch (logError) {
        console.error('Error logging activity:', logError);
        // Continue anyway even if logging fails
      }
      
      setMessage({
        text: 'Profile updated successfully!',
        type: 'success'
      });
      
      // Reset file input
      setAvatarFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        text: 'Failed to update profile. Please try again.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900">Not Authorized</h2>
          <p className="mt-2 text-sm text-gray-500">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Your Profile</h2>
          <p className="text-sm text-gray-500 mt-1">
            Update your personal information and profile picture
          </p>
        </div>
      </div>
      
      {message && (
        <div className={`p-4 mb-6 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <Check className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <p>{message.text}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Avatar section */}
            <div className="flex flex-col items-center mb-6">
              <div 
                className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100 mb-4 cursor-pointer"
                onClick={triggerFileInput}
              >
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={currentUser.fullName || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white opacity-0 hover:opacity-100" />
                </div>
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              
              <button
                type="button"
                onClick={triggerFileInput}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Change profile picture
              </button>
              
              {isProcessing && (
                <div className="w-full mt-2">
                  <div className="bg-gray-200 h-1 w-full rounded-full mt-1">
                    <div 
                      className="bg-primary-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${processProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    Processing... {processProgress}%
                  </p>
                </div>
              )}
            </div>
            
            {/* User details form */}
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={currentUser.username}
                  disabled
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-700 bg-gray-50"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your email address cannot be changed
                </p>
              </div>
              
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-700 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <input
                  type="text"
                  id="role"
                  value={currentUser.role}
                  disabled
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-700 bg-gray-50"
                />
              </div>
              
              {/* Display additional metadata if available */}
              {currentUser.metadata?.specialty && (
                <div>
                  <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
                    Specialty
                  </label>
                  <input
                    type="text"
                    id="specialty"
                    value={currentUser.metadata.specialty}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-gray-700 bg-gray-50"
                  />
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 items-center"
                disabled={isLoading || isProcessing}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 
