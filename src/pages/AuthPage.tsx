import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PawPrint as Pawprint } from 'lucide-react';
import { Route } from '../types';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Administrator');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, currentRoute } = useAuth();

  // Monitor route changes to show success message
  useEffect(() => {
    if (currentRoute === Route.DASHBOARD && success === '') {
      setSuccess('Successfully authenticated! Redirecting to dashboard...');
      
      // Clear success message after 2 seconds
      const timer = setTimeout(() => {
        setSuccess('');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [currentRoute, success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    if (isLogin) {
      // Login validation
      if (!email || !password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }
      
      // Login functionality
      setSuccess('Signing in...');
      try {
        const { success, error: authError } = await login(email, password);
        if (!success) {
          setError(authError || 'Invalid email or password');
          setSuccess('');
        }
      } catch (err) {
        setError('An unexpected error occurred');
        setSuccess('');
        console.error('Login error:', err);
      }
    } else {
      // Signup validation
      if (!email || !password) {
        setError('Email and password are required');
        setLoading(false);
        return;
      }
      
      if (!fullName) {
        setError('Full name is required');
        setLoading(false);
        return;
      }
      
      // Signup functionality
      setSuccess('Creating your account...');
      try {
        const { success, error: authError, message } = await signup(email, password, fullName, role);
        if (!success) {
          setError(authError || 'Registration failed');
          setSuccess('');
        } else if (message) {
          // If signup was successful but has a message, show it as success
          setSuccess(message);
          // Clear form if signup was successful
          if (!authError) {
            setEmail('');
            setPassword('');
            setFullName('');
          }
        }
      } catch (err) {
        setError('An unexpected error occurred');
        setSuccess('');
        console.error('Signup error:', err);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Pawprint className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-3 text-center text-3xl font-extrabold text-gray-900">
          PAW SAFE
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Pet Monitoring System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex justify-center mb-6">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  isLogin
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setIsLogin(true)}
                type="button"
              >
                Sign In
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium ${
                  !isLogin
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setIsLogin(false)}
                type="button"
              >
                Sign Up
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      disabled={loading}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <button
                type="submit"
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={loading}
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
