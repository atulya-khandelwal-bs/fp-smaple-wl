import React, { useState, useEffect } from "react";
import { X, Phone } from "lucide-react";
import axios from "axios";
import { Contact } from "../../common/types/chat";
import config from "../../common/config.ts";
import {
  fetchDietitianDetails,
  scheduleCallWithDietitian,
  type DietitianApiResponse,
} from "../services/dietitianApi";

interface FPScheduleCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (
    date: Date,
    time: string,
    topics: string[],
    callType: "video" | "audio"
  ) => void;
  selectedContact: Contact | null;
  userId: string;
  scheduledCallFromApi?: {
    date: string;
    start_time: string;
    call_date_time: number;
    schedule_call_id: number;
  } | null;
  onCancelCall?: () => void;
}

export default function FPScheduleCallModal({
  isOpen,
  onClose,
  onSchedule,
  selectedContact,
  userId,
  scheduledCallFromApi,
  onCancelCall,
}: FPScheduleCallModalProps): React.JSX.Element | null {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [callType, setCallType] = useState<"Video" | "Voice">("Video");
  const [dietitianData, setDietitianData] =
    useState<DietitianApiResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [scheduling, setScheduling] = useState<boolean>(false);

  const loadDietitianDetails = async (): Promise<void> => {
    if (!selectedContact) return;

    setLoading(true);
    try {
      // Use today's date for initial API call
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const callDate = Math.floor(today.getTime() / 1000);

      const data = await fetchDietitianDetails(callDate);
      setDietitianData(data);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  // Fetch dietitian details when modal opens (only once, not on date change)
  // Also fetch if we need to show scheduled call confirmation
  useEffect(() => {
    if (isOpen && selectedContact) {
      loadDietitianDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedContact, scheduledCallFromApi]);

  // Available topics from API only
  const topics = dietitianData?.result?.tags || [];

  const toggleTopic = (topic: string): void => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  // Generate dates from health_coach_schedules (only dates with available slots)
  const getDates = (): Array<{
    date: Date;
    dayLabel: string;
    dayNumber: number;
    month: string;
    isToday: boolean;
  }> => {
    const dates: Array<{
      date: Date;
      dayLabel: string;
      dayNumber: number;
      month: string;
      isToday: boolean;
    }> = [];

    const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Use health_coach_schedules from API if available
    if (
      dietitianData?.result?.health_coach_schedules &&
      dietitianData.result.health_coach_schedules.length > 0
    ) {
      // Filter schedules that have available slots (slots array is not empty)
      const availableSchedules =
        dietitianData.result.health_coach_schedules.filter(
          (schedule) => schedule.slots && schedule.slots.length > 0
        );

      // Convert date strings to Date objects and sort
      const sortedDates = availableSchedules
        .map((schedule) => {
          // Parse YYYY-MM-DD and create Date object
          const [year, month, day] = schedule.date.split("-").map(Number);
          return new Date(year, month - 1, day);
        })
        .sort((a, b) => a.getTime() - b.getTime());

      sortedDates.forEach((date) => {
        const isToday = date.toDateString() === today.toDateString();
        const dayLabel = isToday ? "TODAY" : dayNames[date.getDay()];
        const dayNumber = date.getDate();
        const month = monthNames[date.getMonth()];

        dates.push({ date, dayLabel, dayNumber, month, isToday });
      });
    }

    return dates;
  };

  const dates = getDates();

  // Helper function to parse time string to minutes for sorting
  const parseTime = (timeStr: string): number => {
    const [time, period] = timeStr.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let totalMinutes = hours * 60 + minutes;
    if (period === "pm" && hours !== 12) {
      totalMinutes += 12 * 60;
    } else if (period === "am" && hours === 12) {
      totalMinutes -= 12 * 60;
    }
    return totalMinutes;
  };

  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get time slots from API based on selected date using health_coach_schedules
  const getTimeSlots = (): string[] => {
    if (!selectedDate) return [];

    // Format selected date as YYYY-MM-DD (avoid timezone issues with toISOString)
    const selectedDateStr = formatDateString(selectedDate);

    // Use health_coach_schedules from API
    if (dietitianData?.result?.health_coach_schedules) {
      const scheduleForDate = dietitianData.result.health_coach_schedules.find(
        (schedule) => schedule.date === selectedDateStr
      );

      if (
        scheduleForDate &&
        scheduleForDate.slots &&
        scheduleForDate.slots.length > 0
      ) {
        const timeSlots = scheduleForDate.slots.map((slot) => slot.start_time);
        // Sort time slots to ensure correct order
        return timeSlots.sort((a, b) => {
          const timeA = parseTime(a);
          const timeB = parseTime(b);
          return timeA - timeB;
        });
      }
    }

    // No time slots available
    return [];
  };

  const timeSlots = getTimeSlots();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Reset selections when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDate(new Date());
      setSelectedTime("");
      setSelectedTopics([]);
      setCallType("Video");
    }
  }, [isOpen]);

  if (!isOpen || !selectedContact) return null;

  // Get the selected slot's health_coach_schedule_id
  const getSelectedSlotId = (): number | null => {
    if (
      !selectedDate ||
      !selectedTime ||
      !dietitianData?.result?.health_coach_schedules
    ) {
      return null;
    }

    const selectedDateStr = formatDateString(selectedDate);
    const scheduleForDate = dietitianData.result.health_coach_schedules.find(
      (schedule) => schedule.date === selectedDateStr
    );

    if (scheduleForDate && scheduleForDate.slots) {
      const selectedSlot = scheduleForDate.slots.find(
        (slot) => slot.start_time === selectedTime
      );
      return selectedSlot?.health_coach_schedule_id || null;
    }

    return null;
  };

  const handleSchedule = async (): Promise<void> => {
    if (!selectedTime || selectedTopics.length === 0 || !selectedDate) return;

    const health_coach_schedule_id = getSelectedSlotId();
    if (!health_coach_schedule_id) {
      return;
    }

    const health_coach_id =
      dietitianData?.result?.dietitian_details?.health_coach_id;
    if (!health_coach_id) {
      return;
    }

    // Combine date and time
    const [time, period] = selectedTime.split(" ");
    const [hours, minutes] = time.split(":").map(Number);
    let hour24 = hours;
    if (period === "pm" && hours !== 12) hour24 += 12;
    if (period === "am" && hours === 12) hour24 = 0;

    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(hour24, minutes, 0, 0);

    // Convert to epoch seconds
    const call_date_time = Math.floor(scheduledDateTime.getTime() / 1000);

    setScheduling(true);
    try {
      // Map UI call type to API call type
      const apiCallType = callType === "Video" ? "video_call" : "normal_call";

      await scheduleCallWithDietitian({
        call_type: apiCallType,
        call_date_time: call_date_time,
        call_purpose: selectedTopics.join(", "),
        health_coach_schedule_id: health_coach_schedule_id,
        health_coach_id: health_coach_id,
        start_time: selectedTime,
      });

      // Send custom message for call scheduled
      if (selectedContact) {
        try {
          const body = {
            from: userId,
            to: selectedContact.id,
            type: "call_scheduled",
            data: {
              type: "call_scheduled",
              time: call_date_time, // Unix timestamp in seconds
            },
          };

          await axios.post(config.api.customMessage, body);
        } catch (error) {
          // Don't block the scheduling flow if this fails
        }
      }

      // Call the onSchedule callback for any additional handling
      // Convert "Video"/"Voice" to "video"/"audio" for the callback
      const callTypeForCallback: "video" | "audio" =
        callType === "Video" ? "video" : "audio";
      onSchedule(
        scheduledDateTime,
        selectedTime,
        selectedTopics,
        callTypeForCallback
      );
      onClose();
    } catch (error) {
      // You might want to show an error message to the user here
    } finally {
      setScheduling(false);
    }
  };

  // Format date for footer display
  const formatFooterDate = (): string => {
    if (!selectedDate) return "";

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const isToday = selectedDateOnly.getTime() === today.getTime();

    if (isToday) {
      return `Today, ${selectedDate.getDate()} ${
        monthNames[selectedDate.getMonth()]
      }`;
    }
    return `${dayNames[selectedDate.getDay()]}, ${selectedDate.getDate()} ${
      monthNames[selectedDate.getMonth()]
    }`;
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const hasDateAndTime = selectedTime !== "";

  // Format scheduled date and time for display
  const formatScheduledDateTime = (): string => {
    if (!scheduledCallFromApi) return "";

    const scheduledDate = new Date(scheduledCallFromApi.call_date_time * 1000);
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const day = scheduledDate.getDate();
    const month = monthNames[scheduledDate.getMonth()];
    const year = scheduledDate.getFullYear();

    // Format time (convert to 12-hour format)
    const hours = scheduledDate.getHours();
    const minutes = scheduledDate.getMinutes();
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");

    return `${day} ${month}, ${year} ${displayHours}:${displayMinutes} ${period}`;
  };

  // Check if there's a valid scheduled call (exists and is in the future)
  // Must match the same validation as getScheduledCall() in FPChatInterface
  const hasScheduledCall = (): boolean => {
    if (
      !scheduledCallFromApi ||
      !scheduledCallFromApi.call_date_time ||
      !scheduledCallFromApi.date ||
      !scheduledCallFromApi.start_time
    ) {
      return false;
    }
    const scheduledDate = new Date(scheduledCallFromApi.call_date_time * 1000);
    const now = new Date();
    return scheduledDate > now;
  };

  // If there's a scheduled call in the future, show confirmation view
  if (hasScheduledCall()) {
    const dietitianName =
      selectedContact?.name ||
      dietitianData?.result?.dietitian_details?.dietitian_name ||
      "Nutritionist";
    const scheduledDateTimeText = formatScheduledDateTime();

    return (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 9998,
            animation: "fadeIn 0.2s ease-out",
          }}
          onClick={handleBackdropClick}
        />
        {/* Modal - Bottom Sheet */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#FFFFFF",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            animation: "slideUpFromBottom 0.3s ease-out",
            overflow: "hidden",
            maxHeight: "90%",
            boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with Close Button */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "1rem 1.5rem",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b7280",
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div
            style={{
              padding: "2rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            {/* Scheduled Call Message */}
            <div
              style={{
                fontSize: "16px",
                color: "#111827",
                lineHeight: "1.5",
                textAlign: "center",
              }}
            >
              Your call has been scheduled with {dietitianName} at{" "}
              {scheduledDateTimeText}
            </div>

            {/* Cancel Call Button */}
            {onCancelCall && (
              <button
                onClick={async () => {
                  try {
                    await onCancelCall();
                    onClose();
                  } catch (error) {
                    // You might want to show an error message to the user here
                  }
                }}
                style={{
                  width: "100%",
                  padding: "0.875rem 2rem",
                  border: "none",
                  borderRadius: "8px",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#b91c1c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#dc2626";
                }}
              >
                Cancel Call
              </button>
            )}
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUpFromBottom {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
          animation: "fadeIn 0.2s ease-out",
        }}
        onClick={handleBackdropClick}
      />
      {/* Modal within chat interface - Bottom Sheet */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#FFFFFF",
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          animation: "slideUpFromBottom 0.3s ease-out",
          overflow: "hidden",
          maxHeight: "90%",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Close Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            paddingBottom: "1rem",
          }}
        >
          {/* Profile Picture with Phone Icon and Loading Spinner */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "80px",
                height: "80px",
                marginBottom: "1.5rem",
              }}
            >
              {/* Profile picture with dashed green border */}
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  border: "3px dashed #10b981",
                  padding: "3px",
                  position: "relative",
                }}
              >
                <img
                  src={selectedContact.avatar || config.defaults.avatar}
                  alt={selectedContact.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              </div>
              {/* Green phone icon in bottom right */}
              <div
                style={{
                  position: "absolute",
                  bottom: "0",
                  right: "0",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "3px solid #FFFFFF",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                }}
              >
                <Phone size={14} color="#FFFFFF" />
              </div>
            </div>

            {/* Title */}
            <h2
              style={{
                margin: 0,
                fontSize: "24px",
                fontWeight: 700,
                color: "#111827",
                textAlign: "center",
                marginBottom: "0.5rem",
                lineHeight: "1.2",
              }}
            >
              Schedule a <span style={{ color: "#109310" }}>call</span> with{" "}
              <br />
              {selectedContact.name}
            </h2>

            {/* Description */}
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                color: "#6C7985",
                textAlign: "center",
              }}
            >
              Get 1-on-1 help with your diet and ask questions.
            </p>
          </div>

          {/* Date Selection */}
          <div
            style={{
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                overflowX: "auto",
                overflowY: "hidden",
                paddingBottom: "0.5rem",
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              }}
              onWheel={(e) => {
                e.preventDefault();
                e.currentTarget.scrollLeft += e.deltaY;
              }}
            >
              {dates.map((dateItem, index) => {
                const isSelected =
                  selectedDate !== null &&
                  dateItem.date.toDateString() === selectedDate.toDateString();
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(dateItem.date)}
                    style={{
                      padding: "0.5rem 0.75rem",
                      border: "none",
                      borderRadius: "8px",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      minWidth: "fit-content",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                      transition: "all 0.2s",
                      position: "relative",
                    }}
                  >
                    {/* Day of the week */}
                    <div
                      style={{
                        fontSize: "11px",
                        fontWeight: 400,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      {dateItem.dayLabel}
                    </div>
                    {/* Date number */}
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#374151",
                        lineHeight: "1",
                      }}
                    >
                      {dateItem.dayNumber}
                    </div>
                    {/* Month with underline for selected */}
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 400,
                        color: "#374151",
                        position: "relative",
                        paddingBottom: "2px",
                        borderBottom: isSelected
                          ? "2px solid #dc2626"
                          : "2px solid transparent",
                        transition: "border-color 0.2s",
                      }}
                    >
                      {dateItem.month}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div
            style={{
              marginBottom: hasDateAndTime ? "2rem" : "0",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.75rem",
              }}
            >
              {timeSlots.map((time, index) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedTime(time)}
                    style={{
                      padding: "0.875rem 0.5rem",
                      border: isSelected
                        ? "2px solid #dc2626"
                        : "1px solid #d1d5db",
                      borderRadius: "8px",
                      backgroundColor: "#ffffff",
                      color: isSelected ? "#dc2626" : "#374151",
                      fontSize: "14px",
                      fontWeight: isSelected ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "#9ca3af";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = "#d1d5db";
                      }
                    }}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic Selection - Only show when date and time are selected */}
          {hasDateAndTime && (
            <div
              style={{
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#111827",
                  marginBottom: "1rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                SELECT TOPIC
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                {topics.map((topic, index) => {
                  const isSelected = selectedTopics.includes(topic);
                  return (
                    <button
                      key={index}
                      onClick={() => toggleTopic(topic)}
                      style={{
                        padding: "0.75rem 1rem",
                        border: isSelected
                          ? "2px solid #dc2626"
                          : "1px solid #d1d5db",
                        borderRadius: "8px",
                        backgroundColor: "#ffffff",
                        color: isSelected ? "#dc2626" : "#374151",
                        fontSize: "14px",
                        fontWeight: isSelected ? 600 : 400,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#9ca3af";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = "#d1d5db";
                        }
                      }}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#FFFFFF",
            borderTop: "1px solid #e5e7eb",
            padding: "1rem 1.5rem",
            zIndex: 10000,
            boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* Call Type Selector */}
          <div
            style={{
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#6b7280",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                textAlign: "left",
              }}
            >
              Select Call Type
            </div>
            <div
              style={{
                display: "flex",
                borderRadius: "8px",
                background: "#f08080",
                padding: "2px",
                width: "fit-content",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Sliding background indicator */}
              <div
                style={{
                  position: "absolute",
                  top: "2px",
                  bottom: "2px",
                  left: callType === "Video" ? "2px" : "50%",
                  right: callType === "Video" ? "50%" : "2px",
                  backgroundColor: "#E03B44",
                  borderRadius: "6px",
                  transition: "left 0.3s ease-out, right 0.3s ease-out",
                  zIndex: 0,
                }}
              />
              <button
                onClick={() => setCallType("Video")}
                style={{
                  padding: "0.5rem 1.5rem",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: "transparent",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                Video
              </button>
              <button
                onClick={() => setCallType("Voice")}
                style={{
                  padding: "0.5rem 1.5rem",
                  border: "none",
                  borderRadius: "6px",
                  backgroundColor: "transparent",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                Voice
              </button>
            </div>
          </div>

          {/* Selected Info and Schedule Button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {hasDateAndTime ? (
                <>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "#111827",
                      fontWeight: 500,
                      marginBottom: "0.25rem",
                    }}
                  >
                    {formatFooterDate()} • {selectedTime}
                  </div>
                  {selectedTopics.length > 0 && (
                    <div
                      style={{
                        fontSize: "14px",
                        color: "#111827",
                        fontWeight: 500,
                      }}
                    >
                      {selectedTopics.join(" • ")}
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    fontSize: "14px",
                    color: "#9ca3af",
                  }}
                >
                  Select date and time
                </div>
              )}
            </div>
            <button
              onClick={handleSchedule}
              disabled={
                !hasDateAndTime || selectedTopics.length === 0 || scheduling
              }
              style={{
                padding: "0.875rem 2rem",
                border: "none",
                borderRadius: "8px",
                backgroundColor:
                  hasDateAndTime && selectedTopics.length > 0 && !scheduling
                    ? "#dc2626"
                    : "#f3f4f6",
                color:
                  hasDateAndTime && selectedTopics.length > 0 && !scheduling
                    ? "#ffffff"
                    : "#9ca3af",
                fontSize: "16px",
                fontWeight: 600,
                cursor:
                  hasDateAndTime && selectedTopics.length > 0 && !scheduling
                    ? "pointer"
                    : "not-allowed",
                transition: "background-color 0.2s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (hasDateAndTime && selectedTopics.length > 0) {
                  e.currentTarget.style.backgroundColor = "#b91c1c";
                }
              }}
              onMouseLeave={(e) => {
                if (hasDateAndTime && selectedTopics.length > 0) {
                  e.currentTarget.style.backgroundColor = "#dc2626";
                }
              }}
            >
              {scheduling ? "Scheduling..." : "Schedule Call"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUpFromBottom {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Hide scrollbar for date selection */
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
}
