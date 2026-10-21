import React from 'react';
import { Bed, Users, ShieldAlert, CheckCircle2, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { RoommateAllocationDialogContext } from '../config/theme.js';

interface RoomAllocationConfirmModalProps {
  context: RoommateAllocationDialogContext;
  isOpen: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onSelectSeat?: (seatId: string, seatLabel: string) => void;
}

export const RoomAllocationConfirmModal: React.FC<RoomAllocationConfirmModalProps> = ({
  context,
  isOpen,
  loading,
  onConfirm,
  onCancel,
  onSelectSeat,
}) => {
  if (!isOpen) return null;

  const targetSeat = context.allRoomSeats.find((s) => s.id === context.targetSeatId);
  const isSeatTaken = targetSeat?.isTaken ?? false;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-allocation-title"
      className="fixed inset-0 z-50 bg-[#203653]/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-[#E2E6E8] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E2E6E8] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E7F2ED] text-[#2C8279] border border-[#A8D5C2] flex items-center justify-center font-bold shrink-0">
              <Bed className="w-5 h-5 text-[#2C8279]" />
            </div>
            <div>
              <h3 id="confirm-allocation-title" className="text-base font-bold text-[#203653] tracking-tight">
                Confirm Your Room Allocation
              </h3>
              <p className="text-xs text-[#627084]">
                Your roommate invitation has been accepted. Review details and confirm to finalize.
              </p>
            </div>
          </div>
        </div>

        {/* Room & Target Seat Details Card */}
        <div className="p-4 bg-[#F7F6F1] rounded-xl border border-[#E2E6E8] space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#627084] font-medium block">Building & Floor:</span>
              <span className="font-bold text-[#203653]">
                {context.buildingName} · Floor {context.floorNumber}
              </span>
            </div>
            <div>
              <span className="text-[#627084] font-medium block">Room Number:</span>
              <span className="font-bold font-mono text-[#203653] text-sm">
                Room {context.roomNumber}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E2E6E8] flex items-center justify-between text-xs">
            <div>
              <span className="text-[#627084] font-medium block">Target Seat:</span>
              <span className="font-bold font-mono text-[#1D63B8] text-sm">
                Seat {context.targetSeatLabel} <span className="text-[11px] font-normal text-[#627084]">({context.targetSeatId})</span>
              </span>
            </div>
            <div>
              <span className="text-[#627084] font-medium block text-right">Availability:</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded inline-block ${
                  isSeatTaken
                    ? 'bg-[#FDE8E8] text-[#C93B3B]'
                    : 'bg-[#FFF0E6] text-[#E06A26]'
                }`}
              >
                {isSeatTaken ? 'Seat Claimed' : 'Reserved for You (Intent)'}
              </span>
            </div>
          </div>

          {/* Seat Picker if multiple seats are available */}
          {context.allRoomSeats.length > 1 && onSelectSeat && (
            <div className="pt-2 border-t border-[#E2E6E8] space-y-1.5">
              <span className="text-[11px] font-semibold text-[#627084] block">Available Beds in Room {context.roomNumber}:</span>
              <div className="grid grid-cols-3 gap-2">
                {context.allRoomSeats.map((seat) => {
                  const isSelected = seat.id === context.targetSeatId;
                  return (
                    <button
                      key={seat.id}
                      type="button"
                      disabled={seat.isTaken}
                      onClick={() => onSelectSeat(seat.id, seat.label)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-[#EBF3FC] border-[#1D63B8] text-[#1D63B8] ring-1 ring-[#1D63B8]'
                          : seat.isTaken
                          ? 'bg-[#FDE8E8] border-[#F8B4B4] text-[#C93B3B] cursor-not-allowed opacity-60'
                          : 'bg-white border-[#E2E6E8] text-[#203653] hover:bg-[#F7F6F1]'
                      }`}
                    >
                      <span>Seat {seat.label}</span>
                      <span className="text-[10px] font-normal font-mono">
                        {seat.isTaken ? 'Taken' : isSelected ? 'Chosen' : 'Open'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Roommate Group Members Card */}
        <div className="p-3 bg-white rounded-xl border border-[#E2E6E8] space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#203653]">
            <Users className="w-4 h-4 text-[#2C8279]" />
            <span>Roommate Group ({context.groupMembers.length} members)</span>
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {context.groupMembers.map((m) => (
              <div
                key={m.studentId}
                className="flex items-center justify-between text-xs p-1.5 rounded bg-[#F7F6F1] border border-[#E2E6E8]"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#203653]">{m.fullName}</span>
                  <span className="text-[10px] text-[#627084] font-mono">Rank #{m.priorityNumber}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    m.status === 'ACCEPTED'
                      ? 'bg-[#E7F2ED] text-[#1E7B54]'
                      : 'bg-[#FAF4E6] text-[#D4B779]'
                  }`}
                >
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Turn Status or Blocker Notice */}
        {!context.isEligibleForTurn && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Selection Turn Pending</span>
              <span>
                {context.blockerMessage ||
                  'Your consent is saved. When your active selection turn begins in the waiting room, you can commit this allocation with a single click.'}
              </span>
            </div>
          </div>
        )}

        {isSeatTaken && (
          <div className="p-3 bg-[#FDE8E8] border border-[#F8B4B4] rounded-xl flex items-start gap-2.5 text-xs text-[#C93B3B]">
            <ShieldAlert className="w-4 h-4 text-[#C93B3B] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Seat Unavailable</span>
              <span>Target seat has already been allocated to another student. Please select another seat in the room if available.</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E6E8]">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-[#E2E6E8] hover:bg-[#F7F6F1] text-[#627084] text-xs font-semibold rounded-lg transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || isSeatTaken || !context.isEligibleForTurn}
            className="px-5 py-2.5 bg-[#1E7B54] hover:bg-[#166041] text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Confirming Allocation...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Room Allocation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
