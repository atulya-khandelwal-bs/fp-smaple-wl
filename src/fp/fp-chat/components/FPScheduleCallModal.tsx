import React, { useState, useEffect } from "react";
import { X, Phone } from "lucide-react";
import { Contact } from "../../common/types/chat";
import config from "../../common/config.ts";

interface FPScheduleCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (date: Date, time: string, topics: string[]) => void;
  selectedContact: Contact | null;
}

export default function FPScheduleCallModal({
  isOpen,
  onClose,
  onSchedule,
  selectedContact,
}: FPScheduleCallModalProps): React.JSX.Element | null {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  // Available topics
  const topics = [
    "Obesity",
    "Diabetes",
    "PCOD",
    "Thyroid",
    "Hypertension",
    "Fatty liver",
    "Weight gain",
    "Bulk up/Muscle gain",
  ];

  const toggleTopic = (topic: string): void => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    );
  };

  // Generate dates for the next 5 days
  const getDates = (): Array<{ date: Date; label: string; isToday: boolean }> => {
    const dates: Array<{ date: Date; label: string; isToday: boolean }> = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      const isToday = i === 0;
      const label = isToday 
        ? `TODAY ${date.getDate()} ${monthNames[date.getMonth()]}`
        : `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
      
      dates.push({ date, label, isToday });
    }
    
    return dates;
  };

  const dates = getDates();

  // Available time slots
  const timeSlots = [
    "11:00 am",
    "12:00 pm",
    "2:30 pm",
    "3:00 pm",
    "4:00 pm",
    "4:30 pm",
    "5:00 pm",
    "5:30 pm",
    "6:00 pm",
  ];

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
    }
  }, [isOpen]);

  if (!isOpen || !selectedContact) return null;

  const handleSchedule = (): void => {
    if (selectedTime && selectedTopics.length > 0) {
      // Combine date and time
      const [time, period] = selectedTime.split(" ");
      const [hours, minutes] = time.split(":").map(Number);
      let hour24 = hours;
      if (period === "pm" && hours !== 12) hour24 += 12;
      if (period === "am" && hours === 12) hour24 = 0;

      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(hour24, minutes, 0, 0);

      onSchedule(scheduledDateTime, selectedTime, selectedTopics);
      onClose();
    }
  };

  // Format date for display
  const formatSelectedDate = (): string => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    const isToday = selectedDateOnly.getTime() === today.getTime();
    
    if (isToday) {
      return "Today";
    }
    return `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}`;
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
      {/* Bottom Sheet Modal */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          background: "#FFFFFF",
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
          zIndex: 9999,
          padding: "1.5rem",
          paddingBottom: "2rem",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
          animation: "slideUpFromBottom 0.3s ease-out",
          maxHeight: "90%",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "1rem",
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

        {/* Profile Picture with Phone Icon */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              overflow: "hidden",
              marginBottom: "1rem",
            }}
          >
            <img
              src={selectedContact.avatar || config.defaults.avatar}
              alt={selectedContact.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {/* Green Phone Icon Overlay */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "3px solid #FFFFFF",
              }}
            >
              <Phone size={14} color="#FFFFFF" />
            </div>
          </div>

          {/* Title */}
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 600,
              color: "#111827",
              textAlign: "center",
              marginBottom: "0.5rem",
            }}
          >
            Schedule a{" "}
            <span style={{ color: "#10b981" }}>call</span> with{" "}
            {selectedContact.name}
          </h2>

          {/* Description */}
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Get 1-on-1 help with your diet and ask questions.
          </p>
        </div>

        {/* Date Selection */}
        <div
          style={{
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              overflowX: "auto",
              paddingBottom: "0.5rem",
              scrollbarWidth: "none",
            }}
            onWheel={(e) => {
              e.currentTarget.scrollLeft += e.deltaY;
            }}
          >
            {dates.map((dateItem, index) => {
              const isSelected =
                dateItem.date.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(dateItem.date)}
                  style={{
                    padding: "0.75rem 1rem",
                    border: "none",
                    borderRadius: "8px",
                    backgroundColor: isSelected ? "#fef2f2" : "#f9fafb",
                    color: isSelected ? "#dc2626" : "#374151",
                    fontSize: "14px",
                    fontWeight: isSelected ? 600 : 400,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.25rem",
                    minWidth: "fit-content",
                    borderBottom: isSelected ? "2px solid #dc2626" : "2px solid transparent",
                    transition: "all 0.2s",
                  }}
                >
                  <span
                    style={{
                      fontSize: dateItem.isToday && isSelected ? "18px" : "14px",
                      fontWeight: dateItem.isToday && isSelected ? 700 : (isSelected ? 600 : 400),
                    }}
                  >
                    {dateItem.isToday ? dateItem.label.split(" ")[1] : dateItem.label.split(" ")[1]}
                  </span>
                  {!dateItem.isToday && (
                    <span style={{ fontSize: "12px", opacity: 0.7 }}>
                      {dateItem.label.split(" ")[0]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Selection */}
        <div
          style={{
            marginBottom: "1.5rem",
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
                    padding: "0.75rem",
                    border: isSelected ? "2px solid #dc2626" : "1px solid #d1d5db",
                    borderRadius: "8px",
                    backgroundColor: isSelected ? "#fef2f2" : "#ffffff",
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
        {selectedTime && (
          <div
            style={{
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#111827",
                marginBottom: "1rem",
              }}
            >
              SELECT TOPIC
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
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
                      padding: "0.75rem",
                      border: isSelected ? "2px solid #dc2626" : "1px solid #d1d5db",
                      borderRadius: "8px",
                      backgroundColor: isSelected ? "#fef2f2" : "#ffffff",
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
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer - Summary and Schedule Button */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
            paddingTop: "1rem",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <div style={{ flex: 1 }}>
            {selectedTime ? (
              <>
                <div
                  style={{
                    fontSize: "14px",
                    color: "#111827",
                    fontWeight: 500,
                    marginBottom: "0.25rem",
                  }}
                >
                  {formatSelectedDate()}, {selectedDate.getDate()} {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][selectedDate.getMonth()]} • {selectedTime}
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
            disabled={!selectedTime || selectedTopics.length === 0}
            style={{
              padding: "0.75rem 2rem",
              border: "none",
              borderRadius: "8px",
              backgroundColor: selectedTime && selectedTopics.length > 0 ? "#dc2626" : "#f3f4f6",
              color: selectedTime && selectedTopics.length > 0 ? "#ffffff" : "#9ca3af",
              fontSize: "16px",
              fontWeight: 600,
              cursor: selectedTime && selectedTopics.length > 0 ? "pointer" : "not-allowed",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              if (selectedTime && selectedTopics.length > 0) {
                e.currentTarget.style.backgroundColor = "#b91c1c";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTime && selectedTopics.length > 0) {
                e.currentTarget.style.backgroundColor = "#dc2626";
              }
            }}
          >
            Schedule
          </button>
        </div>
      </div>

      <style>{`
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

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

