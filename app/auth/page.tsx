"use client";

import { useState } from 'react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="container-fluid py-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6">{isLogin ? 'Login' : 'Register'}</h1>
      <form className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
          <input
            id="email"
            type="email"
            className="w-full border rounded-md px-3 py-2"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
          <input
            id="password"
            type="password"
            className="w-full border rounded-md px-3 py-2"
            placeholder="********"
          />
        </div>
        <button type="submit" className="w-full bg-primary text-primary-foreground rounded-md py-2">
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="underline hover:text-foreground"
        >
          {isLogin ? 'Register' : 'Login'}
        </button>
      </p>
    </div>
  );
}
