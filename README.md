# 🌿 Urban-Cleanse

**Smart Waste Management System for Urban Communities**

Urban-Cleanse is a comprehensive waste management platform that connects residents, waste collectors, and administrators to streamline urban waste collection processes. The system features intelligent time slot-based scheduling, real-time tracking, and efficient resource allocation.

## 🚀 Features

### 👥 User Features
- **Smart Bin Registration**: Register and manage residential waste bins
- **Collection Requests**: Schedule waste collection with preferred time slots
- **Real-time Tracking**: Track collection request status and worker assignments
- **Interactive Maps**: Visualize bin locations and collection routes
- **Payment Integration**: Secure payment processing for collection services
- **Notification System**: Real-time updates via email and in-app notifications

### 👨‍💼 Admin Features
- **Dashboard Analytics**: Comprehensive statistics and performance metrics
- **User Management**: Manage users, bins, and collection requests
- **Worker Assignment**: Intelligent worker allocation with conflict prevention
- **Route Optimization**: Create and manage collection routes
- **Time Slot Management**: Advanced scheduling with 5 time slots (08:00-18:00)
- **PDF Reports**: Generate detailed collection and payment reports
- **Waste Type Management**: Configure waste categories and pricing

### 👷 Worker Features
- **Route Management**: View assigned collection routes and schedules
- **Request Updates**: Update collection status and completion
- **Mobile-Friendly**: Optimized interface for field operations

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for responsive styling
- **React Router Dom** for navigation
- **React Hook Form** for form management
- **Leaflet & React-Leaflet** for interactive maps
- **Axios** for API communication
- **Socket.IO Client** for real-time updates
- **Recharts** for data visualization
- **jsPDF** for PDF generation

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Socket.IO** for real-time communication
- **PDFKit** for server-side PDF generation
- **Google OAuth 2.0** integration
- **CORS** for cross-origin requests

## 📦 Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MongoDB** (local or cloud)

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/IsukaW/Urban-Cleanse.git
   cd Urban-Cleanse/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the backend directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/urban-cleanse
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key
   
   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   ```

4. **Start the backend server**
   ```bash
   npm start
   ```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the frontend directory:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173`

## 🏗️ Project Structure

```
Urban-Cleanse/
├── 📁 backend/
│   ├── 📁 config/          # Database configuration
│   ├── 📁 controllers/     # Route controllers
│   ├── 📁 middleware/      # Authentication & validation
│   ├── 📁 models/          # MongoDB models
│   ├── 📁 routes/          # API routes
│   ├── 📁 services/        # Business logic services
│   ├── 📁 utils/           # Utility functions
│   └── 📄 app.js           # Express app entry point
│
├── 📁 frontend/
│   ├── 📁 public/          # Static assets
│   ├── 📁 src/
│   │   ├── 📁 components/  # Reusable UI components
│   │   ├── 📁 contexts/    # React contexts
│   │   ├── 📁 hooks/       # Custom React hooks
│   │   ├── 📁 pages/       # Application pages
│   │   ├── 📁 services/    # API services
│   │   └── 📁 utils/       # Utility functions
│   └── 📄 index.html       # Entry HTML file
│
└── 📄 README.md            # Project documentation
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Waste Requests
- `GET /api/waste/requests` - Get all requests
- `POST /api/waste/requests` - Create new request
- `PUT /api/waste/requests/:id` - Update request
- `DELETE /api/waste/requests/:id` - Delete request

### Bins Management
- `GET /api/bins` - Get all bins
- `POST /api/bins` - Register new bin
- `PUT /api/bins/:id` - Update bin
- `DELETE /api/bins/:id` - Delete bin

### Admin Operations
- `GET /api/users` - Get all users
- `PUT /api/users/:id/role` - Update user role
- `GET /api/admin/stats` - Get dashboard statistics
- `POST /api/routes` - Create collection routes

## ⏰ Time Slot System

The application features a sophisticated time slot management system:

### Available Time Slots
- **08:00-10:00** - Morning Collection
- **10:00-12:00** - Late Morning Collection  
- **12:00-14:00** - Afternoon Collection
- **14:00-16:00** - Late Afternoon Collection
- **16:00-18:00** - Evening Collection

### Conflict Prevention
- Workers cannot be assigned to multiple requests in the same time slot
- Users can select different time slots on the same date
- Real-time availability checking for optimal scheduling

## 🔐 Authentication & Authorization

### User Roles
- **User**: Create requests, manage bins, track collections
- **Worker**: View routes, update collection status
- **Admin**: Full system access, user management, analytics

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Protected routes and middleware
- Google OAuth integration
- Session management

## 📊 Dashboard & Analytics

### Admin Dashboard
- Real-time request statistics
- Revenue tracking and reporting
- User activity monitoring
- Collection performance metrics
- Interactive charts and graphs

### Reporting Features
- PDF generation for collection reports
- Payment transaction reports
- Worker performance analytics
- Route efficiency analysis

## 🗺️ Maps & Location Features

- **Interactive Maps**: Powered by Leaflet
- **Bin Location Mapping**: Visual bin registration and tracking
- **Route Visualization**: Display collection routes on maps
- **Geolocation Support**: Automatic location detection
- **Address Geocoding**: Convert addresses to coordinates

## 🔔 Notification System

### Real-time Notifications
- Collection request confirmations
- Status update alerts
- Payment reminders
- Worker assignment notifications

### Delivery Methods
- In-app notifications
- Email notifications
- SMS integration (configurable)

## 🚀 Deployment

### Production Build

**Backend:**
```bash
cd backend
npm install --production
NODE_ENV=production npm start
```

**Frontend:**
```bash
cd frontend
npm run build
# Serve the dist/ folder using nginx or similar
```

### Environment Variables (Production)
```env
# Backend
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/urban-cleanse
JWT_SECRET=your-production-jwt-secret
NODE_ENV=production
PORT=5000

# Frontend
VITE_API_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Use meaningful commit messages
- Update documentation for new features
- Ensure code passes linting rules

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Development Team

### Lead Developer
- **Isuka Witharanage** - *Project Lead & Lead Developer* - [@IsukaW](https://github.com/IsukaW)

### Core Contributors
- **Dulakshi Nimeshani** - [@Dulakshi1910](https://github.com/Dulakshi1910)
- **Sanduni Herath** - [@SanduniHerath263](https://github.com/SanduniHerath263)
- **Shehan Nirmal** - [@shehan570](https://github.com/shehan570)

### Team Contributions
- **Frontend Development**: React TypeScript, UI Components, User Experience
- **Backend Development**: Node.js APIs, Database Design, Authentication
- **System Architecture**: Time Slot Management, Notification System
- **Testing & Quality Assurance**: Unit Tests, Integration Testing
- **Documentation**: API Documentation, User Guides

## 🙏 Acknowledgments

- **SLIIT Y3S1** - Academic Project
- **MongoDB** - Database platform
- **React Team** - Frontend framework
- **Node.js Community** - Backend runtime
- **Leaflet** - Mapping library
- **Tailwind CSS** - Styling framework

## 📞 Support

For support, email: isuka1minjaya@gmail.com or create an issue in the GitHub repository.

## 🔄 Version History

- **v1.0.0** - Initial release with core features
- **v1.1.0** - Added time slot management system
- **v1.2.0** - Enhanced worker assignment with conflict prevention
- **v1.3.0** - Improved notification system and PDF reporting

---

**Built with ❤️ for sustainable urban waste management**
