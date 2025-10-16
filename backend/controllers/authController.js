const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Password strength validation function
const validatePasswordStrength = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/(?=.*[@$!%*?&])/.test(password)) {
    errors.push('Password must contain at least one special character (@$!%*?&)');
  }
  
  return errors;
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    // Validate role if provided
    const validRoles = ['user', 'admin', 'wc1', 'wc2', 'wc3'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Valid roles are: user, admin, wc1, wc2, wc3'
      });
    }

    // Validate password strength
    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: passwordErrors
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user with role (defaults to 'user' if not provided)
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'user'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Log incoming request for debugging
    console.log('Login attempt for email:', email);

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    // Log if user was found
    console.log('User found:', user ? 'Yes' : 'No');
    
    if (!user) {
      console.log('User not found with email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials - User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('User account is deactivated:', email);
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    console.log('Checking password for user:', email);
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials - Wrong password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Remove password from response
    user.password = undefined;

    console.log('Login successful for user:', email);
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Profile update failed',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Create user (admin only)
// @route   POST /api/auth/create-user
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate input
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role'
      });
    }

    // Validate password strength
    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Password does not meet requirements',
        errors: passwordErrors
      });
    }

    // Validate role
    const validRoles = ['user', 'wc1', 'wc2', 'wc3', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: ' + validRoles.join(', ')
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role,
      isActive: true
    });

    await user.save();

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  createUser
};
