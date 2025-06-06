import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Assuming you are using react-router-dom for navigation
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from 'sonner'; // Import toast for notifications

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate(); // Initialize navigate hook

  const handleLogin = async () => { // Make function async
    // Basic validation: Check if fields are empty
    if (!username || !password) {
        toast.error('用户名和密码不能为空');
        return;
    }

    try {
      // Send login data to the backend API
      const response = await fetch('/api/auth/login', { // Use the Vercel /api/auth proxy
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Login successful
        toast.success(data.message || '登录成功'); // Display success message from backend
        // TODO: Store user authentication state (e.g., JWT token in localStorage, update AuthContext)
        // Redirect to a protected page (e.g., Profile or Home)
        navigate('/'); // Redirect to home page for now
      } else {
        // Login failed
        toast.error(data.message || '登录失败'); // Display error message from backend
      }

    } catch (error) {
      console.error('Error during login:', error);
      toast.error('登录过程中发生网络错误'); // Display generic network error
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9A9E] to-[#FAD0C4] flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
        {/* Adjusted container styles for better alignment with other pages */}
        <div className="bg-white bg-opacity-50 backdrop-blur-md rounded-xl p-8 shadow-xl w-full max-w-sm md:max-w-md lg:max-w-lg">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">用户登录</h1>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="username">
              用户名
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="shadow-sm appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="请输入用户名"
            />
          </div>
          
          <div className="mb-8">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="password">
              密码
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow-sm appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="请输入密码"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleLogin}
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors flex-shrink-0"
            >
              登录
            </button>
            {/* Link to registration page */}
            <Link to="/register" className="inline-block align-baseline font-semibold text-sm text-pink-600 hover:text-pink-800 transition-colors">
              没有账号？去注册
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
      
      {/* 返回按钮容器 */}
      <div style={{ position: 'fixed', top: '10px', left: '10px', zIndex: 9999, pointerEvents: 'none' }}>
        <button 
          style={{ 
            position: 'relative', // Changed to relative within fixed container
            pointerEvents: 'auto', // Ensure button captures clicks
            padding: '8px 12px', // Add some padding for better touch target
            backgroundColor: '#F43F5E', // Pink background
            color: 'white', // White text
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)', // Add a subtle shadow
            fontSize: '1rem' // Adjust font size if needed
          }}
          onClick={() => history.back()} // Add basic back functionality
        >
          返回
        </button>
      </div>

    </div>
  );
} 