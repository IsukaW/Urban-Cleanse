import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Trash2 } from 'lucide-react';

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match. Please check and try again.', {
        duration: 5000
      });
      return;
    }

    setLoading(true);
    try {
      await registerUser(data.name, data.email, data.password, 'user');
      toast.success('Registration successful! Welcome to UrbanCleanse.', {
        duration: 5000
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);

      // Display the specific error message from backend
      const errorMessage =
        error.message ||
        'Registration failed. Please check your information and try again.';
      toast.error(errorMessage, {
        duration: 8000,
        style: {
          background: '#ef4444',
          color: '#fff'
        }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="flex justify-center items-center space-x-2 mb-4 sm:mb-6">
            <Trash2 className="h-10 w-10 sm:h-12 sm:w-12 text-green-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              UrbanCleanse
            </h1>
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-700 mb-2">
            Create your account
          </h2>
          <p className="text-sm text-gray-600 px-2">
            Join us in making waste management efficient
          </p>
        </div>

        <div className="bg-white p-4 sm:p-8 rounded-xl shadow-lg border border-gray-100">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2"
              >
                Full Name
              </label>
              <input
                {...register('name', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters'
                  }
                })}
                type="text"
                className="block w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 sm:mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span>
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2"
              >
                Email address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^\S+@\S+$/i,
                    message: 'Please enter a valid email'
                  }
                })}
                type="email"
                className="block w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 sm:mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                      message:
                        'Password must contain uppercase, lowercase, number and special character'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  className="block w-full px-3 py-2 pr-10 sm:px-4 sm:py-3 sm:pr-12 text-sm sm:text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 sm:mt-2 text-sm text-red-600 flex items-start">
                  <span className="mr-1 mt-0.5">⚠</span>
                  <span className="break-words">{errors.password.message}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="block w-full px-3 py-2 pr-10 sm:px-4 sm:py-3 sm:pr-12 text-sm sm:text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 sm:mt-2 text-sm text-red-600 flex items-center">
                  <span className="mr-1">⚠</span>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="pt-2 sm:pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-2.5 sm:py-3 text-sm sm:text-base font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
            </div>
          </form>

          <div className="text-center mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-green-600 hover:text-green-500 transition-colors underline-offset-4 hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

