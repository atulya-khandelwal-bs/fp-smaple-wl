import React, { useState } from "react";
import config from "../../common/config.ts";
import { Contact, Product } from "../../common/types/chat";
import axios from "axios";

interface FPUserDetailsProps {
  selectedContact: Contact | null;
  userId: string;
  peerId: string;
  onSend: (message: string | object) => void;
  addLog?: (log: string | { log: string; timestamp: Date }) => void;
}

export default function FPUserDetails({
  selectedContact,
  userId,
  peerId,
  onSend,
  addLog,
}: FPUserDetailsProps): React.JSX.Element {
  const [productCount, setProductCount] = useState<number>(3); // Default to 3 products

  // All available products for suggestions
  const allProducts: Product[] = [
    {
      id: "1",
      title: "What's Up Wellness Sleep Gummies",
      description:
        "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
      actual_amount: 700,
      selling_amount: 560,
      image_url:
        "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_1000.jpg",
      action_id: "90909",
      rediection_url: "https://google.com",
      cta_details: {
        text: "",
        text_color: "",
        bg_color: "",
      },
    },
    {
      id: "2",
      title: "Hello Healthy Coffee (South Indian)",
      description:
        "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
      actual_amount: 579,
      selling_amount: 350,
      image_url:
        "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_2000.jpg",
      action_id: "90910",
      rediection_url: "https://google.com",
      cta_details: {
        text: "",
        text_color: "",
        bg_color: "",
      },
    },
    {
      id: "3",
      title: "Max Protein Bar",
      description:
        "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
      actual_amount: 450,
      selling_amount: 350,
      image_url:
        "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_3000.jpg",
      action_id: "90911",
      rediection_url: "",
      cta_details: {
        text: "",
        text_color: "",
        bg_color: "",
      },
    },
    {
      id: "4",
      title: "Kikibix 100% Whole Grain Cookies",
      description:
        "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
      actual_amount: 650,
      selling_amount: 475,
      image_url:
        "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_4000.jpg",
      action_id: "90912",
      rediection_url: "",
      cta_details: {
        text: "",
        text_color: "",
        bg_color: "",
      },
    },
    {
      id: "5",
      title: "Ginger Honey Tonic",
      description:
        "Formulated with Chamomile, Melatonin, L-Theanine, Tart Cherry, and Vitamin D2 to promote calmness and ensure sound, restful sleep. These sleep gummies work better than any other sleeping pills/sleeping tablets.",
      actual_amount: 800,
      selling_amount: 650,
      image_url:
        "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/demo/product_5000.jpg",
      action_id: "90913",
      rediection_url: "",
      cta_details: {
        text: "",
        text_color: "",
        bg_color: "",
      },
    },
  ];

  // Randomly select products based on selected count
  const getRandomProducts = (): Product[] => {
    const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, productCount);
  };

  // Handle Meal Plan Update API call
  const handleMealPlanUpdate = async (): Promise<void> => {
    if (!peerId || !userId) {
      console.error("Missing peerId or userId");
      return;
    }

    try {
      const payload = {
        action_type: "meal_plan_update",
        title: "Meal Plan Updated",
        description: "",
        icons_details: {
          left_icon: "",
          right_icon: "",
        },
        redirection_details: [
          {
            cta_details: {},
            redirect_url: "meal_plan_details",
            action_id: "4",
          },
        ],
      };

      const body = {
        from: userId,
        to: peerId,
        type: "meal_plan_update",
        data: payload,
      };

      try {
        const response = await axios.post(config.api.customMessage, body);

        // Axios automatically parses JSON
        console.log("Meal plan update sent successfully:", response.data);

        // Add message directly to logs for real-time display
        if (addLog) {
          const messageToLog = JSON.stringify({
            type: "meal_plan_update",
            ...payload,
          });
          addLog({
            log: `You → ${peerId}: ${messageToLog}`,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error sending meal plan update:", error);
      }
    } catch (error) {
      console.error("Error sending meal plan update:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to send meal plan update: ${errorMessage}`);
    }
  };

  // Handle Change Nutritionist - sends both coach_assigned and coach_details messages
  const handleChangeNutritionist = async (): Promise<void> => {
    if (!peerId || !userId) {
      console.error("Missing peerId or userId");
      return;
    }

    try {
      // First: Send coach_assigned notification
      const coachAssignedPayload = {
        action_type: "coach_assigned",
        title: "New Nutritionist Assigned",
        description: "",
        icons_details: {
          left_icon: "",
          right_icon: "",
        },
        redirection_details: [
          {
            cta_details: {},
            redirect_url: "coach_details",
            action_id: "4",
          },
        ],
      };

      const coachAssignedBody = {
        from: userId,
        to: peerId,
        type: "coach_assigned",
        data: coachAssignedPayload,
      };

      // Second: Send coach_details with actual coach information
      const coachDetailsPayload = {
        action_type: "coach_details",
        title: "Dr. Jnanendra Veer",
        description: "Clinical Dietitian",
        icons_details: {
          left_icon:
            "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/doctors/doctor_333.jpg",
          right_icon: "",
        },
        redirection_details: [
          {
            cta_details: {},
            redirect_url: "coach_details",
            action_id: "4",
          },
        ],
      };

      const coachDetailsBody = {
        from: userId,
        to: peerId,
        type: "coach_details",
        data: coachDetailsPayload,
      };

      try {
        // Send coach_assigned message first
        const coachAssignedResponse = await axios.post(
          config.api.customMessage,
          coachAssignedBody
        );
        console.log(
          "Coach assigned notification sent successfully:",
          coachAssignedResponse.data
        );

        // Add coach_assigned message directly to logs for real-time display
        if (addLog) {
          const firstTimestamp = new Date();
          const messageToLog = JSON.stringify({
            type: "coach_assigned",
            ...coachAssignedPayload, // action_type is already in coachAssignedPayload
          });
          console.log("📝 [1/2] Adding coach_assigned to logs:", messageToLog);
          addLog({
            log: `You → ${peerId}: ${messageToLog}`,
            timestamp: firstTimestamp,
          });
          // Force React to process this state update before adding the next one
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Add a delay to ensure messages are processed separately
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Then send coach_details message
        const coachDetailsResponse = await axios.post(
          config.api.customMessage,
          coachDetailsBody
        );
        console.log(
          "✅ Coach details sent successfully:",
          coachDetailsResponse.data
        );

        // Add coach_details message directly to logs for real-time display
        if (addLog) {
          // Use a definitely later timestamp (at least 1 second later) to ensure unique message IDs
          const secondTimestamp = new Date(Date.now() + 1000);
          const messageToLog = JSON.stringify({
            type: "coach_details",
            ...coachDetailsPayload, // action_type is already in coachDetailsPayload
          });
          console.log("📝 [2/2] Adding coach_details to logs:", messageToLog);
          addLog({
            log: `You → ${peerId}: ${messageToLog}`,
            timestamp: secondTimestamp,
          });
          // Force React to process this state update
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error("Error sending nutritionist change:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error sending nutritionist change:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to send nutritionist change: ${errorMessage}`);
    }
  };

  // Handle Send Products Suggestions API call
  const handleSendProducts = async (): Promise<void> => {
    if (!peerId || !userId) {
      console.error("Missing peerId or userId");
      return;
    }

    try {
      const randomProducts = getRandomProducts();

      // Transform products to backend format
      const productList = randomProducts.map((product) => ({
        title: product.title || "",
        description: product.description || "",
        actual_amount: product.actual_amount || 0,
        selling_amount: product.selling_amount || product.actual_amount || 0,
        image_url: product.image_url || "",
        action_id: product.action_id || "",
        rediection_url: product.rediection_url || "", // Can be set if needed
        cta_details: {
          text: product.cta_details?.text || "",
          text_color: product.cta_details?.text_color || "",
          bg_color: product.cta_details?.bg_color || "",
        },
      }));

      // Backend expects: from, to, messageType, payload structure
      const payload = {
        action_type: "recommended_products",
        title: "Recommended products",
        description: "Recommended products",
        product_list: productList,
      };

      const body = {
        from: userId,
        to: peerId,
        type: "recommended_products",
        data: payload,
      };

      try {
        const response = await axios.post(config.api.customMessage, body);
        // Axios automatically parses JSON
        console.log("Products sent successfully:", response.data);

        // Add message directly to logs for real-time display
        if (addLog) {
          const messageToLog = JSON.stringify({
            type: "recommended_products",
            ...payload,
          });
          addLog({
            log: `You → ${peerId}: ${messageToLog}`,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error sending products:", error);
      }
    } catch (error) {
      console.error("Error sending products:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to send products: ${errorMessage}`);
    }
  };

  // Handle General Notification - send as normal text message
  const handleGeneralNotification = async (): Promise<void> => {
    if (!peerId || !userId) {
      console.error("Missing peerId or userId");
      return;
    }

    try {
      // Send message through Agora Chat SDK to display in UI
      // Structure must match what messageFormatters expects: flat structure with 'type' field
      const payload = {
        action_type: "general-notification",
        title:
          "Great news! Your dedicated Nutritionist, Sandeep, has been assigned!",
        description:
          "What would you like to do next? You can either schedule a call or start chatting with right away. He is here to support you on your nutrition journey with FITPASS.",
        redirection_details: [
          {
            cta_details: {
              text: "",
              text_color: "Schedule Call",
              bg_color: "",
            },
            redirect_url: "fitfeast_call_history",
            action_id: "4",
          },
          {
            cta_details: {
              text: "",
              text_color: "Chat",
              bg_color: "",
            },
            redirect_url: "coach_details",
            action_id: "4",
          },
        ],
      };

      const body = {
        from: userId,
        to: peerId,
        type: "general_notification",
        data: payload,
      };

      try {
        const response = await axios.post(config.api.customMessage, body);
        console.log("General notification sent successfully:", response.data);

        // Add message directly to logs for real-time display
        if (addLog) {
          const messageToLog = JSON.stringify({
            type: "general_notification",
            ...payload,
          });
          addLog({
            log: `You → ${peerId}: ${messageToLog}`,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error sending general notification:", error);
      }
    } catch (error) {
      console.error("Error sending general notification:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to send general notification: ${errorMessage}`);
    }
  };

  // Handle Video Call Message
  const handleVideoCall = async (): Promise<void> => {
    if (!peerId || !userId) {
      console.error("Missing peerId or userId");
      return;
    }

    try {
      const payload = {
        title: "Video call",
        description: "24 Min",
        icons_details: {
          left_icon: "",
          right_icon: "",
        },
        call_details: {
          call_url: "",
        },
        redirection_details: [],
      };

      const body = {
        from: userId,
        to: peerId,
        type: "video_call",
        data: payload,
      };

      try {
        const response = await axios.post(config.api.customMessage, body);
        console.log("Video call message sent successfully:", response.data);

        // Add message directly to logs for real-time display
        if (addLog) {
          const messageToLog = JSON.stringify({
            type: "video_call",
            ...payload,
          });
          addLog({
            log: `You → ${peerId}: ${messageToLog}`,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error sending video call message:", error);
      }
    } catch (error) {
      console.error("Error sending video call message:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to send video call message: ${errorMessage}`);
    }
  };

  // Handle Voice Call Message
  const handleVoiceCall = async (): Promise<void> => {
    if (!peerId || !userId) {
      console.error("Missing peerId or userId");
      return;
    }

    try {
      const payload = {
        title: "Voice call",
        description: "24 Min",
        icons_details: {
          left_icon: "",
          right_icon: "",
        },
        call_details: {
          call_url: "",
        },
        redirection_details: [],
      };
      const body = {
        from: userId,
        to: peerId,
        type: "voice_call",
        data: payload,
      };

      try {
        const response = await axios.post(config.api.customMessage, body);
        console.log("Voice call message sent successfully:", response.data);

        // Add message directly to logs for real-time display
        if (addLog) {
          const messageToLog = JSON.stringify({
            type: "voice_call",
            ...payload,
          });
          addLog({
            log: `You → ${peerId}: ${messageToLog}`,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error sending voice call message:", error);
      }
    } catch (error) {
      console.error("Error sending voice call message:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to send voice call message: ${errorMessage}`);
    }
  };

  // Handle Documents Message
  const handleDocuments = async (): Promise<void> => {
    if (!peerId || !userId) {
      console.error("Missing peerId or userId");
      return;
    }

    try {
      const payload = {
        title: "sample-dev-doc.pdf",
        description: "",
        icons_details: {
          left_icon: "",
          right_icon: "",
        },
        documents_details: {
          document_url:
            "https://fpdevelopment19.s3.ap-south-1.amazonaws.com/docs/000bcb52-e515-43db-9307-3978015931b1-sample-dev-doc.pdf",
          document_size: 10200000,
          document_type: "application/pdf",
        },
        redirection_details: [],
      };
      const body = {
        from: userId,
        to: peerId,
        type: "documents",
        data: payload,
      };

      try {
        const response = await axios.post(config.api.customMessage, body);
        console.log("Documents message sent successfully:", response.data);

        // Add message directly to logs for real-time display
        if (addLog) {
          const messageToLog = JSON.stringify({
            type: "documents",
            ...payload,
          });
          addLog({
            log: `You → ${peerId}: ${messageToLog}`,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error sending documents message:", error);
      }
    } catch (error) {
      console.error("Error sending documents message:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      alert(`Failed to send documents message: ${errorMessage}`);
    }
  };

  return (
    <div className="user-details-panel">
      {selectedContact ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.5rem",
          }}
        >
          {/* Products button with count selector */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <button
              onClick={handleSendProducts}
              disabled={!selectedContact}
              title="Send Products Suggestions"
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                background: selectedContact ? "#f3f4f6" : "#f9fafb",
                color: selectedContact ? "#374151" : "#9ca3af",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: selectedContact ? "pointer" : "not-allowed",
                fontSize: "0.875rem",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#e5e7eb";
                  (e.target as HTMLButtonElement).style.borderColor = "#d1d5db";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#f3f4f6";
                  (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb";
                }
              }}
            >
              Send Products Suggestions
            </button>
            {/* Product count selector */}
            <div
              style={{
                display: "flex",
                gap: "0.25rem",
                alignItems: "center",
                background: selectedContact ? "#f9fafb" : "#f3f4f6",
                padding: "0.25rem",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
              }}
            >
              {[2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  onClick={() => setProductCount(count)}
                  disabled={!selectedContact}
                  title={`Select ${count} products`}
                  style={{
                    minWidth: "32px",
                    height: "32px",
                    padding: "0.25rem 0.5rem",
                    background:
                      productCount === count
                        ? selectedContact
                          ? "#2563eb"
                          : "#9ca3af"
                        : "transparent",
                    color:
                      productCount === count
                        ? "white"
                        : selectedContact
                        ? "#374151"
                        : "#9ca3af",
                    border: "none",
                    borderRadius: "4px",
                    cursor: selectedContact ? "pointer" : "not-allowed",
                    fontSize: "0.75rem",
                    fontWeight: productCount === count ? 600 : 400,
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedContact && productCount !== count) {
                      (e.target as HTMLButtonElement).style.background =
                        "#e5e7eb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedContact && productCount !== count) {
                      (e.target as HTMLButtonElement).style.background =
                        "transparent";
                    }
                  }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <button
              onClick={handleMealPlanUpdate}
              disabled={!selectedContact}
              title="Update Meal Plan"
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                background: selectedContact ? "#f3f4f6" : "#f9fafb",
                color: selectedContact ? "#374151" : "#9ca3af",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: selectedContact ? "pointer" : "not-allowed",
                fontSize: "0.875rem",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#e5e7eb";
                  (e.target as HTMLButtonElement).style.borderColor = "#d1d5db";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#f3f4f6";
                  (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb";
                }
              }}
            >
              Update Meal Plan
            </button>
            <button
              onClick={handleChangeNutritionist}
              disabled={!selectedContact}
              title="Change Nutritionist"
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                background: selectedContact ? "#f3f4f6" : "#f9fafb",
                color: selectedContact ? "#374151" : "#9ca3af",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: selectedContact ? "pointer" : "not-allowed",
                fontSize: "0.875rem",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#e5e7eb";
                  (e.target as HTMLButtonElement).style.borderColor = "#d1d5db";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#f3f4f6";
                  (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb";
                }
              }}
            >
              Change Nutritionist
            </button>
          </div>
          <button
            onClick={handleGeneralNotification}
            disabled={!selectedContact}
            title="Send General Notification"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              background: selectedContact ? "#f3f4f6" : "#f9fafb",
              color: selectedContact ? "#374151" : "#9ca3af",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: selectedContact ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (selectedContact) {
                (e.target as HTMLButtonElement).style.background = "#e5e7eb";
                (e.target as HTMLButtonElement).style.borderColor = "#d1d5db";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedContact) {
                (e.target as HTMLButtonElement).style.background = "#f3f4f6";
                (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb";
              }
            }}
          >
            Send General Notification
          </button>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <button
              onClick={handleVideoCall}
              disabled={!selectedContact}
              title="Send Video Call Message"
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                background: selectedContact ? "#f3f4f6" : "#f9fafb",
                color: selectedContact ? "#374151" : "#9ca3af",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: selectedContact ? "pointer" : "not-allowed",
                fontSize: "0.875rem",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#e5e7eb";
                  (e.target as HTMLButtonElement).style.borderColor = "#d1d5db";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#f3f4f6";
                  (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb";
                }
              }}
            >
              Send Video Call
            </button>
            <button
              onClick={handleVoiceCall}
              disabled={!selectedContact}
              title="Send Voice Call Message"
              style={{
                flex: 1,
                padding: "0.5rem 0.75rem",
                background: selectedContact ? "#f3f4f6" : "#f9fafb",
                color: selectedContact ? "#374151" : "#9ca3af",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                cursor: selectedContact ? "pointer" : "not-allowed",
                fontSize: "0.875rem",
                fontWeight: 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#e5e7eb";
                  (e.target as HTMLButtonElement).style.borderColor = "#d1d5db";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedContact) {
                  (e.target as HTMLButtonElement).style.background = "#f3f4f6";
                  (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb";
                }
              }}
            >
              Send Voice Call
            </button>
          </div>
          <button
            onClick={handleDocuments}
            disabled={!selectedContact}
            title="Send Documents Message"
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              background: selectedContact ? "#f3f4f6" : "#f9fafb",
              color: selectedContact ? "#374151" : "#9ca3af",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: selectedContact ? "pointer" : "not-allowed",
              fontSize: "0.875rem",
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (selectedContact) {
                (e.target as HTMLButtonElement).style.background = "#e5e7eb";
                (e.target as HTMLButtonElement).style.borderColor = "#d1d5db";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedContact) {
                (e.target as HTMLButtonElement).style.background = "#f3f4f6";
                (e.target as HTMLButtonElement).style.borderColor = "#e5e7eb";
              }
            }}
          >
            Send Documents
          </button>
        </div>
      ) : (
        <div className="empty-user-details">
          <p>In progress</p>
        </div>
      )}
    </div>
  );
}
