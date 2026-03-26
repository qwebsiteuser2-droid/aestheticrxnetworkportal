import React from 'react';

interface MotivationalMessageProps {
  tierProgress: number;
  nextTier: string | null;
  remainingAmount: number;
  isAdmin: boolean;
  currentTierConfig?: {
    progress_message_25?: string;
    progress_message_50?: string;
    progress_message_75?: string;
    progress_message_90?: string;
    max_tier_message?: string;
    achievement_message?: string;
  };
}

export const MotivationalMessage: React.FC<MotivationalMessageProps> = ({
  tierProgress,
  nextTier,
  remainingAmount,
  isAdmin,
  currentTierConfig
}) => {
  const getMotivationalMessage = () => {
    // Use tier-specific messages if available, otherwise fall back to defaults
    if (!nextTier) {
      const message = currentTierConfig?.achievement_message || currentTierConfig?.max_tier_message || "🎉 Congratulations! You've achieved your current tier!";
      return {
        message,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200"
      };
    }

    if (tierProgress >= 90) {
      const message = currentTierConfig?.progress_message_90 || "🔥 So close! Just a few more orders to reach the next tier!";
      return {
        message,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200"
      };
    }

    if (tierProgress >= 75) {
      const message = currentTierConfig?.progress_message_75 || "💪 You're making great progress! Keep it up!";
      return {
        message,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200"
      };
    }

    if (tierProgress >= 50) {
      const message = currentTierConfig?.progress_message_50 || "🚀 Halfway there! Your dedication is paying off!";
      return {
        message,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200"
      };
    }

    if (tierProgress >= 25) {
      const message = currentTierConfig?.progress_message_25 || "⭐ Great start! Every order brings you closer to the next tier!";
      return {
        message,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200"
      };
    }

    return {
      message: "🌟 Begin your journey to the next tier with your first order!",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200"
    };
  };

  const motivational = getMotivationalMessage();

  return (
    <div className={`rounded-lg border-2 ${motivational.borderColor} ${motivational.bgColor} p-4 mb-4`}>
      <div className="text-center">
        <p className={`text-sm font-medium ${motivational.color}`}>
          {motivational.message}
        </p>
        {nextTier && (
          <p className="text-xs text-gray-500 mt-1">
            {isAdmin ? (
              `Need ${remainingAmount.toLocaleString()} PKR more to reach ${nextTier}`
            ) : (
              `Keep ordering to reach ${nextTier}!`
            )}
          </p>
        )}
      </div>
    </div>
  );
};
