import { Message } from "../../common/types/chat";
import React from "react";
import FPCoachAssignedView from "./messages/FPCoachAssignedView";
import FPCoachDetailsView from "./messages/FPCoachDetailsView";
import FPMealPlanUpdatedView from "./messages/FPMealPlanUpdatedView";
import FPDefaultSystemMessageView from "./messages/FPDefaultSystemMessageView";

interface FPSystemMessageProps {
  msg: Message;
}

export default function FPSystemMessage({
  msg,
}: FPSystemMessageProps): React.JSX.Element {
  // Special handling for new_nutritionist messages
  // Route based on action_type: coach_assigned or coach_details
  if (msg.system?.kind === "new_nutritionist") {
    const actionType = msg.system?.payload?.action_type as string | undefined;

    console.log("🔍 [FPSystemMessage] Routing new_nutritionist message:", {
      actionType,
      payload: msg.system?.payload,
      system: msg.system,
    });

    if (actionType === "coach_assigned") {
      console.log("✅ Using FPCoachAssignedView for coach_assigned");
      return <FPCoachAssignedView msg={msg} />;
    }

    if (actionType === "coach_details") {
      console.log("✅ Using FPCoachDetailsView for coach_details");
      return <FPCoachDetailsView msg={msg} />;
    }

    // Fallback to coach_details if action_type is not specified
    console.log("⚠️ No action_type found, falling back to FPCoachDetailsView");
    return <FPCoachDetailsView msg={msg} />;
  }

  // Special handling for meal_plan_updated with icons
  if (msg.system?.kind === "meal_plan_updated") {
    return <FPMealPlanUpdatedView msg={msg} />;
  }

  // Other system messages
  return <FPDefaultSystemMessageView msg={msg} />;
}
