import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Assuming you are using react-router-dom for navigation
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { toast } from 'sonner'; // Import toast for notifications

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate(); // Initialize navigate hook

  const handleRegister = async () => { // Make function async
    // Client-side validation: Check if passwords match
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }

    // Basic validation: Check if fields are empty (optional, as backend also validates)
    if (!username || !password) {
        toast.error('用户名和密码不能为空');
        return;
    }

    try {
      // Send registration data to the backend API
      const response = await fetch('http://localhost:3001/api/register', { // Use your backend URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Registration successful
        toast.success(data.message || '注册成功'); // Display success message from backend
        // Redirect to login page after successful registration
        navigate('/login');
      } else {
        // Registration failed
        toast.error(data.message || '注册失败'); // Display error message from backend
      }

    } catch (error) {
      console.error('Error during registration:', error);
      toast.error('注册过程中发生网络错误'); // Display generic network error
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF9A9E] to-[#FAD0C4] flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="bg-white bg-opacity-50 backdrop-blur-md rounded-xl p-8 shadow-xl w-full max-w-sm md:max-w-md lg:max-w-lg">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">用户注册</h1>
          
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
          
          <div className="mb-6">
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

          <div className="mb-8">
            <label className="block text-gray-700 text-sm font-semibold mb-2" htmlFor="confirm-password">
              确认密码
            </label>
            <input
              type="password"
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="shadow-sm appearance-none border border-gray-300 rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="请再次输入密码"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleRegister}
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors flex-shrink-0"
            >
              注册
            </button>
            {/* Link to login page */}
            <Link to="/login" className="inline-block align-baseline font-semibold text-sm text-pink-600 hover:text-pink-800 transition-colors">
              已有账号？去登录
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
          onClick={() => navigate(-1)} // Add basic back functionality
        >
          返回
        </button>
      </div>

    </div>
  );
} 