import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  IClient, 
  IClientContact, 
  ClientStatus, 
  IUpdateClientDTO 
} from '../../interfaces/client.interface';
import { getClientById, updateClient } from '../../api/clients';
import Card from '../common/Card';
import { breakpoints } from '../../styles/breakpoints';
import { palette } from '../../styles/colors';
import { elevation, flexLayout, gridLayout, truncateText } from '../../styles/mixins';

// Styled components with Material Design 3.0 principles
const ProfileContainer = styled.div`
  ${flexLayout({ direction: 'column', gap: '24px' })};
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const HeaderSection = styled.div`
  ${flexLayout({ justify: 'space-between', align: 'center' })};
  width: 100%;
`;

const ClientName = styled.h1`
  ${truncateText(1)};
  font-size: 2rem;
  color: ${({ theme }) => theme.mode === 'dark' ? palette.dark.text.primary : palette.light.text.primary};
  margin: 0;
`;

const StatusBadge = styled.span<{ status: ClientStatus }>`
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: ${({ status, theme }) => {
    const colors = theme.mode === 'dark' ? palette.dark : palette.light;
    switch (status) {
      case ClientStatus.ACTIVE:
        return colors.success.main;
      case ClientStatus.INACTIVE:
        return colors.error.main;
      case ClientStatus.ON_HOLD:
        return colors.warning.main;
      default:
        return colors.info.main;
    }
  }};
  color: ${({ status, theme }) => {
    const colors = theme.mode === 'dark' ? palette.dark : palette.light;
    switch (status) {
      case ClientStatus.ACTIVE:
        return colors.success.contrastText;
      case ClientStatus.INACTIVE:
        return colors.error.contrastText;
      case ClientStatus.ON_HOLD:
        return colors.warning.contrastText;
      default:
        return colors.info.contrastText;
    }
  }};
`;

const ContentGrid = styled.div`
  ${gridLayout({
    columns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px'
  })};
`;

const ContactList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  ${flexLayout({ direction: 'column', gap: '16px' })};
`;

const ContactItem = styled.li`
  ${flexLayout({ direction: 'column', gap: '8px' })};
  padding: 16px;
  border-radius: 8px;
  background-color: ${({ theme }) => 
    theme.mode === 'dark' ? palette.dark.background.paper : palette.light.background.paper};
  ${({ theme }) => elevation(1, theme.mode === 'dark')};
`;

interface ClientProfileProps {
  className?: string;
}

export const ClientProfile: React.FC<ClientProfileProps> = ({ className }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<IClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      try {
        if (!id) throw new Error('Client ID is required');
        setLoading(true);
        const data = await getClientById(id);
        setClient(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client');
        console.error('Error fetching client:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [id]);

  // Handle client updates
  const handleUpdateClient = useCallback(async (updateData: IUpdateClientDTO) => {
    try {
      if (!client?.id) return;
      setLoading(true);
      const updatedClient = await updateClient(client.id, updateData);
      setClient(updatedClient);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
      console.error('Error updating client:', err);
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  if (loading) {
    return (
      <ProfileContainer className={className} aria-busy="true">
        <Card elevation={1} padding={24}>
          <div>Loading client profile...</div>
        </Card>
      </ProfileContainer>
    );
  }

  if (error || !client) {
    return (
      <ProfileContainer className={className}>
        <Card elevation={1} padding={24}>
          <div role="alert" aria-live="polite">
            {error || 'Client not found'}
          </div>
        </Card>
      </ProfileContainer>
    );
  }

  return (
    <ProfileContainer className={className}>
      <HeaderSection>
        <ClientName>{client.company_name}</ClientName>
        <StatusBadge 
          status={client.status}
          role="status" 
          aria-label={`Client status: ${client.status}`}
        >
          {client.status}
        </StatusBadge>
      </HeaderSection>

      <ContentGrid>
        <Card elevation={1} padding={24}>
          <h2>Company Details</h2>
          <dl>
            <dt>Industry</dt>
            <dd>{client.industry}</dd>
            <dt>Billing Address</dt>
            <dd>{client.billing_address}</dd>
            {client.notes && (
              <>
                <dt>Notes</dt>
                <dd>{client.notes}</dd>
              </>
            )}
          </dl>
        </Card>

        <Card elevation={1} padding={24}>
          <h2>Contacts</h2>
          <ContactList>
            {client.contacts.map((contact: IClientContact, index: number) => (
              <ContactItem 
                key={`${contact.email}-${index}`}
                aria-label={`Contact: ${contact.name}`}
              >
                <strong>{contact.name}</strong>
                <div>{contact.title}</div>
                <a 
                  href={`mailto:${contact.email}`}
                  aria-label={`Email ${contact.name}`}
                >
                  {contact.email}
                </a>
                <a 
                  href={`tel:${contact.phone}`}
                  aria-label={`Call ${contact.name}`}
                >
                  {contact.phone}
                </a>
                {contact.is_primary && (
                  <span aria-label="Primary contact">Primary Contact</span>
                )}
              </ContactItem>
            ))}
          </ContactList>
        </Card>
      </ContentGrid>
    </ProfileContainer>
  );
};

export default ClientProfile;