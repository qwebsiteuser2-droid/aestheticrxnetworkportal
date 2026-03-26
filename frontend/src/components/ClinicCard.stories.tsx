import type { Meta, StoryObj } from '@storybook/react';
import { ClinicCard } from './ClinicCard';

const meta: Meta<typeof ClinicCard> = {
  title: 'Components/ClinicCard',
  component: ClinicCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    clinic: {
      control: { type: 'object' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockClinic = {
  id: '1',
  clinic_name: 'Metro Medical Center',
  doctor_name: 'Dr. Sarah Johnson',
  profile_photo_url: undefined,
  current_sales: 125000,
  tier: 'Grandmaster',
  badge: 'gold' as const,
};

export const Default: Story = {
  args: {
    clinic: mockClinic,
  },
};

export const WithPhoto: Story = {
  args: {
    clinic: {
      ...mockClinic,
      profile_photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop&crop=face',
    },
  },
};

export const SilverBadge: Story = {
  args: {
    clinic: {
      ...mockClinic,
      clinic_name: 'City Health Clinic',
      doctor_name: 'Dr. Michael Chen',
      current_sales: 75000,
      tier: 'Master',
      badge: 'silver' as const,
    },
  },
};

export const BronzeBadge: Story = {
  args: {
    clinic: {
      ...mockClinic,
      clinic_name: 'Community Care Center',
      doctor_name: 'Dr. Emily Rodriguez',
      current_sales: 45000,
      tier: 'Expert',
      badge: 'bronze' as const,
    },
  },
};
