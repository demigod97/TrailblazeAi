import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), refresh: vi.fn() })),
}));

// Mock Server Action
vi.mock('./actions', () => ({
  signIn: vi.fn(),
}));

// Import after mocks
import LoginPage from './page';
import { signIn } from './actions';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email input field', () => {
    render(<LoginPage />);
    const emailInput = screen.getByRole('textbox', { name: /email/i });
    expect(emailInput).toBeInTheDocument();
  });

  it('renders password input field', () => {
    render(<LoginPage />);
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput.type).toBe('password');
  });

  it('renders submit button', () => {
    render(<LoginPage />);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('renders form title', () => {
    render(<LoginPage />);
    const title = screen.getByRole('heading', { level: 1 });
    expect(title).toHaveTextContent('Sign in to TrailBlazeAI');
  });

  it('displays error message on failed login', async () => {
    vi.mocked(signIn).mockResolvedValue({ error: 'Invalid login credentials' });
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'bad@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials');
    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });

  it('calls signIn action with form data on submit', async () => {
    vi.mocked(signIn).mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'validpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(signIn).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('displays generic error and re-enables button when signIn throws', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('Network error'));
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByRole('textbox', { name: /email/i }), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('unexpected error');
    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });
});
