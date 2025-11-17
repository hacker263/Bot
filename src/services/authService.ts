import { User, LoginCredentials, AuthResponse } from '../types';

// Mock users for demo purposes
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@smartwhatsapp.com',
    name: 'Super Admin',
    role: 'super_admin'
  },
  {
    id: '2',
    email: 'merchant1@demo.com',
    name: 'John Mutamba',
    role: 'merchant',
    merchantId: 'merchant-1'
  },
  {
    id: '3',
    email: 'merchant2@demo.com',
    name: 'Sarah van der Merwe',
    role: 'merchant',
    merchantId: 'merchant-2'
  }
];

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Demo credentials
    const demoCredentials = [
      { email: 'admin@smartwhatsapp.com', password: 'admin123' },
      { email: 'merchant1@demo.com', password: 'merchant123' },
      { email: 'merchant2@demo.com', password: 'merchant123' }
    ];

    const isValid = demoCredentials.some(
      cred => cred.email === credentials.email && cred.password === credentials.password
    );

    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const user = mockUsers.find(u => u.email === credentials.email);
    if (!user) {
      throw new Error('User not found');
    }

    const token = btoa(JSON.stringify({ userId: user.id, timestamp: Date.now() }));
    
    return { user, token };
  }

  getCurrentUser(): User | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token));
      const user = mockUsers.find(u => u.id === payload.userId);
      return user || null;
    } catch {
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem('token');
  }
}

export const authService = new AuthService();