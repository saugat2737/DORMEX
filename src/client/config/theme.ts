/**
 * DORMEX Design System Tokens & Configuration Mappings
 * Centralized, reusable theme constants, status palettes, and display configurations.
 */

export const THEME_COLORS = {
  navy: {
    darkest: '#07203C',
    primary: '#203653',
    hover: '#17283B',
    slate: '#263345',
  },
  teal: {
    primary: '#2C8279',
    hover: '#20635C',
    container: '#E7F2ED',
    border: '#A8D5C2',
    accent: '#84D5CA',
  },
  gold: {
    primary: '#D4B779',
    hover: '#B69A5F',
    container: '#FAF4E6',
  },
  status: {
    available: '#1E7B54',      // GREEN - Open / Available
    availableBg: '#E7F2ED',
    availableBorder: '#A8D5C2',
    
    intent: '#E06A26',         // ORANGE - Roommate Intent / Warning
    intentBg: '#FFF0E6',
    intentBorder: '#FFD1B3',

    occupied: '#C93B3B',       // RED - Occupied / Blocked
    occupiedBg: '#FDE8E8',
    occupiedBorder: '#F8B4B4',

    selection: '#1D63B8',      // BLUE - Active Student Selection / My Confirmed Seat
    selectionBg: '#EBF3FC',
    selectionBorder: '#1D63B8',
  },
  neutral: {
    bg: '#F7F6F1',
    cardBg: '#FFFFFF',
    border: '#E2E6E8',
    textMuted: '#627084',
    textMain: '#203653',
  }
} as const;

export type SeatVisualStatus = 'AVAILABLE' | 'INTENT' | 'OCCUPIED' | 'SELECTED' | 'MINE';

export interface RoommateAllocationDialogContext {
  groupId: string;
  cycleId: string;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  floorId: string;
  floorNumber: number;
  leaderName: string;
  targetSeatId: string;
  targetSeatLabel: string;
  allRoomSeats: Array<{
    id: string;
    label: string;
    isTaken: boolean;
    isIntent: boolean;
  }>;
  groupMembers: Array<{
    studentId: string;
    fullName: string;
    priorityNumber: number;
    status: string;
  }>;
  isEligibleForTurn: boolean;
  blockerMessage: string | null;
}
