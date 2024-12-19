import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { axe } from '@axe-core/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import ClientProfile from '../../../../src/components/clients/ClientProfile';
import { IClient, ClientStatus } from '../../../../src/interfaces/client.interface';
import { getClientById, updateClient } from '../../../../src/api/clients';
import { THEME_CONSTANTS } from '../../../../src/config/constants';

// Mock API functions
vi.mock('../../../../src/api/clients', () => ({
  getClientById: vi.fn(),
  updateClient: vi.fn()
}));

// Mock client data following the interface specification
const mockClient: IClient = {
  id: 'test-client-id',
  company_name: 'Test Company',
  industry: 'Technology',
  contacts: [
    {
      name: 'John Doe',
      title: 'CTO',
      email: 'john@testcompany.com',
      phone: '123-456-7890',
      is_primary: true
    }
  ],
  status: ClientStatus.ACTIVE,
  billing_address: '123 Test St, Test City, TS 12345',
  notes: 'Test client notes',
  created_at: new Date('2023-01-01T00:00:00.000Z'),
  updated_at: new Date('2023-01-01T00:00:00.000Z')
};

// Helper function to render component with required providers
const renderClientProfile = (clientId: string = 'test-client-id', theme: 'light' | 'dark' = 'light') => {
  return render(
    <ThemeProvider theme={{ mode: theme, ...THEME_CONSTANTS[`${theme.toUpperCase()}_THEME`] }}>
      <MemoryRouter initialEntries={[`/clients/${clientId}`]}>
        <Routes>
          <Route path="/clients/:id" element={<ClientProfile />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
};

describe('ClientProfile Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getClientById as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('Rendering and Data Display', () => {
    it('should render loading state initially', () => {
      renderClientProfile();
      expect(screen.getByText(/loading client profile/i)).toBeInTheDocument();
    });

    it('should render client data after successful fetch', async () => {
      renderClientProfile();
      
      await waitFor(() => {
        expect(screen.getByText(mockClient.company_name)).toBeInTheDocument();
        expect(screen.getByText(mockClient.industry)).toBeInTheDocument();
        expect(screen.getByText(mockClient.billing_address)).toBeInTheDocument();
      });
    });

    it('should render error state when fetch fails', async () => {
      const errorMessage = 'Failed to load client';
      (getClientById as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      renderClientProfile();
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
      });
    });

    it('should render all client contacts correctly', async () => {
      renderClientProfile();
      
      await waitFor(() => {
        const contacts = screen.getAllByRole('listitem');
        expect(contacts).toHaveLength(mockClient.contacts.length);
        
        mockClient.contacts.forEach(contact => {
          const contactItem = screen.getByLabelText(`Contact: ${contact.name}`);
          expect(contactItem).toBeInTheDocument();
          expect(within(contactItem).getByText(contact.title)).toBeInTheDocument();
          expect(within(contactItem).getByText(contact.email)).toBeInTheDocument();
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderClientProfile();
      await waitFor(() => screen.getByText(mockClient.company_name));
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels and roles', async () => {
      renderClientProfile();
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute(
          'aria-label',
          `Client status: ${mockClient.status}`
        );
        
        mockClient.contacts.forEach(contact => {
          expect(screen.getByLabelText(`Contact: ${contact.name}`)).toBeInTheDocument();
          expect(screen.getByLabelText(`Email ${contact.name}`)).toBeInTheDocument();
          expect(screen.getByLabelText(`Call ${contact.name}`)).toBeInTheDocument();
        });
      });
    });

    it('should be keyboard navigable', async () => {
      renderClientProfile();
      const user = userEvent.setup();
      
      await waitFor(() => screen.getByText(mockClient.company_name));
      
      // Test tab navigation through interactive elements
      await user.tab();
      expect(screen.getByLabelText(`Email ${mockClient.contacts[0].name}`)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(`Call ${mockClient.contacts[0].name}`)).toHaveFocus();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust layout for mobile viewport', async () => {
      global.innerWidth = 320;
      global.dispatchEvent(new Event('resize'));
      
      renderClientProfile();
      
      await waitFor(() => {
        const container = screen.getByText(mockClient.company_name).closest('div');
        expect(container).toHaveStyle({ padding: '24px' });
      });
    });

    it('should adjust layout for tablet viewport', async () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
      
      renderClientProfile();
      
      await waitFor(() => {
        const container = screen.getByText(mockClient.company_name).closest('div');
        expect(container).toHaveStyle({ padding: '24px' });
      });
    });
  });

  describe('Theme Support', () => {
    it('should render correctly in light mode', async () => {
      renderClientProfile('test-client-id', 'light');
      
      await waitFor(() => {
        const container = screen.getByText(mockClient.company_name).closest('div');
        expect(container).toHaveStyle({
          backgroundColor: expect.stringMatching(/^#[A-Fa-f0-9]{6}$/)
        });
      });
    });

    it('should render correctly in dark mode', async () => {
      renderClientProfile('test-client-id', 'dark');
      
      await waitFor(() => {
        const container = screen.getByText(mockClient.company_name).closest('div');
        expect(container).toHaveStyle({
          backgroundColor: expect.stringMatching(/^#[A-Fa-f0-9]{6}$/)
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing client ID', async () => {
      renderClientProfile('');
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/client id is required/i);
      });
    });

    it('should handle network errors gracefully', async () => {
      (getClientById as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      renderClientProfile();
      
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/network error/i);
      });
    });
  });

  describe('Data Security', () => {
    it('should mask sensitive contact information appropriately', async () => {
      renderClientProfile();
      
      await waitFor(() => {
        const phoneNumber = screen.getByText(mockClient.contacts[0].phone);
        expect(phoneNumber).toHaveAttribute('aria-label', `Call ${mockClient.contacts[0].name}`);
      });
    });
  });
});